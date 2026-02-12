import axios, { AxiosResponse } from 'axios';
import dotenv from 'dotenv';
import {
  makeSTXTokenTransfer,
  broadcastTransaction,
  AnchorMode,
  PostConditionMode
} from '@stacks/transactions';
import { STACKS_TESTNET } from '@stacks/network';
import { ResearchReport } from '../shared/types';

dotenv.config();

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000';
const STACKS_PRIVATE_KEY = process.env.STACKS_PRIVATE_KEY;
const network = STACKS_TESTNET;

export class Agent402 {
  private totalCost: number = 0;
  private costBreakdown: { [key: string]: number } = {};
  private budget: number = 0.08; // Maximum budget in STX
  private providerMetrics: any = {
    'arxiv': { totalCalls: 0, successRate: 95, avgQuality: 95, avgLatency: 2100, reliability: 98 },
    'semantic': { totalCalls: 0, successRate: 91, avgQuality: 85, avgLatency: 1850, reliability: 95 },
    'scholar': { totalCalls: 0, successRate: 83, avgQuality: 70, avgLatency: 1200, reliability: 88 }
  };

  async research(topic: string): Promise<ResearchReport> {
    console.log(`\n🔍 Agent402 Research: "${topic}"`);
    console.log(`💰 Budget: ${this.budget} STX`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);

    // Reset cost tracking
    this.totalCost = 0;
    this.costBreakdown = {};

    try {
      // Step 1: Multi-Provider Bidding for Research
      console.log(`\n📊 Step 1: Multi-Provider Research Bidding`);
      const searchResults = await this.selectResearchProvider(topic);

      // Step 2: Choose between summarize (0.015) or analyze (0.008)
      console.log(`\n🤔 Decision: Choose summarization service`);
      console.log(`   Option A: /api/summarize (0.015 STX) - Full summary`);
      console.log(`   Option B: /api/analyze (0.008 STX) - Quick analysis`);
      
      let summaryResponse;
      const remainingBudget = this.budget - this.totalCost;
      
      if (remainingBudget >= 0.015 && searchResults.results.length > 3) {
        console.log(`   ✅ Selected: Full summary (better quality, budget allows)`);
        const summaryText = searchResults.results
          .map((r: any) => `${r.title}: ${r.snippet}`)
          .join(' ');
        
        summaryResponse = await this.makeRequest(
          `${API_BASE_URL}/api/summarize`,
          'POST',
          { text: summaryText },
          0.015,
          'summarize'
        );
      } else {
        console.log(`   ✅ Selected: Quick analysis (cheaper, budget conscious)`);
        const summaryText = searchResults.results
          .map((r: any) => r.snippet)
          .join(' ');
        
        summaryResponse = await this.makeRequest(
          `${API_BASE_URL}/api/analyze`,
          'POST',
          { text: summaryText },
          0.008,
          'analyze'
        );
      }

      // Step 3: Citations (optional, cost-aware)
      let citations = [];
      const citationCost = 0.02;
      if (this.totalCost + citationCost <= this.budget) {
        console.log(`\n💡 Decision: Fetching citations (${citationCost} STX, within budget)`);
        const citationsResponse = await this.makeRequest(
          `${API_BASE_URL}/api/citations`,
          'POST',
          { topic },
          citationCost,
          'citations'
        );
        citations = citationsResponse.citations;
      } else {
        console.log(`\n⚠️  Decision: Skipping citations (would exceed budget: ${this.totalCost + citationCost} > ${this.budget})`);
      }

      // Step 4: Premium content (optional, only if budget allows)
      let premiumContent = null;
      const premiumCost = 0.03;
      if (this.totalCost + premiumCost <= this.budget) {
        console.log(`\n💡 Decision: Fetching premium content (${premiumCost} STX, within budget)`);
        premiumContent = await this.makeRequest(
          `${API_BASE_URL}/api/premium`,
          'POST',
          { contentId: 'premium-001' },
          premiumCost,
          'premium'
        );
      } else {
        console.log(`\n⚠️  Decision: Skipping premium content (would exceed budget: ${this.totalCost + premiumCost} > ${this.budget})`);
      }

      // Assemble report
      const report: ResearchReport = {
        topic,
        summary: summaryResponse.summary || summaryResponse.sentiment,
        sources: searchResults.results,
        citations,
        costBreakdown: this.costBreakdown,
        totalCost: this.totalCost,
        timestamp: new Date().toISOString(),
      };

      console.log(`\n✅ Research complete! Total cost: ${this.totalCost} STX`);
      return report;
    } catch (error: any) {
      console.error(`\n❌ Research failed:`, error.message);
      throw error;
    }
  }

  private async makeRequest(
    url: string,
    method: string,
    body: any,
    expectedCost: number,
    step: string
  ): Promise<any> {
    console.log(`\n[${step.toUpperCase()}] ${method} ${url}`);

    try {
      // First attempt (will likely return 402)
      const response = await axios({
        method,
        url,
        data: body,
        validateStatus: () => true, // Don't throw on any status
      });

      if (response.status === 200) {
        console.log(`✅ 200 OK (using cached access window)`);
        return response.data;
      }

      if (response.status === 402) {
        console.log(`💰 402 Payment Required`);
        return await this.handlePaymentRequired(response, url, method, body, expectedCost, step);
      }

      throw new Error(`Unexpected status: ${response.status}`);
    } catch (error: any) {
      if (error.response?.status === 402) {
        return await this.handlePaymentRequired(error.response, url, method, body, expectedCost, step);
      }
      throw error;
    }
  }

  private async handlePaymentRequired(
    response: AxiosResponse,
    url: string,
    method: string,
    body: any,
    expectedCost: number,
    step: string
  ): Promise<any> {
    const headers = response.headers as any;
    const amount = parseFloat(headers['x-payment-amount']);
    const address = headers['x-payment-address'];
    const memo = headers['x-payment-memo'];

    console.log(`   Amount: ${amount} STX`);
    console.log(`   Address: ${address}`);
    console.log(`   Memo: ${memo}`);

    // Submit payment
    const txId = await this.submitPayment(amount, address, memo);
    
    // Track cost
    this.totalCost += amount;
    this.costBreakdown[step] = amount;

    // Retry request with payment proof
    console.log(`\n🔄 Retrying with payment proof...`);
    const retryResponse = await axios({
      method,
      url,
      data: body,
      headers: {
        'X-Payment-Proof': txId,
      },
    });

    console.log(`✅ 200 OK (cost: ${amount} STX)`);
    return retryResponse.data;
  }

  private async submitPayment(amount: number, address: string, memo: string): Promise<string> {
    if (!STACKS_PRIVATE_KEY) {
      throw new Error('STACKS_PRIVATE_KEY not set in .env');
    }

    console.log(`\n💸 Submitting payment to Stacks testnet...`);

    try {
      // Convert STX to microSTX
      const amountMicroSTX = BigInt(Math.floor(amount * 1_000_000));

      const txOptions = {
        recipient: address,
        amount: amountMicroSTX,
        senderKey: STACKS_PRIVATE_KEY,
        network,
        memo,
        anchorMode: AnchorMode.Any,
        fee: BigInt(200), // Explicit fee in microSTX
        postConditionMode: PostConditionMode.Allow,
      };

      const transaction = await makeSTXTokenTransfer(txOptions);
      const broadcastResponse = await broadcastTransaction({transaction, network});

      if ('error' in broadcastResponse) {
        throw new Error(`Broadcast failed: ${broadcastResponse.error}`);
      }

      const txId = broadcastResponse.txid;
      console.log(`✅ Transaction broadcast: ${txId}`);
      console.log(`🔗 https://explorer.hiro.so/txid/${txId}?chain=testnet`);

      // Wait for confirmation (simplified - just wait a bit)
      console.log(`⏳ Waiting for confirmation...`);
      await this.waitForConfirmation(txId);

      return txId;
    } catch (error: any) {
      console.error(`❌ Payment failed:`, error.message);
      throw error;
    }
  }

  private async selectResearchProvider(topic: string): Promise<any> {
    console.log(`\n📢 Broadcasting research request to 3 providers...`);
    console.log(`   Topic: "${topic}"`);
    console.log(`   Max Budget: ${this.budget} STX\n`);

    const providers = [
      { name: 'arxiv', endpoint: '/api/research/arxiv', price: 0.015, quality: 95 },
      { name: 'semantic', endpoint: '/api/research/semantic', price: 0.012, quality: 85 },
      { name: 'scholar', endpoint: '/api/research/scholar', price: 0.008, quality: 70 }
    ];

    // Display bids with historical data
    console.log(`💰 Bids Received + Historical Performance:\n`);
    
    const scoredProviders = providers.map(provider => {
      const metrics = this.providerMetrics[provider.name];
      const priceScore = ((this.budget - provider.price) / this.budget) * 100;
      const qualityScore = provider.quality;
      const reliabilityScore = metrics.reliability;
      const trustScore = metrics.successRate;
      
      const finalScore = (
        qualityScore * 0.35 +
        priceScore * 0.25 +
        reliabilityScore * 0.20 +
        trustScore * 0.20
      );

      console.log(`   [${provider.name.toUpperCase()}]`);
      console.log(`   ├─ Price: ${provider.price.toFixed(3)} STX`);
      console.log(`   ├─ Quality: ${provider.quality}/100`);
      console.log(`   ├─ Historical Success: ${metrics.successRate}%`);
      console.log(`   ├─ Reliability: ${metrics.reliability}%`);
      console.log(`   └─ Final Score: ${finalScore.toFixed(1)}\n`);

      return { ...provider, finalScore, metrics };
    });

    // Select winner
    const winner = scoredProviders.sort((a, b) => b.finalScore - a.finalScore)[0];
    
    console.log(`✅ Selected: ${winner.name.toUpperCase()}`);
    console.log(`   Reason: Best overall score (${winner.finalScore.toFixed(1)})`);
    console.log(`   Quality: ${winner.quality}/100 | Price: ${winner.price} STX`);
    if (winner.price < 0.015) {
      console.log(`   Savings: ${(0.015 - winner.price).toFixed(3)} STX vs highest bid\n`);
    }

    // Make request to winning provider
    const results = await this.makeRequest(
      `${API_BASE_URL}${winner.endpoint}?q=${encodeURIComponent(topic)}`,
      'POST',
      null,
      winner.price,
      `research-${winner.name}`
    );

    // Update metrics
    this.providerMetrics[winner.name].totalCalls++;

    return results;
  }

  private async waitForConfirmation(txId: string, maxAttempts: number = 30): Promise<void> {
    for (let i = 0; i < maxAttempts; i++) {
      try {
        const response = await axios.get(
          `https://api.testnet.hiro.so/extended/v1/tx/${txId}`
        );

        if (response.data.tx_status === 'success') {
          console.log(`✅ Transaction confirmed!`);
          return;
        }

        if (response.data.tx_status === 'abort_by_response' || response.data.tx_status === 'abort_by_post_condition') {
          throw new Error(`Transaction failed: ${response.data.tx_status}`);
        }

        // Still pending, wait and retry
        await new Promise(resolve => setTimeout(resolve, 2000));
      } catch (error: any) {
        if (error.response?.status === 404) {
          // Transaction not yet in mempool, wait
          await new Promise(resolve => setTimeout(resolve, 2000));
        } else {
          throw error;
        }
      }
    }

    throw new Error('Transaction confirmation timeout');
  }
}

// CLI interface
async function main() {
  const topic = process.argv[2] || 'HTTP 402 protocol';
  
  const agent = new Agent402();
  const report = await agent.research(topic);

  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`📋 Research Report`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
  console.log(`Topic: ${report.topic}`);
  console.log(`Sources: ${report.sources.length}`);
  console.log(`Citations: ${report.citations.length}`);
  console.log(`\nSummary:\n${report.summary}`);
  console.log(`\n💰 Cost Breakdown:`);
  console.log(`  Search:     ${report.costBreakdown.search.toFixed(3)} STX`);
  console.log(`  Summarize:  ${report.costBreakdown.summarize.toFixed(3)} STX`);
  console.log(`  Citations:  ${report.costBreakdown.citations.toFixed(3)} STX`);
  console.log(`  ─────────────────────`);
  console.log(`  Total:      ${report.totalCost.toFixed(3)} STX`);
  console.log(`\n⏱️  Completed at: ${report.timestamp}`);
  console.log(`🌐 Network: Stacks Testnet`);
}

if (require.main === module) {
  main().catch(console.error);
}

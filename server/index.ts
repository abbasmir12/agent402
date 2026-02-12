import express, { Request, Response, NextFunction } from 'express';
import dotenv from 'dotenv';
import crypto from 'crypto';
import axios from 'axios';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use('/dashboard', express.static('dashboard'));

// Stacks testnet API endpoint
const TESTNET_API = 'https://api.testnet.hiro.so';

// Payment address (use from env or generate placeholder)
// NOTE: This should be DIFFERENT from the client wallet address
const PAYMENT_ADDRESS = process.env.SERVER_PAYMENT_ADDRESS || 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM';

// In-memory storage for access windows
interface AccessWindow {
  txId: string;
  expiresAt: number;
  endpoint: string;
  amount: number;
}

const accessWindows = new Map<string, AccessWindow>();

// Dashboard data
const dashboardData = {
  agents: [] as any[],
  activities: [] as any[],
  lastUpdate: Date.now()
};

function addActivity(endpoint: string, amount: number, txId: string, status: string) {
  dashboardData.activities.unshift({
    id: Date.now(),
    timestamp: new Date(),
    endpoint,
    recipient: PAYMENT_ADDRESS,
    amount,
    status,
    txId
  });
  if (dashboardData.activities.length > 50) {
    dashboardData.activities = dashboardData.activities.slice(0, 50);
  }
  dashboardData.lastUpdate = Date.now();
}

// Verify payment on Stacks testnet
async function verifyPayment(txId: string, expectedAmount: number, expectedMemo?: string): Promise<boolean> {
  try {
    const response = await axios.get(`${TESTNET_API}/extended/v1/tx/${txId}`);
    const tx = response.data;
    
    // Check transaction status
    if (tx.tx_status !== 'success') {
      console.log(`❌ Transaction ${txId} not confirmed (status: ${tx.tx_status})`);
      return false;
    }

    // Check transaction type (must be STX transfer)
    if (tx.tx_type !== 'token_transfer') {
      console.log(`❌ Transaction ${txId} is not a token transfer`);
      return false;
    }
    
    // Verify recipient
    if (tx.token_transfer?.recipient_address !== PAYMENT_ADDRESS) {
      console.log(`❌ Wrong recipient: ${tx.token_transfer?.recipient_address}`);
      return false;
    }

    // Verify amount (convert from microSTX)
    const amountSTX = parseInt(tx.token_transfer?.amount || '0') / 1_000_000;
    if (amountSTX < expectedAmount) {
      console.log(`❌ Insufficient amount: ${amountSTX} STX (expected ${expectedAmount})`);
      return false;
    }

    // Verify memo if provided
    if (expectedMemo && tx.token_transfer?.memo) {
      const memoHex = tx.token_transfer.memo.replace('0x', '');
      const memo = Buffer.from(memoHex, 'hex').toString('utf8').replace(/\0/g, '');
      if (!memo.includes(expectedMemo)) {
        console.log(`❌ Memo mismatch: ${memo} (expected ${expectedMemo})`);
        return false;
      }
    }

    console.log(`✅ Payment verified: ${amountSTX} STX from tx ${txId}`);
    return true;
  } catch (error: any) {
    if (error.response?.status === 404) {
      console.error(`❌ Transaction not found: ${txId}`);
    } else {
      console.error(`❌ Error verifying payment:`, error?.message || error);
    }
    return false;
  }
}

// Middleware to check for payment proof or return 402
function requirePayment(endpoint: string, price: number) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const paymentProof = req.headers['x-payment-proof'] as string;

    if (paymentProof) {
      // Check if payment proof is valid and not expired
      const access = accessWindows.get(paymentProof);
      
      if (access && access.expiresAt > Date.now() && access.endpoint === endpoint) {
        console.log(`✅ Valid payment proof for ${endpoint} (${access.amount} STX)`);
        return next();
      }

      // If not in cache, verify on blockchain
      const isValid = await verifyPayment(paymentProof, price);
      if (isValid) {
        // Grant 5-minute access window
        const expiresAt = Date.now() + 5 * 60 * 1000;
        accessWindows.set(paymentProof, {
          txId: paymentProof,
          endpoint,
          expiresAt,
          amount: price
        });
        addActivity(endpoint, price, paymentProof, 'confirmed');
        console.log(`✅ Blockchain verification successful, access granted`);
        return next();
      }
    }

    // No valid payment - return 402
    const memo = `req_${crypto.randomBytes(6).toString('hex')}`;
    
    res.status(402).set({
      'X-Payment-Required': 'true',
      'X-Payment-Amount': price.toString(),
      'X-Payment-Address': PAYMENT_ADDRESS,
      'X-Payment-Memo': memo,
    }).json({
      error: 'Payment Required',
      message: `This endpoint requires ${price} STX`,
      paymentDetails: {
        amount: price,
        address: PAYMENT_ADDRESS,
        memo,
        network: 'testnet',
        explorerUrl: `https://explorer.hiro.so/address/${PAYMENT_ADDRESS}?chain=testnet`
      }
    });
  };
}

// Endpoint 1: Search - 0.01 STX (deprecated - use providers below)
app.post('/api/search', requirePayment('/api/search', 0.01), (req: Request, res: Response) => {
  const query = req.query.q as string;
  
  // Mock research results
  const results = [
    {
      title: `Understanding ${query}: A Comprehensive Review`,
      url: `https://arxiv.org/abs/2024.${Math.floor(Math.random() * 10000)}`,
      snippet: `Recent advances in ${query} have shown promising results in various applications...`
    },
    {
      title: `${query} in Modern Systems: State of the Art`,
      url: `https://scholar.google.com/paper/${Math.random().toString(36).substring(7)}`,
      snippet: `This paper presents a systematic study of ${query} methodologies and their practical implications...`
    },
    {
      title: `Practical Applications of ${query}`,
      url: `https://dl.acm.org/doi/10.1145/${Math.floor(Math.random() * 100000)}`,
      snippet: `We demonstrate novel approaches to ${query} with real-world case studies...`
    },
    {
      title: `${query}: Challenges and Opportunities`,
      url: `https://ieeexplore.ieee.org/document/${Math.floor(Math.random() * 1000000)}`,
      snippet: `Despite progress, ${query} faces several open challenges that require further research...`
    },
    {
      title: `A Survey on ${query} Techniques`,
      url: `https://www.nature.com/articles/s${Math.floor(Math.random() * 100000)}`,
      snippet: `This survey reviews the latest developments in ${query} and identifies future directions...`
    }
  ];

  res.json({
    query,
    results,
    count: results.length,
    cost: 0.01,
    accessWindow: '5 minutes'
  });
});

// Research Provider 1: arXiv (Premium - Peer-reviewed papers) - 0.015 STX
app.post('/api/research/arxiv', requirePayment('/api/research/arxiv', 0.015), (req: Request, res: Response) => {
  const query = req.query.q as string;
  
  const results = [
    {
      title: `${query}: A Rigorous Mathematical Framework`,
      url: `https://arxiv.org/abs/2024.${Math.floor(Math.random() * 10000)}`,
      snippet: `We present a comprehensive mathematical framework for ${query} with formal proofs and theoretical guarantees...`,
      citations: 127,
      year: 2024,
      peerReviewed: true
    },
    {
      title: `Advances in ${query} Theory and Practice`,
      url: `https://arxiv.org/abs/2023.${Math.floor(Math.random() * 10000)}`,
      snippet: `This work establishes new theoretical bounds for ${query} and demonstrates their practical implications...`,
      citations: 89,
      year: 2023,
      peerReviewed: true
    },
    {
      title: `${query}: From Theory to Implementation`,
      url: `https://arxiv.org/abs/2024.${Math.floor(Math.random() * 10000)}`,
      snippet: `We bridge the gap between theoretical ${query} research and real-world deployments...`,
      citations: 56,
      year: 2024,
      peerReviewed: true
    },
    {
      title: `Scalable ${query} for Large-Scale Systems`,
      url: `https://arxiv.org/abs/2023.${Math.floor(Math.random() * 10000)}`,
      snippet: `Novel algorithms for ${query} that scale to millions of concurrent operations...`,
      citations: 43,
      year: 2023,
      peerReviewed: true
    },
    {
      title: `${query}: A Survey of Recent Developments`,
      url: `https://arxiv.org/abs/2024.${Math.floor(Math.random() * 10000)}`,
      snippet: `Comprehensive survey covering the latest advances in ${query} research from 2020-2024...`,
      citations: 201,
      year: 2024,
      peerReviewed: true
    }
  ];

  res.json({
    provider: 'arxiv',
    query,
    results,
    count: results.length,
    quality: 95,
    avgCitations: 103,
    peerReviewed: true,
    cost: 0.015
  });
});

// Research Provider 2: Semantic Scholar (Standard - Curated) - 0.012 STX
app.post('/api/research/semantic', requirePayment('/api/research/semantic', 0.012), (req: Request, res: Response) => {
  const query = req.query.q as string;
  
  const results = [
    {
      title: `${query} in Modern Applications`,
      url: `https://semanticscholar.org/paper/${Math.random().toString(36).substring(7)}`,
      snippet: `Practical applications of ${query} across industry and academia...`,
      citations: 78,
      year: 2024,
      venue: 'ACM Conference'
    },
    {
      title: `Understanding ${query}: Best Practices`,
      url: `https://semanticscholar.org/paper/${Math.random().toString(36).substring(7)}`,
      snippet: `Industry best practices and lessons learned from deploying ${query}...`,
      citations: 62,
      year: 2023,
      venue: 'IEEE Symposium'
    },
    {
      title: `${query} Performance Optimization`,
      url: `https://semanticscholar.org/paper/${Math.random().toString(36).substring(7)}`,
      snippet: `Techniques for optimizing ${query} in production environments...`,
      citations: 45,
      year: 2024,
      venue: 'USENIX'
    },
    {
      title: `Case Studies in ${query} Deployment`,
      url: `https://semanticscholar.org/paper/${Math.random().toString(36).substring(7)}`,
      snippet: `Real-world case studies from companies implementing ${query}...`,
      citations: 34,
      year: 2023,
      venue: 'Industry Track'
    },
    {
      title: `${query}: Security and Privacy Considerations`,
      url: `https://semanticscholar.org/paper/${Math.random().toString(36).substring(7)}`,
      snippet: `Analysis of security implications and privacy concerns in ${query} systems...`,
      citations: 91,
      year: 2024,
      venue: 'Security Conference'
    },
    {
      title: `Comparative Analysis of ${query} Approaches`,
      url: `https://semanticscholar.org/paper/${Math.random().toString(36).substring(7)}`,
      snippet: `Systematic comparison of different ${query} methodologies...`,
      citations: 56,
      year: 2023,
      venue: 'Journal Article'
    },
    {
      title: `${query} for Distributed Systems`,
      url: `https://semanticscholar.org/paper/${Math.random().toString(36).substring(7)}`,
      snippet: `Adapting ${query} principles for distributed and decentralized architectures...`,
      citations: 38,
      year: 2024,
      venue: 'Distributed Systems'
    },
    {
      title: `Machine Learning Approaches to ${query}`,
      url: `https://semanticscholar.org/paper/${Math.random().toString(36).substring(7)}`,
      snippet: `Leveraging ML techniques to enhance ${query} performance...`,
      citations: 72,
      year: 2024,
      venue: 'ML Conference'
    }
  ];

  res.json({
    provider: 'semantic-scholar',
    query,
    results,
    count: results.length,
    quality: 85,
    avgCitations: 59,
    curated: true,
    cost: 0.012
  });
});

// Research Provider 3: Scholar Scraper (Budget - General) - 0.008 STX
app.post('/api/research/scholar', requirePayment('/api/research/scholar', 0.008), (req: Request, res: Response) => {
  const query = req.query.q as string;
  
  const results = [
    {
      title: `Introduction to ${query}`,
      url: `https://scholar.google.com/paper/${Math.random().toString(36).substring(7)}`,
      snippet: `Basic overview of ${query} concepts and terminology...`,
      citations: 23,
      year: 2023
    },
    {
      title: `${query} Tutorial`,
      url: `https://medium.com/@author/${Math.random().toString(36).substring(7)}`,
      snippet: `Step-by-step guide to getting started with ${query}...`,
      citations: 12,
      year: 2024
    },
    {
      title: `${query} Documentation`,
      url: `https://docs.example.com/${query}`,
      snippet: `Official documentation and API reference for ${query}...`,
      citations: 8,
      year: 2024
    },
    {
      title: `Blog: My Experience with ${query}`,
      url: `https://blog.example.com/${Math.random().toString(36).substring(7)}`,
      snippet: `Personal experiences and tips for working with ${query}...`,
      citations: 5,
      year: 2023
    },
    {
      title: `${query} Community Discussion`,
      url: `https://stackoverflow.com/questions/${Math.floor(Math.random() * 1000000)}`,
      snippet: `Community Q&A about common ${query} challenges...`,
      citations: 3,
      year: 2024
    },
    {
      title: `${query} GitHub Repository`,
      url: `https://github.com/example/${query}`,
      snippet: `Open source implementation of ${query} with examples...`,
      citations: 15,
      year: 2023
    },
    {
      title: `${query} News and Updates`,
      url: `https://news.example.com/${query}`,
      snippet: `Latest news and developments in the ${query} ecosystem...`,
      citations: 7,
      year: 2024
    },
    {
      title: `${query} Comparison Guide`,
      url: `https://compare.example.com/${query}`,
      snippet: `Comparing different ${query} tools and frameworks...`,
      citations: 11,
      year: 2023
    },
    {
      title: `${query} Best Practices`,
      url: `https://bestpractices.dev/${query}`,
      snippet: `Community-driven best practices for ${query}...`,
      citations: 9,
      year: 2024
    },
    {
      title: `${query} Video Tutorial`,
      url: `https://youtube.com/watch?v=${Math.random().toString(36).substring(7)}`,
      snippet: `Video walkthrough of ${query} fundamentals...`,
      citations: 4,
      year: 2024
    },
    {
      title: `${query} Cheat Sheet`,
      url: `https://cheatsheet.example.com/${query}`,
      snippet: `Quick reference guide for ${query} commands and syntax...`,
      citations: 6,
      year: 2023
    },
    {
      title: `${query} Forum Discussion`,
      url: `https://forum.example.com/topic/${Math.floor(Math.random() * 10000)}`,
      snippet: `Active forum discussion about ${query} implementation...`,
      citations: 2,
      year: 2024
    }
  ];

  res.json({
    provider: 'scholar-scraper',
    query,
    results,
    count: results.length,
    quality: 70,
    avgCitations: 8,
    general: true,
    cost: 0.008
  });
});

// Endpoint 2: Summarize - 0.015 STX
app.post('/api/summarize', requirePayment('/api/summarize', 0.015), (req: Request, res: Response) => {
  const { text } = req.body;

  if (!text) {
    return res.status(400).json({ error: 'Text is required' });
  }

  // Mock summarization
  const words = text.split(' ').length;
  const summary = `This ${words}-word text discusses key concepts and findings. The main contributions include: (1) a novel framework, (2) experimental validation, and (3) practical implications for future work. The results demonstrate significant improvements over baseline approaches.`;

  res.json({
    summary,
    originalLength: words,
    summaryLength: summary.split(' ').length,
    cost: 0.015
  });
});

// Endpoint 3: Citations - 0.02 STX
app.post('/api/citations', requirePayment('/api/citations', 0.02), (req: Request, res: Response) => {
  const { topic } = req.body;

  if (!topic) {
    return res.status(400).json({ error: 'Topic is required' });
  }

  // Mock citations
  const citations = [
    {
      authors: 'Smith, J., Johnson, A., & Williams, B.',
      title: `Advances in ${topic}: A Systematic Approach`,
      year: 2023,
      venue: `International Conference on ${topic}`,
      doi: `10.1109/IC${topic.substring(0, 3).toUpperCase()}.2023.${Math.floor(Math.random() * 10000)}`
    },
    {
      authors: 'Chen, L., & Kumar, R.',
      title: `${topic} at Scale: Challenges and Solutions`,
      year: 2023,
      venue: 'ACM Transactions on Computer Systems',
      doi: `10.1145/3${Math.floor(Math.random() * 1000000)}`
    },
    {
      authors: 'Garcia, M., Lee, S., & Patel, N.',
      title: `Rethinking ${topic} for Modern Applications`,
      year: 2024,
      venue: 'IEEE Symposium on Foundations of Computer Science',
      doi: `10.1109/FOCS${Math.floor(Math.random() * 10000)}`
    }
  ];

  res.json({
    topic,
    citations,
    count: citations.length,
    cost: 0.02
  });
});

// Endpoint 4: Data Feed (Premium) - 0.025 STX
app.post('/api/datafeed', requirePayment('/api/datafeed', 0.025), (req: Request, res: Response) => {
  const { source } = req.body;

  const data = {
    source: source || 'market',
    timestamp: new Date().toISOString(),
    data: {
      btc_usd: 45230.50 + Math.random() * 1000,
      eth_usd: 2340.20 + Math.random() * 100,
      stx_usd: 0.85 + Math.random() * 0.1,
      volume_24h: Math.floor(Math.random() * 1000000000),
      market_cap: Math.floor(Math.random() * 10000000000)
    },
    cost: 0.025
  };

  res.json(data);
});

// Endpoint 5: AI Analysis (Cheap Alternative) - 0.008 STX
app.post('/api/analyze', requirePayment('/api/analyze', 0.008), (req: Request, res: Response) => {
  const { text } = req.body;

  if (!text) {
    return res.status(400).json({ error: 'Text is required' });
  }

  const analysis = {
    sentiment: Math.random() > 0.5 ? 'positive' : 'neutral',
    keywords: ['blockchain', 'payment', 'protocol', 'HTTP 402'],
    complexity: 'medium',
    readability_score: Math.floor(Math.random() * 100),
    cost: 0.008
  };

  res.json(analysis);
});

// Endpoint 6: Premium Content - 0.03 STX
app.post('/api/premium', requirePayment('/api/premium', 0.03), (req: Request, res: Response) => {
  const { contentId } = req.body;

  const content = {
    id: contentId || 'premium-001',
    title: 'Advanced x402 Implementation Patterns',
    content: 'This premium guide covers advanced patterns for implementing HTTP 402 payment flows, including retry strategies, caching mechanisms, and multi-provider fallbacks...',
    author: 'Stacks Research Team',
    publishedDate: '2026-02-01',
    cost: 0.03
  };

  res.json(content);
});

// Health check
app.get('/health', (req: Request, res: Response) => {
  res.json({ 
    status: 'ok', 
    network: 'Stacks Testnet',
    paymentAddress: PAYMENT_ADDRESS
  });
});

// Payment verification endpoint
app.post('/api/payment/verify', async (req: Request, res: Response) => {
  const { txId, endpoint, amount } = req.body;

  if (!txId || !endpoint || !amount) {
    return res.status(400).json({ error: 'txId, endpoint, and amount are required' });
  }

  // Verify on blockchain
  const isValid = await verifyPayment(txId, amount);
  
  if (!isValid) {
    return res.status(400).json({ 
      error: 'Payment verification failed',
      message: 'Transaction not found, not confirmed, or invalid'
    });
  }

  // Grant 5-minute access window
  const expiresAt = Date.now() + 5 * 60 * 1000;
  
  accessWindows.set(txId, {
    txId,
    endpoint,
    expiresAt,
    amount
  });

  console.log(`✅ Payment verified: ${txId} for ${endpoint}`);

  res.json({
    success: true,
    message: 'Payment verified, access granted',
    txId,
    endpoint,
    expiresAt: new Date(expiresAt).toISOString(),
    accessWindow: '5 minutes',
    explorerUrl: `https://explorer.hiro.so/txid/${txId}?chain=testnet`
  });
});

// Dashboard API endpoint
app.get('/api/dashboard', (req: Request, res: Response) => {
  const agents = [{
    id: 'agent-1',
    name: 'Agent402-Alpha',
    status: dashboardData.activities.length > 0 ? 'processing' : 'idle',
    balance: 485.5,
    lastActivity: dashboardData.activities[0]?.timestamp || new Date()
  }];

  const stats = {
    activeAgents: agents.filter(a => a.status !== 'idle').length,
    totalPayments: dashboardData.activities.filter(a => a.status === 'confirmed').length,
    totalSpent: dashboardData.activities
      .filter(a => a.status === 'confirmed')
      .reduce((sum, a) => sum + a.amount, 0)
  };

  res.json({
    agents,
    activities: dashboardData.activities,
    stats,
    lastUpdate: dashboardData.lastUpdate
  });
});

app.listen(Number(PORT), '0.0.0.0', () => {
  console.log(`\n🚀 Agent402 Research API Server (Stacks TESTNET)`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`📍 Server running on: http://0.0.0.0:${PORT}`);
  console.log(`📊 Dashboard: http://0.0.0.0:${PORT}/dashboard`);
  console.log(`🌐 Network: Stacks Testnet`);
  console.log(`💰 Payment Address: ${PAYMENT_ADDRESS}`);
  console.log(`🔗 Explorer: https://explorer.hiro.so/address/${PAYMENT_ADDRESS}?chain=testnet`);
  console.log(`\n📋 Endpoints:`);
  console.log(`  POST /api/search?q=<query>     → 0.01 STX`);
  console.log(`  POST /api/summarize            → 0.015 STX`);
  console.log(`  POST /api/citations            → 0.02 STX`);
  console.log(`  POST /api/payment/verify       → Blockchain verification`);
  console.log(`  GET  /health                   → Free`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
});

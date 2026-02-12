# Agent402

> **Autonomous research agent using HTTP 402 Payment Required with Stacks blockchain payments**

Built for the **x402-stacks hackathon** | [Architecture](./ARCHITECTURE.md) | [Video Demo](#)

---

## Table of Contents

- [Overview](#overview)
- [The Problem](#the-problem)
- [The Solution](#the-solution)
- [Key Features](#key-features)
- [Quick Start](#quick-start)
- [Project Structure](#project-structure)
- [How It Works](#how-it-works)
- [Multi-Provider Bidding](#multi-provider-bidding)
- [API Reference](#api-reference)
- [Development](#development)
- [Contributing](#contributing)
- [License](#license)

---

## Overview

**Agent402** is an autonomous research agent that demonstrates HTTP 402 Payment Required as a first-class protocol primitive for paid API access. It combines intelligent decision-making with blockchain-based micropayments to enable truly autonomous agent operations.

### What Makes Agent402 Different

```diff
+ Autonomous economic reasoning - Agent evaluates costs and makes decisions
+ Multi-provider bidding system - Compares quality, price, and reliability
+ Real blockchain payments - Verifiable Stacks testnet transactions
+ Intelligent budget management - Optimizes spending without human intervention
+ HTTP 402 as core primitive - Not bolted on, built from the ground up
```

---

## The Problem

**Today's automation tools hit a critical bottleneck: API payments.**

Modern businesses rely on automation platforms like Zapier, n8n, and AI agents to streamline workflows. But when these tools encounter paid APIs, they stop dead in their tracks:

- Workflow pauses and waits for human approval
- Manual credit card entry required
- No cost optimization or negotiation
- **The entire promise of automation breaks down**

### The Missing Piece

What if agents could:
- Discover paid APIs autonomously
- Evaluate costs and quality trade-offs
- Negotiate with multiple providers
- Pay automatically via blockchain
- Operate as independent economic entities

**This is what Agent402 enables.**

---

## The Solution

Agent402 implements a complete autonomous payment workflow:

### 1. Discovery
Agent encounters HTTP 402 response with payment details

### 2. Evaluation
Compares multiple providers based on:
- Quality score (35% weight)
- Price (25% weight)
- Reliability (20% weight)
- Historical success rate (20% weight)

### 3. Decision
Selects optimal provider using weighted scoring algorithm

### 4. Payment
Submits STX payment to Stacks blockchain automatically

### 5. Verification
Server verifies transaction on-chain before granting access

### 6. Execution
Completes research task and tracks costs transparently

---

## Key Features

### Autonomous Economic Reasoning

The agent doesn't just execute commands—it thinks economically:

```typescript
// Agent evaluates whether optional API call is worth the cost
if (this.totalCost + 0.02 < this.budget) {
  await this.fetchCitations(); // Worth it
} else {
  console.log('Skipping citations to stay within budget');
}
```

**Result:** Intelligent cost optimization without human intervention

---

### Multi-Provider Bidding System

Agent broadcasts requests to multiple providers and selects the best option:

```
Broadcasting research request to 3 providers...

[ARXIV]
├─ Price: 0.015 STX
├─ Quality: 95/100
├─ Historical Success: 95%
├─ Reliability: 98%
└─ Final Score: 92.2

[SEMANTIC SCHOLAR]
├─ Price: 0.012 STX
├─ Quality: 85/100
├─ Historical Success: 91%
├─ Reliability: 95%
└─ Final Score: 88.2

[SCHOLAR SCRAPER]
├─ Price: 0.008 STX
├─ Quality: 70/100
├─ Historical Success: 83%
├─ Reliability: 88%
└─ Final Score: 81.2

Selected: ARXIV (Best overall score: 92.2)
```

**Result:** Market-driven provider selection with transparent scoring

---

### Real Blockchain Transactions

Every payment is a verifiable Stacks testnet transaction:

- Transaction ID provided for every payment
- Explorer links for transparency
- On-chain verification before access granted
- Memo field for request tracking

**Example:**
```
Transaction: 7df5e6cd36b9c99aca114021795d471eab34da1ab00df53db8d084480e1fa915
Explorer: https://explorer.hiro.so/txid/7df5e6cd...?chain=testnet
Status: Confirmed
Amount: 0.015 STX
```

---

### HTTP 402 as Core Primitive

Not an afterthought—the entire architecture is built around HTTP 402:

**Server Response:**
```http
HTTP/1.1 402 Payment Required
X-Payment-Required: true
X-Payment-Amount: 0.015
X-Payment-Address: ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM
X-Payment-Memo: req_d1f4e5b3bd1c
```

**Agent Response:**
```typescript
if (response.status === 402) {
  const txId = await this.submitPayment(headers);
  response = await this.retryWithProof(url, txId);
}
```

**Result:** Native protocol support for paid APIs

---

### Intelligent Budget Management

Agent tracks spending and makes cost-aware decisions:

```
Budget: 0.08 STX
Spent: 0.045 STX
Remaining: 0.035 STX

Cost Breakdown:
  Research (arXiv):    0.015 STX
  Summarization:       0.015 STX
  Citations:           0.015 STX
  ─────────────────────────────
  Total:               0.045 STX

Savings vs. Premium:   0.012 STX (21%)
```

**Result:** Transparent cost tracking and optimization

---

## Quick Start

### Prerequisites

**1. Get Testnet STX (Free)**

Visit the Stacks testnet faucet:
```
https://explorer.hiro.so/sandbox/faucet?chain=testnet
```

Request 500 STX (instant, no signup required)

**2. Generate Wallet**

```bash
npm install -g @stacks/cli
stacks make_keychain -t
```

Save your private key and address.

---

### Installation

```bash
# Clone repository
git clone https://github.com/yourusername/agent402.git
cd agent402

# Install dependencies
npm install

# Configure environment
cp .env.example .env
nano .env
```

**Required environment variables:**

```bash
STACKS_NETWORK=testnet
STACKS_PRIVATE_KEY=your_private_key_here
STACKS_ADDRESS=your_address_here
SERVER_PAYMENT_ADDRESS=ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM
PORT=3000
API_BASE_URL=http://localhost:3000
```

---

### Running the Demo

**Terminal 1: Start Server**
```bash
npm run server
```

**Terminal 2: Run Agent**
```bash
npm run agent
```

**Terminal 3: View Dashboard**
```bash
# Open browser to:
http://localhost:3000/dashboard/index.html
```

---

### Expected Output

```
Agent402 Research: "HTTP 402 protocol"
Budget: 0.08 STX
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Step 1: Multi-Provider Research Bidding

Broadcasting research request to 3 providers...
   Topic: "HTTP 402 protocol"
   Max Budget: 0.08 STX

Bids Received + Historical Performance:

   [ARXIV]
   ├─ Price: 0.015 STX
   ├─ Quality: 95/100
   ├─ Historical Success: 95%
   ├─ Reliability: 98%
   └─ Final Score: 92.2

Selected: ARXIV
   Reason: Best overall score (92.2)
   Quality: 95/100 | Price: 0.015 STX

[RESEARCH-ARXIV] POST http://localhost:3000/api/research/arxiv
402 Payment Required
   Amount: 0.015 STX
   Address: ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM

Submitting payment to Stacks testnet...
Transaction broadcast: 7df5e6cd36b9c99aca114021795d471eab34da1ab00df53db8d084480e1fa915
Explorer: https://explorer.hiro.so/txid/7df5e6cd...?chain=testnet
Waiting for confirmation...
Transaction confirmed!

Retrying with payment proof...
200 OK (cost: 0.015 STX)

Decision: Choose summarization service
   Option A: /api/summarize (0.015 STX) - Full summary
   Option B: /api/analyze (0.008 STX) - Quick analysis
   Selected: Full summary (better quality, budget allows)

[SUMMARIZE] POST http://localhost:3000/api/summarize
402 Payment Required
Submitting payment...
Transaction confirmed!
200 OK (cost: 0.015 STX)

Final Report
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Topic: HTTP 402 protocol
Sources: 5 research papers
Quality: 95/100

Cost Breakdown:
  Research:    0.015 STX
  Summarize:   0.015 STX
  ─────────────────────
  Total:       0.030 STX

Completed in 45 seconds
Network: Stacks Testnet
```

---

## Project Structure

```
agent402/
├── server/
│   └── index.ts              # Express server with HTTP 402 endpoints
├── client/
│   └── index.ts              # Autonomous agent with payment logic
├── dashboard/
│   ├── index.html            # Real-time workflow visualization
│   ├── styles.css            # Neubrutalist design (black/lime)
│   └── dashboard.js          # Tree view with decisions
├── shared/
│   └── types.ts              # TypeScript interfaces
├── tests/
│   ├── server.test.ts        # Server unit tests
│   └── agent.test.ts         # Agent unit tests
├── .env.example              # Environment template
├── package.json              # Dependencies and scripts
├── tsconfig.json             # TypeScript configuration
├── README.md                 # This file
└── ARCHITECTURE.md           # Technical deep dive
```

---

## How It Works

### HTTP 402 Payment Flow

```
┌─────────────┐                 ┌──────────────┐
│   Agent402  │                 │ Research API │
│   (Client)  │                 │   (Server)   │
└──────┬──────┘                 └──────┬───────┘
       │                               │
       │  1. POST /api/research        │
       │  ────────────────────────>    │
       │                               │
       │  <──  402 Payment Required ── │
       │       Headers:                │
       │         X-Payment-Amount      │
       │         X-Payment-Address     │
       │         X-Payment-Memo        │
       │                               │
       │  2. Pay via Stacks testnet    │
       │  ──  TX: 0x789def...  ──>     │
       │                               │
       │  3. Retry with proof          │
       │  ──  Header: X-Payment-Proof  │
       │  ────────────────────────>    │
       │                               │
       │  4. Verify on blockchain      │
       │       ├─ Check TX status      │
       │       ├─ Verify amount        │
       │       ├─ Verify recipient     │
       │       └─ Grant access         │
       │                               │
       │  <────  200 OK + Data  ────   │
       │                               │
       └───────────────────────────────┘
```

### Payment Verification Process

**Server-side verification:**

```typescript
async function verifyPayment(txId: string, expectedAmount: number) {
  // Fetch transaction from Stacks API
  const tx = await txApi.getTransactionById({ txId });
  
  // Validate transaction
  if (tx.tx_status !== 'success') return false;
  if (tx.tx_type !== 'token_transfer') return false;
  if (tx.token_transfer.recipient_address !== SERVER_ADDRESS) return false;
  
  const amountSTX = parseInt(tx.token_transfer.amount) / 1_000_000;
  if (amountSTX < expectedAmount) return false;
  
  return true; // Payment verified
}
```

**Security guarantees:**
- Transaction must be confirmed on-chain
- Amount must meet or exceed requirement
- Recipient must match server address
- Transaction type must be STX transfer

---

## Multi-Provider Bidding

### How It Works

**1. Agent broadcasts request to all providers**

```typescript
const providers = [
  { name: 'arXiv', endpoint: '/api/research/arxiv', price: 0.015, quality: 95 },
  { name: 'Semantic Scholar', endpoint: '/api/research/semantic', price: 0.012, quality: 85 },
  { name: 'Scholar Scraper', endpoint: '/api/research/scholar', price: 0.008, quality: 70 }
];
```

**2. Each provider responds with bid**

```typescript
{
  provider: 'arXiv',
  price: 0.015,
  quality: 95,
  estimatedResults: 5,
  peerReviewed: true
}
```

**3. Agent evaluates using weighted scoring**

```typescript
function calculateScore(bid, metrics) {
  const qualityScore = bid.quality;
  const priceScore = ((maxBudget - bid.price) / maxBudget) * 100;
  const reliabilityScore = metrics.reliability;
  const trustScore = metrics.successRate;
  
  return (
    qualityScore * 0.35 +
    priceScore * 0.25 +
    reliabilityScore * 0.20 +
    trustScore * 0.20
  );
}
```

**4. Agent selects winner and pays**

```typescript
const winner = bids.sort((a, b) => b.score - a.score)[0];
await this.makeRequest(winner.endpoint);
```

### Scoring Weights

| Factor | Weight | Rationale |
|--------|--------|-----------|
| Quality | 35% | Most important for research accuracy |
| Price | 25% | Cost optimization matters |
| Reliability | 20% | Uptime and consistency |
| Success Rate | 20% | Historical performance |

### Provider Comparison

| Provider | Price | Quality | Results | Specialty |
|----------|-------|---------|---------|-----------|
| **arXiv** | 0.015 STX | 95/100 | 5 papers | Peer-reviewed academic papers |
| **Semantic Scholar** | 0.012 STX | 85/100 | 8 papers | Curated research database |
| **Scholar Scraper** | 0.008 STX | 70/100 | 12 papers | General web scraping |

---

## API Reference

### Research Endpoints

#### POST /api/research/arxiv
**Price:** 0.015 STX  
**Quality:** 95/100  
**Returns:** 5 peer-reviewed academic papers

```bash
curl -X POST http://localhost:3000/api/research/arxiv?q=HTTP+402
```

#### POST /api/research/semantic
**Price:** 0.012 STX  
**Quality:** 85/100  
**Returns:** 8 curated research papers

```bash
curl -X POST http://localhost:3000/api/research/semantic?q=HTTP+402
```

#### POST /api/research/scholar
**Price:** 0.008 STX  
**Quality:** 70/100  
**Returns:** 12 general research results

```bash
curl -X POST http://localhost:3000/api/research/scholar?q=HTTP+402
```

### Processing Endpoints

#### POST /api/summarize
**Price:** 0.015 STX  
**Returns:** Full summary with key insights

#### POST /api/analyze
**Price:** 0.008 STX  
**Returns:** Quick analysis (cheaper alternative)

#### POST /api/citations
**Price:** 0.02 STX  
**Returns:** Academic citations in multiple formats

### Utility Endpoints

#### GET /health
**Price:** Free  
**Returns:** Server health status

```json
{
  "status": "ok",
  "network": "Stacks Testnet",
  "paymentAddress": "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM"
}
```

#### POST /api/payment/verify
**Price:** Free  
**Returns:** Payment verification result

```bash
curl -X POST http://localhost:3000/api/payment/verify \
  -H "Content-Type: application/json" \
  -d '{"txId": "0x789def...", "amount": 0.015}'
```

#### GET /api/dashboard
**Price:** Free  
**Returns:** Real-time agent activity data

---

## Development

### Run Server Only

```bash
npm run server
```

Server starts on `http://localhost:3000`

### Run Agent Only

```bash
npm run agent

# Or with custom topic:
npm run agent -- "blockchain scalability"
```

### Run Tests

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Watch mode
npm run test:watch
```

### Build TypeScript

```bash
npm run build
```

Outputs to `dist/` directory

### Lint Code

```bash
npm run lint
npm run lint:fix
```

---

## Contributing

Contributions are welcome! Please follow these guidelines:

**1. Fork the repository**

**2. Create a feature branch**
```bash
git checkout -b feature/amazing-feature
```

**3. Make your changes**
- Follow existing code style
- Add tests for new features
- Update documentation

**4. Run tests**
```bash
npm test
npm run lint
```

**5. Submit a pull request**

---

## License

MIT License - see [LICENSE](LICENSE) file for details

---

**Agent402** - Autonomous agents for the HTTP 402 economy

Built with Stacks | Powered by HTTP 402 | Autonomous by Design

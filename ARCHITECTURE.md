# Agent402 Architecture

## System Overview

Agent402 demonstrates HTTP 402 Payment Required as a first-class protocol primitive, combining autonomous agents with blockchain-based micropayments on Stacks testnet.

### Core Components

1. **Research API Server** - Express.js server providing paid endpoints via HTTP 402
2. **Autonomous Agent** - Client that automatically handles payments and makes cost-aware decisions
3. **Multi-Provider System** - Bidding mechanism for selecting optimal service providers
4. **Dashboard** - Real-time visualization of agent workflow and decisions

---

## Architecture Diagram

```
┌──────────────────────────────────────────────────────────────┐
│                        Agent402 System                        │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌─────────────┐         ┌──────────────┐                  │
│  │   Client    │         │    Server    │                  │
│  │   Agent     │◄───────►│  (HTTP 402)  │                  │
│  └──────┬──────┘         └──────┬───────┘                  │
│         │                       │                           │
│         │  1. Request           │                           │
│         │  ──────────────────►  │                           │
│         │                       │                           │
│         │  2. 402 + Headers     │                           │
│         │  ◄──────────────────  │                           │
│         │                       │                           │
│         ▼                       │                           │
│  ┌─────────────┐               │                           │
│  │   Stacks    │               │                           │
│  │  Blockchain │               │                           │
│  │  (Testnet)  │               │                           │
│  └──────┬──────┘               │                           │
│         │                       │                           │
│         │  3. Payment TX        │                           │
│         │  ──────────────────►  │                           │
│         │                       │                           │
│         │  4. Verify TX         │                           │
│         │  ◄──────────────────  │                           │
│         │                       │                           │
│         │  5. Retry + Proof     │                           │
│         │  ──────────────────►  │                           │
│         │                       │                           │
│         │  6. 200 OK + Data     │                           │
│         │  ◄──────────────────  │                           │
│         │                       │                           │
└─────────┴───────────────────────┴───────────────────────────┘
```

---

## Component Details

### 1. Research API Server

**Location:** `server/index.ts`

**Purpose:** Provides paid research endpoints using HTTP 402 protocol

**Key Features:**
- Returns 402 Payment Required for unpaid requests
- Includes payment headers (amount, address, memo)
- Verifies Stacks testnet transactions on-chain
- Grants 5-minute access windows after payment
- Caches verified payments for efficiency

**Endpoints:**

| Endpoint | Method | Price | Description |
|----------|--------|-------|-------------|
| `/api/research/arxiv` | POST | 0.015 STX | Premium peer-reviewed papers |
| `/api/research/semantic` | POST | 0.012 STX | Curated research database |
| `/api/research/scholar` | POST | 0.008 STX | General web scraping |
| `/api/summarize` | POST | 0.015 STX | Full text summarization |
| `/api/analyze` | POST | 0.008 STX | Quick analysis (cheaper) |
| `/api/citations` | POST | 0.02 STX | Academic citations |
| `/api/payment/verify` | POST | Free | Blockchain verification |
| `/health` | GET | Free | Health check |
| `/api/dashboard` | GET | Free | Activity data |

### 2. Autonomous Agent

**Location:** `client/index.ts`

**Purpose:** Autonomous research agent with economic reasoning capabilities

**Key Features:**
- Multi-provider bidding and selection
- Automatic payment handling via Stacks blockchain
- Budget management and cost optimization
- Quality vs price decision making
- Transaction verification and retry logic

**Decision Algorithm:**
```typescript
score = (quality * 0.35) + (priceScore * 0.25) + (reliability * 0.20) + (successRate * 0.20)
```

**Payment Flow:**
1. Receive HTTP 402 response
2. Extract payment details from headers
3. Submit STX transaction to blockchain
4. Wait for confirmation
5. Retry request with transaction proof
6. Track costs and update budget

### 3. Multi-Provider System

**Purpose:** Competitive marketplace for research services

**Provider Types:**
- **ARXIV**: Premium academic papers (high quality, higher cost)
- **SEMANTIC SCHOLAR**: Curated research database (balanced)
- **SCHOLAR SCRAPER**: General web scraping (low cost, lower quality)

**Selection Criteria:**
- Quality score (35% weight)
- Price competitiveness (25% weight)
- Historical reliability (20% weight)
- Success rate (20% weight)

### 4. Dashboard

**Location:** `dashboard/index.html`

**Purpose:** Real-time visualization of agent operations

**Features:**
- Live workflow tree view
- Cost tracking and budget visualization
- Transaction history with blockchain links
- Provider comparison metrics
- Decision reasoning display

---

## HTTP 402 Protocol Implementation

### Request Flow

```http
POST /api/research/arxiv
Content-Type: application/json

{
  "topic": "HTTP 402 protocol",
  "depth": "comprehensive"
}
```

### 402 Response

```http
HTTP/1.1 402 Payment Required
Content-Type: application/json
X-Payment-Required: true
X-Payment-Amount: 0.015
X-Payment-Address: ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM
X-Payment-Memo: req_d1f4e5b3bd1c

{
  "error": "Payment required",
  "amount": "0.015 STX",
  "address": "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM",
  "memo": "req_d1f4e5b3bd1c"
}
```

### Payment Verification

```http
POST /api/payment/verify
Content-Type: application/json

{
  "txId": "7df5e6cd36b9c99aca114021795d471eab34da1ab00df53db8d084480e1fa915",
  "memo": "req_d1f4e5b3bd1c"
}
```

### Successful Response

```http
HTTP/1.1 200 OK
Content-Type: application/json
X-Payment-Verified: true
X-Transaction-Id: 7df5e6cd36b9c99aca114021795d471eab34da1ab00df53db8d084480e1fa915

{
  "results": [...],
  "quality": 95,
  "sources": 5
}
```

---

## Blockchain Integration

### Stacks Testnet Configuration

**Network:** Stacks Testnet
**Currency:** STX (Stacks tokens)
**Explorer:** https://explorer.hiro.so/?chain=testnet

### Transaction Structure

```typescript
{
  recipient: "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM",
  amount: 15000, // 0.015 STX in microSTX
  memo: "req_d1f4e5b3bd1c",
  network: "testnet"
}
```

### Verification Process

1. Agent submits transaction to Stacks blockchain
2. Server receives transaction ID from agent
3. Server queries Stacks API to verify transaction
4. Server checks recipient address and memo match
5. Server confirms transaction is confirmed on-chain
6. Server grants 5-minute access window

---

## Security Considerations

### Payment Security
- All payments verified on-chain before access granted
- Memo field prevents transaction replay attacks
- 5-minute access windows limit exposure
- No sensitive data stored in payment cache

### API Security
- Rate limiting on all endpoints
- Input validation and sanitization
- CORS configuration for dashboard access
- Error handling without information leakage

### Blockchain Security
- Testnet environment (no real value at risk)
- Private key management via environment variables
- Transaction confirmation requirements
- Address validation before payment submission

---

## Performance Characteristics

### Latency
- HTTP 402 response: < 50ms
- Stacks transaction submission: 1-3 seconds
- Transaction confirmation: 10-30 seconds
- Total payment flow: 15-45 seconds

### Throughput
- Server capacity: 100+ concurrent requests
- Payment verification: 10+ transactions/minute
- Dashboard updates: Real-time via polling

### Scalability
- Stateless server design enables horizontal scaling
- Payment cache reduces blockchain API calls
- Provider system supports unlimited service additions

---

## Development Setup

### Prerequisites
- Node.js 18+
- TypeScript 4.9+
- Stacks testnet tokens (free from faucet)

### Environment Variables
```bash
STACKS_NETWORK=testnet
STACKS_PRIVATE_KEY=your_private_key
STACKS_ADDRESS=your_address
SERVER_PAYMENT_ADDRESS=ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM
PORT=3000
API_BASE_URL=http://localhost:3000
```

### Build Process
```bash
npm install
npm run build
npm run test
```

### Deployment
- Server: Express.js application
- Client: Node.js script
- Dashboard: Static HTML/CSS/JS files
- Database: In-memory (production would use persistent storage)

---

## Future Enhancements

### Protocol Extensions
- HTTP 402 with multiple payment methods
- Subscription-based access models
- Dynamic pricing based on demand
- Quality-based pricing tiers

### Agent Capabilities
- Machine learning for provider selection
- Predictive cost modeling
- Multi-agent coordination
- Cross-chain payment support

### Infrastructure
- Persistent storage for payment history
- Advanced analytics and reporting
- Load balancing and auto-scaling
- Production blockchain integration
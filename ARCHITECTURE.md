# Agent402 Architecture

## System Overview

Agent402 demonstrates HTTP 402 Payment Required as a first-class protocol primitive, combining autonomous agents with blockchain-based micropayments on Stacks testnet.

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

## HTTP 402 Payment Flow

```
Agent                    Server                  Stacks Blockchain
  │                        │                            │
  │  POST /api/research    │                            │
  ├───────────────────────►│                            │
  │                        │                            │
  │  402 Payment Required  │                            │
  │  X-Payment-Amount      │                            │
  │  X-Payment-Address     │                            │
  │◄───────────────────────┤                            │
  │                        │                            │
  │  Submit STX Payment    │                            │
  ├────────────────────────┼───────────────────────────►│
  │                        │                            │
  │  TX ID: 0x789def...    │                            │
  │◄───────────────────────┼────────────────────────────┤
  │                        │                            │
  │  Retry with TX Proof   │                            │
  ├───────────────────────►│                            │
  │                        │                            │
  │                        │  Verify Transaction        │
  │                        ├───────────────────────────►│
  │                        │                            │
  │                        │  Confirmed ✓               │
  │                        │◄───────────────────────────┤
  │                        │                            │
  │  200 OK + Data         │                            │
  │◄───────────────────────┤                            │
  │                        │                            │
```

---

## Multi-Provider Bidding Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    Agent Decision Process                    │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  1. Broadcast Request                                       │
│     ├─► Provider A (arXiv)         - 0.015 STX, Quality 95 │
│     ├─► Provider B (Semantic)      - 0.012 STX, Quality 85 │
│     └─► Provider C (Scholar)       - 0.008 STX, Quality 70 │
│                                                             │
│  2. Evaluate Bids                                           │
│     ├─ Quality Score    (35% weight)                        │
│     ├─ Price Score      (25% weight)                        │
│     ├─ Reliability      (20% weight)                        │
│     └─ Success Rate     (20% weight)                        │
│                                                             │
│  3. Calculate Final Scores                                  │
│     ├─ Provider A: 92.2 ✓ WINNER                            │
│     ├─ Provider B: 88.2                                     │
│     └─ Provider C: 81.2                                     │
│                                                             │
│  4. Execute Payment                                         │
│     └─► Pay Provider A via Stacks blockchain                │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Core Components

### 1. Autonomous Agent (`client/index.ts`)
- Detects HTTP 402 responses automatically
- Submits STX payments to Stacks testnet
- Makes cost-aware decisions based on budget
- Evaluates multiple providers using weighted scoring
- Tracks spending and optimizes costs

### 2. Research API Server (`server/index.ts`)
- Returns 402 Payment Required for unpaid requests
- Verifies transactions on Stacks blockchain
- Grants 5-minute access windows after payment
- Provides multiple research provider endpoints
- Caches verified payments for efficiency

### 3. Multi-Provider System
- Three research providers with different pricing/quality
- Real-time bidding and evaluation
- Historical performance tracking
- Transparent scoring algorithm

### 4. Dashboard (`dashboard/`)
- Real-time workflow visualization
- Decision tree showing agent choices
- Cost breakdown and budget tracking
- Transaction links to Stacks explorer

---

## Technology Stack

**Backend:** Node.js + TypeScript + Express.js  
**Blockchain:** Stacks testnet + Stacks.js  
**Frontend:** Vanilla JavaScript + Neubrutalist design  
**Payment Verification:** Hiro API

---

## Security

**Payment Verification:**
- Transaction must be confirmed on-chain
- Amount must meet or exceed requirement
- Recipient must match server address
- No replay attacks (TX ID tracking)

**Access Control:**
- 5-minute access windows after payment
- Cached verification results
- Automatic expiry

---

## Key Innovation

Agent402 demonstrates **autonomous economic reasoning** - agents that don't just execute commands, but think economically:

- Discover paid APIs via HTTP 402
- Evaluate multiple providers
- Negotiate based on quality, price, and reliability
- Pay automatically via blockchain
- Optimize spending without human intervention

This enables agents to operate as **independent economic entities** in the HTTP 402 economy.

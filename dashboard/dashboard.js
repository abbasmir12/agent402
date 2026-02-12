const API_BASE = 'http://localhost:3000';
const POLL_INTERVAL = 2000;

class Dashboard {
  constructor() {
    this.agents = new Map();
    this.workflows = [];
    this.stats = { activeAgents: 0, totalPayments: 0, totalSpent: 0 };
    this.init();
  }

  init() {
    this.render();
    this.startPolling();
    this.fetchData();
  }

  async fetchData() {
    try {
      const response = await fetch(`${API_BASE}/api/dashboard`);
      if (response.ok) {
        const data = await response.json();
        this.agents.clear();
        data.agents.forEach(agent => {
          agent.lastActivity = new Date(agent.lastActivity);
          // Set status to idle if no recent activity
          if (data.activities.length === 0 || 
              (Date.now() - agent.lastActivity.getTime()) > 60000) {
            agent.status = 'idle';
          }
          this.agents.set(agent.id, agent);
        });
        
        this.workflows = this.buildWorkflows(data.activities);
        this.stats = data.stats;
        this.render();
      }
    } catch (error) {
      console.log('Using mock data - server offline');
      this.loadMockData();
    }
  }

  buildWorkflows(activities) {
    const sessions = new Map();
    
    activities.forEach(activity => {
      const sessionKey = new Date(activity.timestamp).toISOString().split('T')[0];
      if (!sessions.has(sessionKey)) {
        sessions.set(sessionKey, {
          id: sessionKey,
          timestamp: new Date(activity.timestamp),
          steps: [],
          totalCost: 0,
          budget: 0.08
        });
      }
      
      const session = sessions.get(sessionKey);
      
      // Add decision step before payment
      if (activity.endpoint === '/api/analyze' || activity.endpoint === '/api/summarize') {
        session.steps.push({
          type: 'decision',
          title: 'Choose Summarization Service',
          status: 'success',
          timestamp: new Date(activity.timestamp),
          decision: activity.endpoint === '/api/summarize' ? 
            'Selected: Full summary (0.015 STX)' : 
            'Selected: Quick analysis (0.008 STX)',
          substeps: [
            { text: 'Option A: /api/summarize (0.015 STX)', status: activity.endpoint === '/api/summarize' ? 'success' : 'pending' },
            { text: 'Option B: /api/analyze (0.008 STX)', status: activity.endpoint === '/api/analyze' ? 'success' : 'pending' },
            { text: `Budget remaining: ${(session.budget - session.totalCost).toFixed(3)} STX`, status: 'success' }
          ]
        });
      }
      
      // Add budget check for optional endpoints
      if (activity.endpoint === '/api/citations' || activity.endpoint === '/api/premium') {
        const wouldExceed = (session.totalCost + activity.amount) > session.budget;
        session.steps.push({
          type: 'decision',
          title: `Budget Check: ${activity.endpoint}`,
          status: wouldExceed ? 'error' : 'success',
          timestamp: new Date(activity.timestamp),
          decision: wouldExceed ? 
            `Skipped: Would exceed budget (${(session.totalCost + activity.amount).toFixed(3)} > ${session.budget})` :
            `Approved: Within budget (${(session.totalCost + activity.amount).toFixed(3)} ≤ ${session.budget})`,
          substeps: [
            { text: `Cost: ${activity.amount} STX`, status: 'success' },
            { text: `Current spend: ${session.totalCost.toFixed(3)} STX`, status: 'success' },
            { text: `Budget: ${session.budget} STX`, status: 'success' }
          ]
        });
        
        if (wouldExceed) {
          session.totalCost += 0; // Don't add cost if skipped
          return; // Skip adding payment steps
        }
      }
      
      session.steps.push({
        type: 'request',
        endpoint: activity.endpoint,
        status: 'detected',
        timestamp: new Date(activity.timestamp),
        substeps: [
          { text: '402 Payment Required', status: 'success' },
          { text: `Amount: ${activity.amount} STX`, status: 'success' },
          { text: `Address: ${activity.recipient}`, status: 'success' }
        ]
      });
      
      session.steps.push({
        type: 'payment',
        endpoint: activity.endpoint,
        status: 'pending',
        amount: activity.amount,
        txId: activity.txId,
        timestamp: new Date(activity.timestamp),
        substeps: [
          { text: 'Submitting to Stacks testnet', status: 'success' },
          { text: `TX: ${activity.txId.slice(0, 16)}...`, status: 'success' },
          { text: 'Waiting for confirmation', status: 'success' }
        ]
      });
      
      session.steps.push({
        type: 'retry',
        endpoint: activity.endpoint,
        status: activity.status === 'confirmed' ? 'success' : 'error',
        timestamp: new Date(activity.timestamp),
        txId: activity.txId,
        substeps: [
          { text: 'Retrying with payment proof', status: 'success' },
          { text: activity.status === 'confirmed' ? '200 OK - Access Granted' : 'Failed', status: activity.status === 'confirmed' ? 'success' : 'error' }
        ]
      });
      
      session.totalCost += activity.amount;
    });
    
    return Array.from(sessions.values()).reverse();
  }

  loadMockData() {
    this.agents.set('agent-1', {
      id: 'agent-1',
      name: 'Agent402-Alpha',
      status: 'idle',
      balance: 485.5,
      lastActivity: new Date()
    });

    this.workflows = [];
    this.stats = { activeAgents: 0, totalPayments: 0, totalSpent: 0 };
    this.render();
  }

  async startPolling() {
    setInterval(() => this.fetchData(), POLL_INTERVAL);
  }

  render() {
    this.renderStats();
    this.renderAgents();
    this.renderBalances();
    this.renderWorkflows();
  }

  renderStats() {
    document.getElementById('activeAgents').textContent = this.stats.activeAgents;
    document.getElementById('totalPayments').textContent = this.stats.totalPayments;
    document.getElementById('totalSpent').textContent = this.stats.totalSpent.toFixed(3);
  }

  renderAgents() {
    const container = document.getElementById('agentsList');
    container.innerHTML = '';

    this.agents.forEach(agent => {
      const card = document.createElement('div');
      card.className = 'agent-card';
      card.innerHTML = `
        <div class="agent-info">
          <div class="agent-name">${agent.name}</div>
          <div class="agent-timestamp">${this.formatTime(agent.lastActivity)}</div>
        </div>
        <div class="agent-status status-${agent.status}">${agent.status}</div>
      `;
      container.appendChild(card);
    });
  }

  renderBalances() {
    const container = document.getElementById('balancesList');
    container.innerHTML = '';

    this.agents.forEach(agent => {
      const maxBalance = 500;
      const percentage = (agent.balance / maxBalance) * 100;
      const isLow = percentage < 30;

      const item = document.createElement('div');
      item.className = 'balance-item';
      item.innerHTML = `
        <div class="balance-header">
          <div class="balance-name">${agent.name}</div>
          <div class="balance-amount">${agent.balance.toFixed(2)} STX</div>
        </div>
        <div class="balance-bar">
          <div class="balance-fill ${isLow ? 'low' : ''}" style="width: ${percentage}%"></div>
        </div>
      `;
      container.appendChild(item);
    });
  }

  renderWorkflows() {
    const container = document.getElementById('workflowTree');
    container.innerHTML = '';

    if (this.workflows.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-text">No agent activity yet. Run an agent to see the workflow.</div>
        </div>
      `;
      return;
    }

    this.workflows.forEach(session => {
      const sessionEl = document.createElement('div');
      sessionEl.className = 'workflow-session';
      
      sessionEl.innerHTML = `
        <div class="session-header">
          <div class="session-icon">A</div>
          <div class="session-info">
            <div class="session-title">Research Session</div>
            <div class="session-time">${this.formatTime(session.timestamp)}</div>
          </div>
          <div class="session-cost">${session.totalCost.toFixed(3)} STX</div>
        </div>
        <div class="workflow-steps">
          ${session.steps.map(step => this.renderStep(step)).join('')}
        </div>
      `;
      
      container.appendChild(sessionEl);
    });
  }

  renderStep(step) {
    const statusClass = step.status === 'success' ? 'success' : 
                       step.status === 'pending' ? 'pending' : 
                       step.status === 'error' ? 'error' : 'active';
    
    let stepTitle;
    if (step.type === 'decision') {
      stepTitle = step.title || 'Decision';
    } else if (step.type === 'request') {
      stepTitle = `Request: ${step.endpoint}`;
    } else if (step.type === 'payment') {
      stepTitle = 'Payment Submission';
    } else {
      stepTitle = 'Access Granted';
    }
    
    const statusBadge = step.status === 'success' ? 'confirmed' :
                       step.status === 'pending' ? 'pending' :
                       step.status === 'error' ? 'failed' : 'processing';
    
    let details = '';
    if (step.decision) {
      details += `
        <div class="step-detail">
          <span class="step-label">Decision:</span>
          <span class="step-value">${step.decision}</span>
        </div>
      `;
    }
    if (step.amount) {
      details += `
        <div class="step-detail">
          <span class="step-label">Amount:</span>
          <span class="step-value amount">${step.amount.toFixed(3)} STX</span>
        </div>
      `;
    }
    if (step.txId) {
      details += `
        <div class="step-detail">
          <span class="step-label">TX ID:</span>
          <a href="https://explorer.hiro.so/txid/${step.txId}?chain=testnet" 
             target="_blank" class="step-value link">${step.txId.slice(0, 16)}...</a>
        </div>
        <div class="step-detail">
          <span class="step-label"></span>
          <a href="https://explorer.hiro.so/txid/${step.txId}?chain=testnet" 
             target="_blank" class="explorer-button">View on Stacks Explorer →</a>
        </div>
      `;
    }
    
    const substeps = step.substeps ? `
      <div class="substeps">
        ${step.substeps.map(sub => `
          <div class="substep">
            <div class="substep-icon ${sub.status}"></div>
            <span>${sub.text}</span>
          </div>
        `).join('')}
      </div>
    ` : '';
    
    return `
      <div class="workflow-step">
        <div class="step-node ${statusClass}"></div>
        <div class="step-content">
          <div class="step-header">
            <div class="step-title">${stepTitle}</div>
            <div class="step-status status-${statusBadge}">${statusBadge}</div>
          </div>
          ${details ? `<div class="step-details">${details}</div>` : ''}
          ${substeps}
        </div>
      </div>
    `;
  }

  formatTime(date) {
    const now = new Date();
    const diff = Math.floor((now - date) / 1000);

    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return date.toLocaleDateString();
  }
}

const dashboard = new Dashboard();

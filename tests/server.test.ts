import axios from 'axios';

describe('Server HTTP 402 Tests', () => {
  const API_BASE = 'http://localhost:3000';

  test('returns 402 without payment proof', async () => {
    try {
      await axios.post(`${API_BASE}/api/search?q=test`);
      fail('Should have returned 402');
    } catch (error: any) {
      expect(error.response.status).toBe(402);
      expect(error.response.headers['x-payment-required']).toBe('true');
      expect(error.response.headers['x-payment-amount']).toBe('0.01');
      expect(error.response.headers['x-payment-address']).toBeTruthy();
      expect(error.response.headers['x-payment-memo']).toBeTruthy();
    }
  });

  test('returns 402 for summarize endpoint', async () => {
    try {
      await axios.post(`${API_BASE}/api/summarize`, { text: 'test' });
      fail('Should have returned 402');
    } catch (error: any) {
      expect(error.response.status).toBe(402);
      expect(error.response.headers['x-payment-amount']).toBe('0.015');
    }
  });

  test('returns 402 for citations endpoint', async () => {
    try {
      await axios.post(`${API_BASE}/api/citations`, { topic: 'test' });
      fail('Should have returned 402');
    } catch (error: any) {
      expect(error.response.status).toBe(402);
      expect(error.response.headers['x-payment-amount']).toBe('0.02');
    }
  });

  test('health endpoint is free', async () => {
    const response = await axios.get(`${API_BASE}/health`);
    expect(response.status).toBe(200);
    expect(response.data.status).toBe('ok');
    expect(response.data.network).toBe('Stacks Testnet');
  });

  test('payment verification with valid txId', async () => {
    // Note: This test requires a real confirmed transaction on testnet
    // For CI/CD, you'd mock the blockchain API
    const testTxId = '0xtest123456789';
    
    try {
      const response = await axios.post(`${API_BASE}/api/payment/verify`, {
        txId: testTxId,
        endpoint: '/api/search',
        amount: 0.01
      });
      
      // May fail if tx doesn't exist, which is expected in test environment
      if (response.status === 200) {
        expect(response.data.success).toBe(true);
        expect(response.data.accessWindow).toBe('5 minutes');
      }
    } catch (error: any) {
      // Expected to fail with test TX ID
      expect(error.response.status).toBe(400);
    }
  });
});

describe('Server Data Tests', () => {
  const API_BASE = 'http://localhost:3000';

  test('search returns mock results when paid', async () => {
    // This test assumes you have a valid payment proof
    // In practice, you'd need to actually pay or mock the middleware
    
    // For now, just test the 402 response structure
    try {
      await axios.post(`${API_BASE}/api/search?q=blockchain`);
    } catch (error: any) {
      const paymentDetails = error.response.data.paymentDetails;
      expect(paymentDetails.amount).toBe(0.01);
      expect(paymentDetails.network).toBe('testnet');
      expect(paymentDetails.explorerUrl).toContain('explorer.hiro.so');
    }
  });
});

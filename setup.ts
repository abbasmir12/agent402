#!/usr/bin/env ts-node

/**
 * Setup Script for Agent402
 * 
 * This script:
 * 1. Generates a new Stacks testnet wallet
 * 2. Funds it with testnet STX from the faucet
 * 3. Creates/updates .env file with credentials
 */

import { 
  makeRandomPrivKey,
  getAddressFromPrivateKey
} from '@stacks/transactions';
import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';

// ANSI colors for better output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  blue: '\x1b[34m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
};

const log = {
  info: (msg: string) => console.log(`${colors.blue}ℹ${colors.reset} ${msg}`),
  success: (msg: string) => console.log(`${colors.green}✓${colors.reset} ${msg}`),
  error: (msg: string) => console.log(`${colors.red}✗${colors.reset} ${msg}`),
  warn: (msg: string) => console.log(`${colors.yellow}⚠${colors.reset} ${msg}`),
  step: (msg: string) => console.log(`\n${colors.cyan}${colors.bright}${msg}${colors.reset}`),
};

async function generateWallet() {
  log.step('🔑 Step 1: Generating Stacks Testnet Wallet');
  
  // Generate random private key (returns hex string)
  const privateKeyString = makeRandomPrivKey();
  
  // Derive testnet address
  const address = getAddressFromPrivateKey(privateKeyString);
  
  log.success(`Private Key: ${privateKeyString}`);
  log.success(`Address: ${address}`);
  
  return { privateKey: privateKeyString, address };
}

async function fundWallet(address: string, retries = 3): Promise<boolean> {
  log.step('💰 Step 2: Requesting Testnet STX from Faucet');
  
  const faucetUrls = [
    `https://api.testnet.hiro.so/extended/v1/faucets/stx?address=${address}`,
    `https://stacks-node-api.testnet.stacks.co/extended/v1/faucets/stx?address=${address}&stacking=false`,
  ];
  
  for (let attempt = 1; attempt <= retries; attempt++) {
    for (const faucetUrl of faucetUrls) {
      try {
        log.info(`Attempt ${attempt}/${retries} - Trying faucet...`);
        log.info(`URL: ${faucetUrl}`);
        
        const response = await axios.post(faucetUrl, {}, {
          timeout: 30000,
          headers: {
            'Content-Type': 'application/json',
          }
        });
        
        if (response.status === 200 && response.data) {
          log.success('Faucet request successful!');
          
          if (response.data.txId) {
            log.success(`Transaction ID: ${response.data.txId}`);
            log.info(`Explorer: https://explorer.hiro.so/txid/${response.data.txId}?chain=testnet`);
          }
          
          if (response.data.success === true || response.data.txId) {
            log.info('Waiting 10 seconds for transaction to be mined...');
            await sleep(10000);
            return true;
          }
        }
      } catch (error: any) {
        if (error.response?.status === 429) {
          log.warn('Rate limit hit, waiting 30 seconds...');
          await sleep(30000);
        } else if (error.response?.status === 500 && error.response?.data?.error?.includes('has enough')) {
          log.success('Address already has sufficient funds!');
          return true;
        } else {
          log.warn(`Faucet error: ${error.response?.data?.error || error.message}`);
        }
      }
      
      // Wait between faucet attempts
      await sleep(5000);
    }
  }
  
  log.error('All faucet attempts failed');
  return false;
}

async function checkBalance(address: string): Promise<number> {
  log.step('💵 Step 3: Checking Balance');
  
  try {
    const response = await axios.get(
      `https://api.testnet.hiro.so/extended/v1/address/${address}/balances`
    );
    
    const balanceMicroSTX = parseInt(response.data.stx.balance);
    const balanceSTX = balanceMicroSTX / 1_000_000;
    
    log.success(`Balance: ${balanceSTX} STX (${balanceMicroSTX} microSTX)`);
    log.info(`Explorer: https://explorer.hiro.so/address/${address}?chain=testnet`);
    
    return balanceSTX;
  } catch (error: any) {
    log.error(`Failed to check balance: ${error.message}`);
    return 0;
  }
}

async function updateEnvFile(privateKey: string, address: string) {
  log.step('📝 Step 4: Updating .env File');
  
  const envPath = path.join(__dirname, '.env');
  const envExamplePath = path.join(__dirname, '.env.example');
  
  let envContent = '';
  
  // Read .env.example as template
  if (fs.existsSync(envExamplePath)) {
    envContent = fs.readFileSync(envExamplePath, 'utf8');
  }
  
  // Replace or add values
  const updates: Record<string, string> = {
    STACKS_NETWORK: 'testnet',
    STACKS_PRIVATE_KEY: privateKey,
    STACKS_ADDRESS: address,
    PORT: '3000',
    API_BASE_URL: 'http://localhost:3000',
  };
  
  for (const [key, value] of Object.entries(updates)) {
    const regex = new RegExp(`^${key}=.*$`, 'm');
    if (envContent.match(regex)) {
      envContent = envContent.replace(regex, `${key}=${value}`);
    } else {
      envContent += `\n${key}=${value}`;
    }
  }
  
  // Write to .env
  fs.writeFileSync(envPath, envContent.trim() + '\n');
  log.success(`.env file updated at: ${envPath}`);
  
  // Show what was written
  console.log('\n' + colors.cyan + '━'.repeat(60) + colors.reset);
  console.log(colors.bright + '.env Contents:' + colors.reset);
  console.log(colors.cyan + '━'.repeat(60) + colors.reset);
  console.log(envContent.trim());
  console.log(colors.cyan + '━'.repeat(60) + colors.reset + '\n');
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
  console.log('\n' + colors.cyan + colors.bright);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  🚀 Agent402 Testnet Wallet Setup');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(colors.reset);
  
  try {
    // Step 1: Generate wallet
    const { privateKey, address } = await generateWallet();
    
    // Step 2: Fund wallet
    const funded = await fundWallet(address);
    
    if (!funded) {
      log.warn('Faucet funding failed, but continuing...');
      log.info('You can manually request funds at:');
      log.info(`https://explorer.hiro.so/sandbox/faucet?chain=testnet`);
    }
    
    // Step 3: Check balance
    const balance = await checkBalance(address);
    
    // Step 4: Update .env
    await updateEnvFile(privateKey, address);
    
    // Final summary
    console.log('\n' + colors.green + colors.bright);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('  ✅ Setup Complete!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(colors.reset);
    
    console.log(`\n${colors.bright}Your Testnet Wallet:${colors.reset}`);
    console.log(`  Address: ${colors.cyan}${address}${colors.reset}`);
    console.log(`  Balance: ${colors.green}${balance} STX${colors.reset}`);
    console.log(`  Explorer: ${colors.blue}https://explorer.hiro.so/address/${address}?chain=testnet${colors.reset}`);
    
    console.log(`\n${colors.bright}Next Steps:${colors.reset}`);
    console.log(`  1. Run demo: ${colors.cyan}npm run demo${colors.reset}`);
    console.log(`  2. Or start server: ${colors.cyan}npm run server${colors.reset}`);
    console.log(`  3. Or run agent: ${colors.cyan}npm run agent${colors.reset}`);
    
    if (balance < 0.1) {
      console.log(`\n${colors.yellow}⚠️  Balance is low. Get more testnet STX:${colors.reset}`);
      console.log(`     ${colors.blue}https://explorer.hiro.so/sandbox/faucet?chain=testnet${colors.reset}`);
    }
    
    console.log('');
    
  } catch (error: any) {
    log.error(`Setup failed: ${error.message}`);
    console.error(error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

export { generateWallet, fundWallet, checkBalance, updateEnvFile };

import { Agent402 } from './client/index';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

async function startServer(): Promise<void> {
  console.log(`🚀 Starting Agent402 Demo...\n`);
  console.log(`Starting server in background...`);
  
  // Start server in background
  const serverProcess = exec('npm run server');
  
  // Wait for server to be ready
  await new Promise(resolve => setTimeout(resolve, 3000));
  console.log(`✅ Server ready\n`);
}

async function runDemo() {
  try {
    await startServer();

    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`🔍 Agent402 Research Demo (Stacks Testnet)`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

    const agent = new Agent402();
    const topic = process.argv[2] || 'HTTP 402 protocol';
    
    console.log(`📝 Topic: "${topic}"\n`);

    const report = await agent.research(topic);

    console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`📋 Final Research Report`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
    console.log(`Topic: ${report.topic}`);
    console.log(`Sources: ${report.sources.length} research papers`);
    console.log(`Citations: ${report.citations.length || 'none'}`);
    console.log(`\n📄 Summary:\n${report.summary}\n`);
    
    if (report.sources.length > 0) {
      console.log(`📚 Top Sources:`);
      report.sources.slice(0, 3).forEach((source, i) => {
        console.log(`  ${i + 1}. ${source.title}`);
        console.log(`     ${source.url}`);
      });
      console.log(``);
    }

    console.log(`💰 Cost Breakdown:`);
    console.log(`  Search:     ${report.costBreakdown.search.toFixed(3)} STX`);
    console.log(`  Summarize:  ${report.costBreakdown.summarize.toFixed(3)} STX`);
    console.log(`  Citations:  ${report.costBreakdown.citations.toFixed(3)} STX`);
    console.log(`  ─────────────────────`);
    console.log(`  Total:      ${report.totalCost.toFixed(3)} STX`);
    console.log(`\n⏱️  Completed at: ${new Date(report.timestamp).toLocaleString()}`);
    console.log(`🌐 Network: Stacks Testnet`);
    console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

    process.exit(0);
  } catch (error: any) {
    console.error(`\n❌ Demo failed:`, error.message);
    process.exit(1);
  }
}

runDemo();

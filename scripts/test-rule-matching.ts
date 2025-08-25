import { prisma } from '../lib/core/database/client';
import { ruleEngine } from '../lib/core/database/rule-engine';

async function main() {
  // Get a few processed transactions
  const transactions = await prisma.processedTransaction.findMany({
    take: 5,
    include: { transaction: true }
  });
  
  if (transactions.length === 0) {
    console.log('No transactions found');
    return;
  }
  
  const ids = transactions.map((t: any) => t.id);
  console.log(`Testing with ${ids.length} transactions`);
  
  // Test the generateSuggestions function
  const result = await ruleEngine.generateSuggestions(ids);
  
  console.log('\nResult:');
  console.log(`- Processed: ${result.processed}`);
  console.log(`- Matched: ${result.matched}`);
  console.log(`- New suggestions created: ${result.suggested}`);
  
  // Check current suggestions for these transactions
  for (const id of ids) {
    const suggestions = await prisma.transactionSuggestion.findMany({
      where: { processedTransactionId: id },
      include: {
        suggestedCategory: true,
        rule: true
      }
    });
    
    console.log(`\nTransaction ${id}:`);
    if (suggestions.length === 0) {
      console.log('  No suggestions');
    } else {
      suggestions.forEach((s: any) => {
        console.log(`  - Rule: ${s.rule?.name || s.ruleId}, Category: ${s.suggestedCategory?.name}, Applied: ${s.isApplied}`);
      });
    }
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
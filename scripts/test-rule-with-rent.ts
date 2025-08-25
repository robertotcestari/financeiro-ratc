import { prisma } from '../lib/core/database/client';
import { ruleEngine } from '../lib/core/database/rule-engine';

async function main() {
  // Find rules related to rent
  const rentRules = await prisma.categorizationRule.findMany({
    where: {
      isActive: true,
      OR: [
        { name: { contains: 'rent' } },
        { name: { contains: 'aluguel' } }
      ]
    }
  });
  
  console.log(`Found ${rentRules.length} rent-related rules:`);
  rentRules.forEach((r: any) => {
    console.log(`- ${r.name}: category=${r.categoryId}, criteria=${JSON.stringify(r.criteria)}`);
  });
  
  // Find transactions that might match rent patterns
  const transactions = await prisma.processedTransaction.findMany({
    where: {
      transaction: {
        OR: [
          { description: { contains: 'aluguel' } },
          { description: { contains: 'imobiliaria' } },
          { description: { contains: 'ligia' } },
          { description: { contains: 'jair' } },
          { description: { contains: 'Aluguel' } },
          { description: { contains: 'ALUGUEL' } }
        ]
      }
    },
    take: 5,
    include: { transaction: true }
  });
  
  if (transactions.length === 0) {
    console.log('\nNo rent-related transactions found');
    return;
  }
  
  console.log(`\nTesting with ${transactions.length} rent-related transactions:`);
  transactions.forEach((t: any) => {
    console.log(`- ${t.id}: ${t.transaction?.description} (${t.transaction?.amount})`);
  });
  
  const ids = transactions.map((t: any) => t.id);
  
  // Test the generateSuggestions function
  console.log('\n=== Running generateSuggestions ===');
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
    
    const tx = transactions.find((t: any) => t.id === id);
    console.log(`\nTransaction ${id} (${tx?.transaction?.description}):`);
    if (suggestions.length === 0) {
      console.log('  No suggestions');
    } else {
      suggestions.forEach((s: any) => {
        console.log(`  - Rule: ${s.rule?.name || s.ruleId}, Category: ${s.suggestedCategory?.name}, Applied: ${s.isApplied}, Source: ${s.source}`);
      });
    }
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
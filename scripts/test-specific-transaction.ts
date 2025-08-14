import { prisma } from '@/lib/database/client';

async function testSpecificTransaction() {
  console.log('=== TEST SPECIFIC TRANSACTION ===\n');
  
  // Pegar uma transação específica que sabemos que tem sugestão de IA
  const transactionId = 'cme8xylx105lhzphim8a74xje'; // TED-581544
  
  // 1. Buscar a transação processada com todas as informações
  const processedTransaction = await prisma.processedTransaction.findUnique({
    where: { id: transactionId },
    include: {
      transaction: {
        include: {
          bankAccount: true,
        },
      },
      category: {
        include: {
          parent: true,
        },
      },
      property: true,
      suggestions: {
        include: {
          rule: true,
          suggestedCategory: {
            select: { 
              id: true, 
              name: true, 
              type: true,
              parent: { select: { name: true } },
            },
          },
          suggestedProperty: {
            select: { id: true, code: true, city: true },
          },
        },
        where: { isApplied: false },
        orderBy: [
          { confidence: 'desc' },
          { createdAt: 'desc' },
        ],
      },
    },
  });
  
  if (!processedTransaction) {
    console.log('Transaction not found!');
    return;
  }
  
  console.log('Transaction found:');
  console.log('  ID:', processedTransaction.id);
  console.log('  Description:', processedTransaction.transaction?.description);
  console.log('  Amount:', processedTransaction.transaction?.amount);
  console.log('  Category:', processedTransaction.category?.name || 'None');
  console.log('  Property:', processedTransaction.property?.code || 'None');
  console.log('  Is Reviewed:', processedTransaction.isReviewed);
  
  console.log('\nSuggestions (not applied):');
  if (processedTransaction.suggestions.length === 0) {
    console.log('  No suggestions found!');
  } else {
    processedTransaction.suggestions.forEach((s, i) => {
      console.log(`\n  ${i + 1}. Suggestion ID: ${s.id}`);
      console.log(`     Source: ${s.source}`);
      console.log(`     Confidence: ${s.confidence}`);
      console.log(`     Suggested Category: ${s.suggestedCategory?.name || 'N/A'}`);
      console.log(`     Suggested Property: ${s.suggestedProperty?.code || 'N/A'}`);
      console.log(`     Has Rule: ${s.ruleId ? 'Yes' : 'No'}`);
      console.log(`     Has AI Metadata: ${s.aiMetadata ? 'Yes' : 'No'}`);
      console.log(`     Reasoning: ${s.reasoning || 'N/A'}`);
      console.log(`     Is Applied: ${s.isApplied}`);
      console.log(`     Created At: ${s.createdAt.toISOString()}`);
    });
  }
  
  // 2. Buscar TODAS as sugestões para essa transação (incluindo aplicadas)
  const allSuggestions = await prisma.transactionSuggestion.findMany({
    where: { processedTransactionId: transactionId },
    orderBy: { createdAt: 'desc' },
  });
  
  console.log(`\n\nAll suggestions for this transaction: ${allSuggestions.length}`);
  allSuggestions.forEach((s, i) => {
    console.log(`  ${i + 1}. ID: ${s.id}, Source: ${s.source}, Applied: ${s.isApplied}, Created: ${s.createdAt.toISOString()}`);
  });
  
  // 3. Simular a mesma query que é feita na página
  const pageQuery = await prisma.processedTransaction.findMany({
    where: {
      id: transactionId,
    },
    include: {
      transaction: {
        include: {
          bankAccount: true,
        },
      },
      category: {
        include: {
          parent: true,
        },
      },
      property: true,
      suggestions: {
        select: {
          id: true,
          confidence: true,
          createdAt: true,
          source: true,
          reasoning: true,
          rule: true,
          suggestedCategory: {
            select: { 
              id: true, 
              name: true, 
              type: true,
              parent: { select: { name: true } }
            }
          },
          suggestedProperty: {
            select: { id: true, code: true, city: true }
          },
        },
        where: { isApplied: false },
        orderBy: [
          { confidence: 'desc' },
          { createdAt: 'desc' },
        ],
      },
    },
  });
  
  console.log('\n\nPage query result:');
  console.log('Transactions found:', pageQuery.length);
  if (pageQuery.length > 0) {
    const t = pageQuery[0];
    console.log('Suggestions in page query:', t.suggestions.length);
    t.suggestions.forEach((s, i) => {
      console.log(`  ${i + 1}. Source: ${s.source}, Confidence: ${s.confidence}`);
    });
  }
}

testSpecificTransaction()
  .then(() => {
    console.log('\n=== TEST COMPLETE ===');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Error:', error);
    process.exit(1);
  });
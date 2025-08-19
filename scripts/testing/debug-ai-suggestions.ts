import { prisma } from '@/lib/core/database/client';

async function debugAISuggestions() {
  console.log('=== DEBUG AI SUGGESTIONS ===\n');
  
  // 1. Verificar quantas sugestões de IA existem no banco
  const aiSuggestions = await prisma.transactionSuggestion.findMany({
    where: { source: 'AI' },
    include: {
      processedTransaction: {
        include: {
          transaction: true
        }
      },
      suggestedCategory: true,
      suggestedProperty: true,
    }
  });
  
  console.log(`Total de sugestões de IA no banco: ${aiSuggestions.length}`);
  
  if (aiSuggestions.length > 0) {
    console.log('\nPrimeiras 5 sugestões de IA:');
    aiSuggestions.slice(0, 5).forEach((s, i) => {
      console.log(`\n${i + 1}. Sugestão ID: ${s.id}`);
      console.log(`   Transaction ID: ${s.processedTransactionId}`);
      console.log(`   Description: ${s.processedTransaction?.transaction?.description}`);
      console.log(`   Source: ${s.source}`);
      console.log(`   Category: ${s.suggestedCategory?.name || 'N/A'}`);
      console.log(`   Property: ${s.suggestedProperty?.code || 'N/A'}`);
      console.log(`   Confidence: ${s.confidence}`);
      console.log(`   Applied: ${s.isApplied}`);
      console.log(`   AI Metadata: ${JSON.stringify(s.aiMetadata)}`);
    });
  }
  
  // 2. Verificar transações que têm sugestões
  const transactionsWithSuggestions = await prisma.processedTransaction.findMany({
    where: {
      suggestions: {
        some: {
          source: 'AI',
          isApplied: false
        }
      }
    },
    include: {
      transaction: true,
      suggestions: {
        where: { source: 'AI' }
      }
    },
    take: 10
  });
  
  console.log(`\n\nTransações com sugestões de IA não aplicadas: ${transactionsWithSuggestions.length}`);
  
  if (transactionsWithSuggestions.length > 0) {
    console.log('\nPrimeiras transações:');
    transactionsWithSuggestions.forEach((t, i) => {
      console.log(`\n${i + 1}. Transaction: ${t.transaction?.description}`);
      console.log(`   ProcessedTransaction ID: ${t.id}`);
      console.log(`   Número de sugestões de IA: ${t.suggestions.length}`);
      t.suggestions.forEach((s, j) => {
        console.log(`   ${j + 1}) Source: ${s.source}, Confidence: ${s.confidence}, Applied: ${s.isApplied}`);
      });
    });
  }
  
  // 3. Verificar últimas sugestões criadas (independente do source)
  const recentSuggestions = await prisma.transactionSuggestion.findMany({
    orderBy: { createdAt: 'desc' },
    take: 10,
    include: {
      processedTransaction: {
        include: {
          transaction: true
        }
      }
    }
  });
  
  console.log(`\n\nÚltimas 10 sugestões criadas (qualquer tipo):`);
  recentSuggestions.forEach((s, i) => {
    console.log(`\n${i + 1}. Created: ${s.createdAt.toISOString()}`);
    console.log(`   Source: ${s.source}`);
    console.log(`   Transaction: ${s.processedTransaction?.transaction?.description}`);
    console.log(`   Has AI Metadata: ${s.aiMetadata ? 'Yes' : 'No'}`);
    console.log(`   Has Rule: ${s.ruleId ? 'Yes' : 'No'}`);
  });
}

debugAISuggestions()
  .then(() => {
    console.log('\n=== DEBUG COMPLETE ===');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Error:', error);
    process.exit(1);
  });
/**
 * Script para testar o logging das requisições OpenAI
 * Execute com: npx tsx scripts/test-ai-logging.ts
 */

import { AICategorizationService } from '../lib/ai/categorization-service';
import { prisma } from '../lib/database/client';
import { logger } from '../lib/logger';

async function testAILogging() {
  console.log('🤖 Testando logging de requisições OpenAI...\n');
  
  try {
    // Buscar uma transação não categorizada para teste
    const uncategorizedTransaction = await prisma.processedTransaction.findFirst({
      where: {
        categoryId: null,
      },
      include: {
        transaction: {
          include: {
            bankAccount: true,
          },
        },
      },
    });

    if (!uncategorizedTransaction) {
      logger.warn('Nenhuma transação não categorizada encontrada para teste');
      console.log('❌ Não há transações não categorizadas no banco de dados.');
      console.log('   Importe um arquivo OFX primeiro para ter transações para testar.');
      return;
    }

    logger.info('Transação encontrada para teste', {
      transactionId: uncategorizedTransaction.id,
      description: uncategorizedTransaction.transaction?.description,
    });

    console.log('📝 Transação encontrada:');
    console.log(`   ID: ${uncategorizedTransaction.id}`);
    console.log(`   Descrição: ${uncategorizedTransaction.transaction?.description}`);
    console.log(`   Valor: R$ ${uncategorizedTransaction.transaction?.amount}`);
    console.log('\n🚀 Iniciando sugestão de IA...\n');

    // Criar instância do serviço
    const aiService = new AICategorizationService('gpt-4o-mini');

    // Gerar sugestão
    const suggestion = await aiService.generateSuggestion({
      id: uncategorizedTransaction.id,
      transactionId: uncategorizedTransaction.transactionId,
      categoryId: uncategorizedTransaction.categoryId,
      propertyId: uncategorizedTransaction.propertyId,
      dateProcessed: uncategorizedTransaction.dateProcessed,
      transaction: uncategorizedTransaction.transaction,
    });

    if (suggestion) {
      console.log('\n✅ Sugestão gerada com sucesso!');
      console.log('   Categoria sugerida:', suggestion.suggestedCategoryId);
      console.log('   Propriedade sugerida:', suggestion.suggestedPropertyId || 'Nenhuma');
      console.log('   Confiança:', suggestion.confidence);
      console.log('   Reasoning:', suggestion.reasoning);
    } else {
      console.log('\n❌ Falha ao gerar sugestão');
    }

    console.log('\n📊 Verifique os logs acima para ver:');
    console.log('   - Request body enviado para OpenAI');
    console.log('   - Response recebido');
    console.log('   - Tempo de processamento');
    console.log('   - Qualquer erro ou retry');

  } catch (error) {
    logger.error('Erro no teste de AI logging', { error });
    console.error('❌ Erro durante o teste:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Executar o teste
testAILogging()
  .then(() => {
    console.log('\n🎉 Teste concluído!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Erro fatal:', error);
    process.exit(1);
  });
#!/usr/bin/env tsx

/**
 * Test script for AI categorization
 * Run with: npm run test:ai or tsx scripts/test-ai-categorization.ts
 */

import { prisma } from '@/lib/core/database/client';
import { AICategorizationService } from '@/lib/features/ai/categorization-service';
import { createAISuggestion } from '@/lib/core/database/suggestions';

async function testAICategorization() {
  console.log('🚀 Testing AI Categorization Service...\n');

  try {
    // Initialize AI service
    const aiService = new AICategorizationService();
    console.log('✅ AI Service initialized\n');

    // Get a sample uncategorized transaction
    const sampleTransaction = await prisma.processedTransaction.findFirst({
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

    if (!sampleTransaction) {
      console.log('⚠️  No uncategorized transactions found. Creating a test transaction...\n');
      
      // Create a test transaction
      const bankAccount = await prisma.bankAccount.findFirst();
      if (!bankAccount) {
        console.error('❌ No bank accounts found. Please seed the database first.');
        process.exit(1);
      }

      const testTransaction = await prisma.transaction.create({
        data: {
          bankAccountId: bankAccount.id,
          date: new Date(),
          description: 'CONDOMINIO ED BRASIL - CATANDUVA',
          amount: -500.00,
        },
      });

      const processedTransaction = await prisma.processedTransaction.create({
        data: {
          transactionId: testTransaction.id,
          year: new Date().getFullYear(),
          month: new Date().getMonth() + 1,
        },
        include: {
          transaction: {
            include: {
              bankAccount: true,
            },
          },
        },
      });

      console.log('✅ Test transaction created\n');
      console.log('Transaction details:');
      console.log(`  - Description: ${testTransaction.description}`);
      console.log(`  - Amount: R$ ${testTransaction.amount}`);
      console.log(`  - Bank Account: ${bankAccount.name}\n`);

      // Generate AI suggestion
      console.log('🤖 Generating AI suggestion...\n');
      const suggestion = await aiService.generateSuggestion({
        ...processedTransaction,
        transaction: {
          description: testTransaction.description,
          amount: testTransaction.amount.toNumber(),
          date: testTransaction.date,
          bankAccount: {
            name: bankAccount.name,
            accountType: bankAccount.accountType,
          },
        },
      });

      if (suggestion) {
        console.log('✅ AI Suggestion generated!\n');
        console.log('Suggestion details:');
        console.log(`  - Category ID: ${suggestion.suggestedCategoryId}`);
        console.log(`  - Property ID: ${suggestion.suggestedPropertyId || 'None'}`);
        console.log(`  - Confidence: ${(suggestion.confidence * 100).toFixed(0)}%`);
        console.log(`  - Reasoning: ${suggestion.reasoning}`);
        console.log(`  - Model: ${suggestion.metadata.modelUsed}`);
        console.log(`  - Processing Time: ${suggestion.metadata.processingTime}ms\n`);

        // Save suggestion to database
        const saved = await createAISuggestion(suggestion);
        console.log(`✅ AI Suggestion saved to database with ID: ${saved.id}\n`);
      } else {
        console.error('❌ Failed to generate AI suggestion');
      }

      // Clean up test data
      await prisma.processedTransaction.delete({ where: { id: processedTransaction.id } });
      await prisma.transaction.delete({ where: { id: testTransaction.id } });
      console.log('🧹 Test data cleaned up\n');

    } else {
      console.log('Found uncategorized transaction:');
      console.log(`  - ID: ${sampleTransaction.id}`);
      console.log(`  - Description: ${sampleTransaction.transaction?.description}`);
      console.log(`  - Amount: R$ ${sampleTransaction.transaction?.amount}`);
      console.log(`  - Date: ${sampleTransaction.transaction?.date}\n`);

      // Generate AI suggestion
      console.log('🤖 Generating AI suggestion...\n');
      const suggestion = await aiService.generateSuggestion({
        ...sampleTransaction,
        transaction: sampleTransaction.transaction ? {
          description: sampleTransaction.transaction.description,
          amount: sampleTransaction.transaction.amount.toNumber(),
          date: sampleTransaction.transaction.date,
          bankAccount: {
            name: sampleTransaction.transaction.bankAccount.name,
            accountType: sampleTransaction.transaction.bankAccount.accountType,
          },
        } : undefined,
      });

      if (suggestion) {
        console.log('✅ AI Suggestion generated!\n');
        console.log('Suggestion details:');
        console.log(`  - Category ID: ${suggestion.suggestedCategoryId}`);
        console.log(`  - Property ID: ${suggestion.suggestedPropertyId || 'None'}`);
        console.log(`  - Confidence: ${(suggestion.confidence * 100).toFixed(0)}%`);
        console.log(`  - Reasoning: ${suggestion.reasoning}`);
        console.log(`  - Model: ${suggestion.metadata.modelUsed}`);
        console.log(`  - Processing Time: ${suggestion.metadata.processingTime}ms\n`);

        // Save suggestion to database
        const saved = await createAISuggestion(suggestion);
        console.log(`✅ AI Suggestion saved to database with ID: ${saved.id}\n`);
      } else {
        console.error('❌ Failed to generate AI suggestion');
      }
    }

    console.log('✅ AI Categorization test completed successfully!');
  } catch (error) {
    console.error('❌ Error during test:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the test
testAICategorization().catch(console.error);
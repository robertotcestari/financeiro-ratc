#!/usr/bin/env node

import { AICategorizationService } from './lib/ai/categorization-service.js';
import { prisma } from './lib/database/client.js';

// Simple test to verify AI categorization works
async function testAICategorization() {
  try {
    console.log('Testing AI Categorization...');
    
    // Get a few transactions to test
    const transactions = await prisma.processedTransaction.findMany({
      where: {
        categoryId: null, // Get uncategorized transactions
      },
      include: {
        transaction: {
          include: {
            bankAccount: true,
          },
        },
      },
      take: 2,
    });

    if (transactions.length === 0) {
      console.log('No uncategorized transactions found for testing');
      return;
    }

    console.log(`Found ${transactions.length} transactions to test`);

    // Initialize AI service
    const aiService = new AICategorizationService();

    // Generate suggestions
    console.log('Generating AI suggestions...');
    const suggestions = await aiService.generateBulkSuggestions(transactions);

    console.log(`Generated ${suggestions.length} suggestions:`);
    suggestions.forEach((suggestion, index) => {
      console.log(`\n${index + 1}. Transaction ID: ${suggestion.processedTransactionId}`);
      console.log(`   Category: ${suggestion.suggestedCategoryId}`);
      console.log(`   Property: ${suggestion.suggestedPropertyId || 'None'}`);
      console.log(`   Confidence: ${(suggestion.confidence * 100).toFixed(0)}%`);
      console.log(`   Reasoning: ${suggestion.reasoning}`);
    });

    console.log('\n✅ AI Categorization test completed successfully!');
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testAICategorization();
#!/usr/bin/env node

import { prisma } from './lib/database/client.js';
import { applySuggestion, dismissSuggestion } from './lib/database/suggestions.js';

// Test AI suggestion approval and rejection workflow
async function testAISuggestionWorkflow() {
  try {
    console.log('Testing AI Suggestion Approval/Rejection Workflow...\n');
    
    // Find an AI suggestion
    const aiSuggestion = await prisma.transactionSuggestion.findFirst({
      where: {
        source: 'AI',
        isApplied: false,
      },
      include: {
        suggestedCategory: true,
        suggestedProperty: true,
        processedTransaction: {
          include: {
            transaction: true,
          },
        },
      },
    });

    if (!aiSuggestion) {
      console.log('No AI suggestions found. Please generate some AI suggestions first.');
      return;
    }

    console.log('Found AI Suggestion:');
    console.log(`  Transaction: ${aiSuggestion.processedTransaction.transaction.description}`);
    console.log(`  Suggested Category: ${aiSuggestion.suggestedCategory?.name || 'None'}`);
    console.log(`  Suggested Property: ${aiSuggestion.suggestedProperty?.code || 'None'}`);
    console.log(`  Confidence: ${(aiSuggestion.confidence * 100).toFixed(0)}%`);
    console.log(`  AI Metadata:`, aiSuggestion.aiMetadata);

    // Test 1: Apply the suggestion
    console.log('\n--- Test 1: Applying AI Suggestion ---');
    await applySuggestion(aiSuggestion.id);
    
    // Verify it was applied
    const appliedSuggestion = await prisma.transactionSuggestion.findUnique({
      where: { id: aiSuggestion.id },
    });
    
    const updatedTransaction = await prisma.processedTransaction.findUnique({
      where: { id: aiSuggestion.processedTransactionId },
      include: {
        category: true,
        property: true,
      },
    });

    console.log('✅ Suggestion applied successfully!');
    console.log(`  isApplied: ${appliedSuggestion.isApplied}`);
    console.log(`  appliedAt: ${appliedSuggestion.appliedAt}`);
    console.log(`  Transaction Category: ${updatedTransaction.category?.name || 'None'}`);
    console.log(`  Transaction Property: ${updatedTransaction.property?.code || 'None'}`);

    // Test 2: Try to dismiss an applied suggestion (should fail)
    console.log('\n--- Test 2: Attempting to dismiss applied suggestion ---');
    try {
      await dismissSuggestion(aiSuggestion.id);
      console.log('❌ Should have failed to dismiss applied suggestion');
    } catch (error) {
      console.log('✅ Correctly failed to dismiss applied suggestion');
    }

    // Test 3: Find another AI suggestion to test dismissal
    const anotherAISuggestion = await prisma.transactionSuggestion.findFirst({
      where: {
        source: 'AI',
        isApplied: false,
        id: { not: aiSuggestion.id },
      },
    });

    if (anotherAISuggestion) {
      console.log('\n--- Test 3: Dismissing AI Suggestion ---');
      await dismissSuggestion(anotherAISuggestion.id);
      
      // Verify it was dismissed (deleted)
      const dismissed = await prisma.transactionSuggestion.findUnique({
        where: { id: anotherAISuggestion.id },
      });
      
      if (!dismissed) {
        console.log('✅ Suggestion dismissed (deleted) successfully!');
      } else {
        console.log('❌ Failed to dismiss suggestion');
      }
    } else {
      console.log('\n--- Test 3: No additional AI suggestions to test dismissal ---');
    }

    console.log('\n✅ AI Suggestion workflow tests completed successfully!');
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testAISuggestionWorkflow();
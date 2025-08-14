# Implementation Plan

- [x] 1. Set up AI SDK and basic infrastructure ✅

  - Install and configure Vercel AI SDK with OpenAI provider
  - Create environment variables for OpenAI API key
  - Set up basic project structure for AI categorization components
  - Add Vercel AI SDK (`ai` package) and OpenAI provider to `package.json`
  - Create database migration to add `SuggestionSource` enum (RULE, AI) to schema
  - Extend `TransactionSuggestion` model with `source`, `reasoning`, and `aiMetadata` fields
  - Make `ruleId` optional in `TransactionSuggestion` model
  - Relevant Files:
    - @package.json
    - @schema.prisma
  - _Requirements: 1.1, 1.2_

- [ ] 2. Create AI categorization service

  - Implement AICategorizationService with generateSuggestion method
  - Add logic to create AI-specific CategorizationRule entries
  - Integrate with existing TransactionSuggestion creation workflow
  - Add proper validation of AI responses against available categories and properties
  - Create AI categorization engine that integrates with existing transaction processing
  - Implement batch processing for multiple transactions
  - Add historical pattern analysis using existing categorized transactions
  - Create prompt engineering with categories, properties, and transaction history context
  - _Requirements: 1.2, 1.4, 4.1, 4.2_

- [ ] 3. Integrate AI suggestions into existing suggestion system

  - Add AI suggestion generation actions to `app/transacoes/actions.ts`
  - Create actions for triggering AI categorization on transactions
  - Integrate AI suggestions alongside rule-based suggestions in existing workflows
  - Add proper error handling and response validation
  - AI Suggestions should have a button besides Rule-based suggestions
  - In the suggestion modal, show reasoning and AI source.
  - Ensure AI suggestions work alongside rule-based suggestions
  - Add proper handling of combined rule + AI suggestion scenarios
  - Add generateBulkSuggestions method to AICategorizationService
  - Optimize LLM calls for processing multiple transactions efficiently
  - Add proper error handling and retry logic for batch operations
  - Integrate batch processing into transactions page
  - _Requirements: 1.1, 5.1, 5.2, 5.3 4.4_

- [ ] 4. Add AI suggestion approval and feedback handling

  - Update existing suggestion approval workflow to handle AI suggestions
  - Update `SuggestionIndicator.tsx` to display different icons for AI vs rule suggestions
  - AI Suggestions should have a button besides Rule-based suggestions
  - Modify `SuggestionDialog.tsx` to show AI reasoning and metadata
    Add AI-specific styling and visual indicators in suggestion components
  - Ensure AI suggestions integrate seamlessly with existing suggestion UI
  - Store approval/rejection data for AI suggestions
  - Add reasoning display in suggestion review interface
  - Ensure proper metadata tracking (model used, processing time)
  - _Requirements: 2.1, 2.4, 3.2_

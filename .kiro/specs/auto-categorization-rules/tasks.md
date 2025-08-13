# Implementation Plan

- [ ] 1. Database Schema and Core Infrastructure

  - Create database migration for new tables (CategorizationRule, TransactionSuggestion)
  - Add JSON type for rule criteria storage
  - Create necessary indexes for performance optimization
  - Update Prisma schema and generate new client types
  - _Requirements: 1.1, 2.1, 3.1, 4.1_

- [ ] 2. Rule Engine Core Logic

  - [ ] 2.1 Implement rule criteria evaluation functions

    - Create date criteria evaluation (day ranges, month patterns)
    - Create value criteria evaluation (min, max, ranges, operators)
    - Create description criteria evaluation (keyword matching, AND/OR logic)
    - Create account criteria evaluation
    - _Requirements: 1.1, 2.1, 3.1, 4.1_

  - [ ] 2.2 Build rule engine service

    - Implement transaction evaluation against multiple rules
    - Add rule priority resolution logic
    - Create confidence scoring system
    - Add batch processing capabilities for performance
    - _Requirements: 4.4, 4.5_

  - [ ] 2.3 Create suggestion generation system
    - Implement suggestion creation and storage
    - Add duplicate prevention logic
    - Create batch suggestion generation for multiple transactions
    - Add error handling and partial failure recovery
    - _Requirements: 6.1, 6.2, 6.3_

- [ ] 3. Rule Management Backend Services

  - [ ] 3.1 Implement rule CRUD operations

    - Create rule creation service with validation
    - Implement rule update and deletion services
    - Add rule activation/deactivation functionality
    - Create rule listing and filtering services
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.6_

  - [ ] 3.2 Build rule testing functionality
    - Implement rule preview system to show matching transactions
    - Create rule testing service with transaction limits
    - Add rule validation and criteria checking
    - Implement rule performance analysis
    - _Requirements: 5.5_

- [ ] 4. Server Actions for Rule Management

  - Create server actions for rule CRUD operations (create, update, delete, toggle)
  - Implement rule testing action with transaction preview
  - Add rule validation and error handling
  - Create bulk rule operations (activate/deactivate multiple rules)
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6_

- [ ] 5. Suggestion Management Backend

  - [ ] 5.1 Create suggestion services

    - Implement suggestion retrieval for transactions
    - Create suggestion application service
    - Add suggestion dismissal functionality
    - Implement bulk suggestion operations
    - _Requirements: 7.1, 7.2, 7.4, 7.5_

  - [ ] 5.2 Build suggestion server actions
    - Create actions for applying individual suggestions
    - Implement bulk suggestion application
    - Add suggestion dismissal actions
    - Create suggestion generation actions for selected transactions
    - _Requirements: 7.1, 7.2, 7.4, 7.5, 10.1, 10.2, 10.3_

- [ ] 6. Rule Management User Interface

  - [ ] 6.1 Create rule management page layout

    - Build `/regras-categorizacao` page structure
    - Create rule list component with status indicators
    - Add rule creation form with criteria builder
    - Implement rule editing interface
    - _Requirements: 5.1, 5.2, 5.3, 5.4_

  - [ ] 6.2 Build rule criteria form components

    - Create date criteria input (day ranges, month selection)
    - Build value criteria form (min/max, operators, ranges)
    - Implement description criteria builder (keywords, AND/OR logic)
    - Add account selection component
    - _Requirements: 1.1, 2.1, 3.1, 4.2_

  - [ ] 6.3 Add rule testing and preview functionality
    - Create rule testing interface with transaction preview
    - Implement rule validation feedback
    - Add rule performance indicators
    - Create rule priority management interface
    - _Requirements: 5.5, 4.4_

- [ ] 7. Transaction Interface Enhancements

  - [ ] 7.1 Enhance transaction table with suggestion display

    - Add suggestion indicators to transaction rows
    - Create suggestion action buttons (Apply, Dismiss)
    - Implement visual distinction for transactions with suggestions
    - Add suggestion details tooltip/popover
    - _Requirements: 9.1, 9.2, 9.3, 7.1_

  - [ ] 7.2 Implement bulk suggestion operations

    - Add "Generate Suggestions" action to bulk operations bar
    - Create "Apply Suggestions" bulk action
    - Implement suggestion filtering in transaction filters
    - Add suggestion count indicators
    - _Requirements: 10.1, 10.2, 10.3, 7.4, 9.4, 9.5_

  - [ ] 7.3 Create suggestion management components
    - Build suggestion display component with rule information
    - Create suggestion application confirmation dialogs
    - Implement suggestion dismissal with reason tracking
    - Add suggestion history and audit trail display
    - _Requirements: 7.1, 7.2, 7.3_

- [ ] 8. Integration with OFX Import System

  - Integrate suggestion generation into OFX import workflow
  - Add automatic suggestion generation for newly imported transactions
  - Create import summary with suggestion statistics
  - Implement suggestion generation progress tracking
  - _Requirements: 6.1, 6.2, 6.4_

- [ ] 9. Retroactive Suggestion Generation

  - [ ] 9.1 Build retroactive suggestion system

    - Create interface for applying rules to existing transactions
    - Implement batch processing with progress indicators
    - Add transaction filtering for retroactive application
    - Create preview system for retroactive suggestions
    - _Requirements: 8.1, 8.2, 8.5_

  - [ ] 9.2 Implement retroactive suggestion workflow
    - Add retroactive suggestion generation to rule creation flow
    - Create confirmation dialogs with affected transaction counts
    - Implement batch processing with error handling
    - Add progress tracking and cancellation support
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_

- [ ] 10. Performance Optimization and Indexing

  - Create database indexes for rule evaluation queries
  - Implement query optimization for suggestion generation
  - Add caching for frequently accessed rules
  - Optimize bulk operations with batch processing
  - _Requirements: Performance considerations from design_

- [ ] 11. Testing and Quality Assurance

  - [ ] 11.1 Create unit tests for rule engine

    - Test individual criteria evaluation functions
    - Test rule priority resolution logic
    - Test confidence scoring calculations
    - Test edge cases and error conditions
    - _Requirements: All rule evaluation requirements_

  - [ ] 11.2 Build integration tests

    - Test complete rule creation to suggestion application workflow
    - Test bulk operations with large transaction sets
    - Test retroactive suggestion generation
    - Test UI integration with backend services
    - _Requirements: End-to-end workflow requirements_

  - [ ] 11.3 Implement performance tests
    - Test rule evaluation performance with large datasets
    - Test suggestion generation scalability
    - Test database query performance
    - Test UI responsiveness with many suggestions
    - _Requirements: Performance and scalability requirements_

- [ ] 12. Documentation and User Experience

  - Create user documentation for rule creation and management
  - Add inline help and tooltips for rule criteria
  - Create rule examples and templates for common use cases
  - Implement error messages and validation feedback
  - _Requirements: User experience and usability requirements_

- [ ] 13. Final Integration and Polish

  - [ ] 13.1 Complete system integration

    - Integrate all components into cohesive workflow
    - Test complete user journeys from rule creation to suggestion application
    - Verify backward compatibility with existing categorization workflow
    - Implement final UI polish and responsive design
    - _Requirements: All integration requirements_

  - [ ] 13.2 Production readiness
    - Add monitoring and logging for rule operations
    - Implement error tracking and alerting
    - Create database migration scripts for production deployment
    - Add feature flags for gradual rollout
    - _Requirements: Production deployment requirements_

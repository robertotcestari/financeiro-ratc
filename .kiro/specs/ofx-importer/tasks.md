# Implementation Plan

- [x] 1. Set up OFX parsing infrastructure and core types

  - Create TypeScript interfaces for OFX data structures (OFXAccount, OFXTransaction, OFXParseResult)
  - Implement OFX file format detection (SGML vs XML)
  - Create basic OFX parser service with validation methods
  - Write unit tests for format detection and basic parsing
  - _Requirements: 6.1, 6.2, 6.3_

- [x] 2. Implement OFX file parsing for both SGML and XML formats

  - Create SGML parser for OFX 1.x format using regex-based parsing
  - Create XML parser for OFX 2.x format using DOM parsing
  - Implement transaction extraction from parsed OFX data
  - Handle parsing errors and create detailed error messages
  - Write comprehensive unit tests for both parsing formats
  - _Requirements: 1.1, 1.2, 6.1, 6.2, 6.4_

- [x] 3. Create database schema extensions for OFX support

  - Add migration to extend Transaction table with ofxTransId and ofxAccountId fields
  - Create OFXAccountMapping table with proper foreign key relationships
  - Extend ImportBatch table with OFX-specific metadata fields
  - Update Prisma schema to reflect new database structure
  - Generate new Prisma client with updated types
  - _Requirements: 2.4, 5.5_

- [x] 4. Implement account selection service

  - Create service to retrieve all available bank accounts for user selection
  - Implement account validation to ensure selected account exists and is accessible
  - Create service method to handle new bank account creation during import
  - Build account selection persistence for import preview
  - Write unit tests for account selection and validation logic
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

- [x] 5. Build duplicate detection system

  - Implement duplicate detection logic comparing date, amount, and description
  - Create confidence scoring system for potential duplicates
  - Handle OFX transaction ID matching for exact duplicate detection
  - Build duplicate preview functionality for user review
  - Write unit tests for duplicate detection algorithms
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [x] 6. Create import preview and validation system

  - Build import preview service that processes OFX data without saving
  - Implement transaction validation and error collection
  - Create preview data structures for UI display
  - Add automatic categorization integration for preview
  - Write unit tests for preview generation and validation
  - _Requirements: 1.3, 4.4, 5.1, 5.2_

- [x] 7. Implement core import service orchestration

  - Create main import service that coordinates all import steps
  - Implement transaction-based import execution with rollback capability
  - Add import batch creation and tracking
  - Build import summary generation with detailed statistics
  - Write integration tests for complete import flow
  - _Requirements: 1.5, 5.1, 5.2, 5.3, 5.4_

- [x] 8. Build file upload and validation UI components

  - Create file upload component with OFX file type validation
  - Implement drag-and-drop file upload functionality
  - Add file size and format validation with user feedback
  - Create loading states and progress indicators
  - Write component tests for upload functionality
  - _Requirements: 1.1, 1.4, 6.3_

- [x] 9. Create account selection UI interface

  - Build account selection interface with dropdown of all available bank accounts
  - Implement search/filter functionality for easy account finding
  - Add "Create New Account" option with inline form
  - Create account selection validation and error handling
  - Write component tests for account selection interface
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

- [ ] 10. Implement import preview and review UI

  - Create transaction preview table with categorization display
  - Build duplicate detection UI with highlight and skip options
  - Implement category modification interface in preview
  - Add import confirmation dialog with summary statistics
  - Write component tests for preview and review interfaces
  - _Requirements: 1.3, 3.2, 3.3, 4.4, 5.1_

- [ ] 11. Build import results and summary UI

  - Create import summary display with success/failure statistics
  - Implement error display with detailed error messages and affected transactions
  - Add navigation to view imported transactions
  - Create import history view showing past OFX imports
  - Write component tests for results and summary displays
  - _Requirements: 5.1, 5.2, 5.3, 5.4_

- [ ] 12. Create OFX import page and routing

  - Build main OFX import page with step-by-step wizard interface
  - Implement routing and navigation between import steps
  - Add breadcrumb navigation and step indicators
  - Integrate all UI components into cohesive import flow
  - Write end-to-end tests for complete import user journey
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

- [ ] 13. Add automatic categorization integration

  - Integrate existing categorization service with OFX import preview
  - Implement OFX transaction type to category mapping rules
  - Add category suggestion based on transaction descriptions and types
  - Create categorization confidence scoring for preview display
  - Write unit tests for OFX-specific categorization logic
  - _Requirements: 4.1, 4.2, 4.3, 4.4_

- [ ] 14. Implement comprehensive error handling and logging

  - Add structured error handling throughout import pipeline
  - Implement detailed logging for import operations and errors
  - Create user-friendly error messages for common failure scenarios
  - Add error recovery mechanisms where possible
  - Write tests for error scenarios and recovery flows
  - _Requirements: 1.4, 5.4, 5.5, 6.3_

- [ ] 15. Create sample OFX files and comprehensive testing
  - Generate sample OFX files for both SGML and XML formats
  - Create test files with various account types and transaction scenarios
  - Build test files with intentional errors for negative testing
  - Implement comprehensive integration tests using sample files
  - Add performance tests for large OFX file processing
  - _Requirements: 6.1, 6.2, 6.4, 6.5_

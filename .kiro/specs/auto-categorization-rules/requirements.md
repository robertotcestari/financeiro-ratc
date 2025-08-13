# Requirements Document

## Introduction

This feature introduces an automatic transaction categorization system based on configurable rules for the `/transacoes` page. The system will allow users to create and manage rules that automatically categorize transactions and assign properties based on date patterns, value ranges, and description keywords. This will significantly reduce manual categorization work and improve consistency in transaction processing.

## Requirements

### Requirement 1

**User Story:** As a financial manager, I want to create categorization rules based on transaction dates, so that recurring monthly transactions can be automatically categorized.

#### Acceptance Criteria

1. WHEN I create a date-based rule THEN the system SHALL allow me to specify day ranges (e.g., "up to day 15", "from day 20 to 25")
2. WHEN I create a date-based rule THEN the system SHALL allow me to specify month patterns (e.g., "every month", "specific months")
3. WHEN a transaction matches the date criteria THEN the system SHALL suggest the specified category and property (if configured)
4. IF multiple date rules match a transaction THEN the system SHALL apply the most specific rule (narrower date range takes precedence)

### Requirement 2

**User Story:** As a financial manager, I want to create categorization rules based on transaction values, so that transactions above or below certain thresholds are automatically categorized.

#### Acceptance Criteria

1. WHEN I create a value-based rule THEN the system SHALL allow me to specify minimum amounts (e.g., "> 500 reais")
2. WHEN I create a value-based rule THEN the system SHALL allow me to specify maximum amounts (e.g., "< 100 reais")
3. WHEN I create a value-based rule THEN the system SHALL allow me to specify value ranges (e.g., "between 100 and 500 reais")
4. WHEN a transaction matches the value criteria THEN the system SHALL suggest the specified category and property (if configured)
5. IF the transaction amount is negative (expense) THEN the system SHALL apply absolute value comparison for rules

### Requirement 3

**User Story:** As a financial manager, I want to create categorization rules based on transaction descriptions, so that transactions with specific keywords are automatically categorized.

#### Acceptance Criteria

1. WHEN I create a description-based rule THEN the system SHALL allow me to specify keywords or phrases to match
2. WHEN I create a description-based rule THEN the system SHALL support case-insensitive matching
3. WHEN I create a description-based rule THEN the system SHALL support partial word matching (contains)
4. WHEN I create a description-based rule THEN the system SHALL allow multiple keywords with AND/OR logic
5. WHEN a transaction description matches the keyword criteria THEN the system SHALL suggest the specified category and property (if configured)

### Requirement 4

**User Story:** As a financial manager, I want to create categorization rules that suggest both category and property assignments, so that transactions can be fully categorized with property associations.

#### Acceptance Criteria

1. WHEN I create a rule THEN the system SHALL allow me to specify a target category (required)
2. WHEN I create a rule THEN the system SHALL allow me to specify a target property (optional)
3. WHEN a rule matches a transaction THEN the system SHALL suggest both the category and property (if configured)
4. WHEN I apply a suggestion THEN the system SHALL set both categoryId and propertyId based on the rule configuration
5. WHEN a rule has no property configured THEN the system SHALL only suggest the category

### Requirement 5

**User Story:** As a financial manager, I want to create complex categorization rules that combine multiple criteria, so that I can create precise categorization logic.

#### Acceptance Criteria

1. WHEN I create a rule THEN the system SHALL allow me to combine date, value, and description criteria with AND logic
2. WHEN I create a rule THEN the system SHALL allow me to specify which bank accounts the rule applies to
3. WHEN multiple criteria are specified THEN ALL criteria MUST match for the rule to apply
4. WHEN a transaction matches multiple rules THEN the system SHALL apply the rule with highest priority
5. IF no priority is set THEN the system SHALL apply the most recently created rule

### Requirement 6

**User Story:** As a financial manager, I want to manage and organize my categorization rules, so that I can maintain an effective rule system.

#### Acceptance Criteria

1. WHEN I access the rules management interface THEN the system SHALL display all existing rules in a list
2. WHEN I view a rule THEN the system SHALL show all criteria, target category, target property (if any), and rule status (active/inactive)
3. WHEN I want to modify a rule THEN the system SHALL allow me to edit all rule parameters
4. WHEN I want to remove a rule THEN the system SHALL allow me to delete it with confirmation
5. WHEN I want to test a rule THEN the system SHALL allow me to preview which transactions would match
6. WHEN I want to organize rules THEN the system SHALL allow me to set priority order and enable/disable rules

### Requirement 7

**User Story:** As a financial manager, I want the system to suggest categorizations based on rules for new transactions, so that I can quickly review and approve the suggestions.

#### Acceptance Criteria

1. WHEN a new transaction is imported via OFX THEN the system SHALL run all active rules against it to generate suggestions
2. WHEN a rule matches a transaction THEN the system SHALL store the suggested category and property (if configured) but NOT automatically apply them
3. WHEN no rules match a transaction THEN the system SHALL leave it without suggestions for manual categorization
4. WHEN I view transactions THEN the system SHALL clearly show which transactions have rule-based suggestions
5. WHEN I view a transaction with suggestions THEN the system SHALL show the suggested category, property (if any), and which rule generated it

### Requirement 8

**User Story:** As a financial manager, I want to quickly apply rule-based suggestions to transactions, so that I can efficiently categorize transactions with human oversight.

#### Acceptance Criteria

1. WHEN a transaction has a rule-based suggestion THEN the system SHALL provide a one-click "Apply Suggestion" action
2. WHEN I apply a suggestion THEN the system SHALL set the categoryId and propertyId (if suggested) and record that it was applied from a rule suggestion
3. WHEN I view the transactions list THEN the system SHALL provide filters for "has suggestions" and "applied from suggestions"
4. WHEN I want to bulk-apply suggestions THEN the system SHALL allow me to select multiple transactions and apply their suggestions at once
5. WHEN I apply suggestions in bulk THEN the system SHALL show a confirmation dialog with the number of transactions to be categorized

### Requirement 9

**User Story:** As a financial manager, I want to generate suggestions for existing transactions using new rules, so that I can efficiently categorize historical data.

#### Acceptance Criteria

1. WHEN I create a new rule THEN the system SHALL offer to generate suggestions for existing uncategorized transactions
2. WHEN I choose to generate suggestions retroactively THEN the system SHALL show a preview of transactions that would get suggestions
3. WHEN I confirm retroactive suggestion generation THEN the system SHALL create suggestions for matching historical transactions
4. WHEN generating suggestions retroactively THEN the system SHALL NOT override existing categorizations or suggestions
5. IF retroactive suggestion generation affects many transactions THEN the system SHALL process them in batches with progress indication

### Requirement 10

**User Story:** As a financial manager, I want clear visual indicators for transactions with rule-based suggestions, so that I can easily identify and process them.

#### Acceptance Criteria

1. WHEN I view the transactions list THEN the system SHALL visually distinguish transactions with suggestions (e.g., with badges or icons)
2. WHEN a transaction has a suggestion THEN the system SHALL show the suggested category name, property name (if any), and the rule that generated it
3. WHEN I hover over a suggestion indicator THEN the system SHALL show a tooltip with rule details
4. WHEN I view transactions THEN the system SHALL provide a "Suggestions" filter to show only transactions with pending suggestions
5. WHEN I sort transactions THEN the system SHALL allow sorting by "has suggestions" to prioritize suggested transactions

### Requirement 11

**User Story:** As a financial manager, I want to select specific transactions and run categorization rules against them, so that I can control exactly which transactions get rule-based suggestions.

#### Acceptance Criteria

1. WHEN I select one or more transactions in the transactions list THEN the system SHALL provide a "Generate Suggestions" action
2. WHEN I click "Generate Suggestions" for selected transactions THEN the system SHALL run all active rules against only those transactions
3. WHEN rules are applied to selected transactions THEN the system SHALL show a summary of how many suggestions were generated
4. WHEN I select transactions that already have suggestions THEN the system SHALL ask if I want to regenerate suggestions or skip them
5. WHEN I select a mix of categorized and uncategorized transactions THEN the system SHALL only generate suggestions for uncategorized ones and show a warning about skipped transactions

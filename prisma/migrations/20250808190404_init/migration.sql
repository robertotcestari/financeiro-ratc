-- CreateTable
CREATE TABLE `bank_accounts` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `bankName` VARCHAR(191) NOT NULL,
    `accountType` ENUM('CHECKING', 'SAVINGS', 'INVESTMENT') NOT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `bank_accounts_name_key`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `categories` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `type` ENUM('INCOME', 'EXPENSE', 'TRANSFER', 'ADJUSTMENT') NOT NULL,
    `parentId` VARCHAR(191) NULL,
    `level` INTEGER NOT NULL,
    `orderIndex` INTEGER NOT NULL,
    `isSystem` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `categories_name_key`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `properties` (
    `id` VARCHAR(191) NOT NULL,
    `code` VARCHAR(191) NOT NULL,
    `city` VARCHAR(191) NOT NULL,
    `address` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `properties_code_key`(`code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `transactions` (
    `id` VARCHAR(191) NOT NULL,
    `bankAccountId` VARCHAR(191) NOT NULL,
    `date` DATETIME(3) NOT NULL,
    `description` VARCHAR(1000) NOT NULL,
    `amount` DECIMAL(15, 2) NOT NULL,
    `balance` DECIMAL(15, 2) NULL,
    `ofxTransId` VARCHAR(191) NULL,
    `importBatchId` VARCHAR(191) NULL,
    `isDuplicate` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `transactions_date_idx`(`date`),
    INDEX `transactions_importBatchId_idx`(`importBatchId`),
    UNIQUE INDEX `transactions_bankAccountId_date_amount_key`(`bankAccountId`, `date`, `amount`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `unified_transactions` (
    `id` VARCHAR(191) NOT NULL,
    `transactionId` VARCHAR(191) NOT NULL,
    `year` INTEGER NOT NULL,
    `month` INTEGER NOT NULL,
    `categoryId` VARCHAR(191) NOT NULL,
    `propertyId` VARCHAR(191) NULL,
    `details` TEXT NULL,
    `notes` TEXT NULL,
    `isTransfer` BOOLEAN NOT NULL DEFAULT false,
    `transferId` VARCHAR(191) NULL,
    `isReviewed` BOOLEAN NOT NULL DEFAULT false,
    `autoCategorized` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `unified_transactions_transactionId_key`(`transactionId`),
    INDEX `unified_transactions_year_month_idx`(`year`, `month`),
    INDEX `unified_transactions_categoryId_idx`(`categoryId`),
    INDEX `unified_transactions_propertyId_idx`(`propertyId`),
    INDEX `unified_transactions_transferId_idx`(`transferId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `transfers` (
    `id` VARCHAR(191) NOT NULL,
    `originTransactionId` VARCHAR(191) NOT NULL,
    `originAccountId` VARCHAR(191) NOT NULL,
    `destinationTransactionId` VARCHAR(191) NULL,
    `destinationAccountId` VARCHAR(191) NOT NULL,
    `amount` DECIMAL(15, 2) NOT NULL,
    `date` DATETIME(3) NOT NULL,
    `description` VARCHAR(191) NULL,
    `isComplete` BOOLEAN NOT NULL DEFAULT false,
    `isManual` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `transfers_originTransactionId_key`(`originTransactionId`),
    UNIQUE INDEX `transfers_destinationTransactionId_key`(`destinationTransactionId`),
    INDEX `transfers_date_idx`(`date`),
    INDEX `transfers_originAccountId_destinationAccountId_idx`(`originAccountId`, `destinationAccountId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `category_rules` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `categoryId` VARCHAR(191) NOT NULL,
    `descriptionPattern` TEXT NULL,
    `minAmount` DECIMAL(15, 2) NULL,
    `maxAmount` DECIMAL(15, 2) NULL,
    `bankAccountId` VARCHAR(191) NULL,
    `isTransferRule` BOOLEAN NOT NULL DEFAULT false,
    `transferAccountId` VARCHAR(191) NULL,
    `propertyId` VARCHAR(191) NULL,
    `priority` INTEGER NOT NULL DEFAULT 0,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `category_rules_name_key`(`name`),
    INDEX `category_rules_priority_idx`(`priority`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `dre_line_items` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `categoryId` VARCHAR(191) NULL,
    `lineType` ENUM('DETAIL', 'SUBTOTAL', 'TOTAL', 'SEPARATOR') NOT NULL,
    `formula` TEXT NULL,
    `orderIndex` INTEGER NOT NULL,
    `level` INTEGER NOT NULL,
    `includeTransfers` BOOLEAN NOT NULL DEFAULT false,
    `showInReport` BOOLEAN NOT NULL DEFAULT true,
    `isBold` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `dre_line_items_orderIndex_idx`(`orderIndex`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `import_batches` (
    `id` VARCHAR(191) NOT NULL,
    `fileName` VARCHAR(191) NOT NULL,
    `fileSize` INTEGER NOT NULL,
    `bankAccountId` VARCHAR(191) NOT NULL,
    `startDate` DATETIME(3) NOT NULL,
    `endDate` DATETIME(3) NOT NULL,
    `transactionCount` INTEGER NOT NULL,
    `status` ENUM('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED') NOT NULL,
    `errorMessage` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `account_balances` (
    `id` VARCHAR(191) NOT NULL,
    `bankAccountId` VARCHAR(191) NOT NULL,
    `date` DATETIME(3) NOT NULL,
    `balance` DECIMAL(15, 2) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `account_balances_date_idx`(`date`),
    UNIQUE INDEX `account_balances_bankAccountId_date_key`(`bankAccountId`, `date`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `categories` ADD CONSTRAINT `categories_parentId_fkey` FOREIGN KEY (`parentId`) REFERENCES `categories`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `transactions` ADD CONSTRAINT `transactions_bankAccountId_fkey` FOREIGN KEY (`bankAccountId`) REFERENCES `bank_accounts`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `transactions` ADD CONSTRAINT `transactions_importBatchId_fkey` FOREIGN KEY (`importBatchId`) REFERENCES `import_batches`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `unified_transactions` ADD CONSTRAINT `unified_transactions_transactionId_fkey` FOREIGN KEY (`transactionId`) REFERENCES `transactions`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `unified_transactions` ADD CONSTRAINT `unified_transactions_categoryId_fkey` FOREIGN KEY (`categoryId`) REFERENCES `categories`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `unified_transactions` ADD CONSTRAINT `unified_transactions_propertyId_fkey` FOREIGN KEY (`propertyId`) REFERENCES `properties`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `unified_transactions` ADD CONSTRAINT `unified_transactions_transferId_fkey` FOREIGN KEY (`transferId`) REFERENCES `transfers`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `transfers` ADD CONSTRAINT `transfers_originTransactionId_fkey` FOREIGN KEY (`originTransactionId`) REFERENCES `transactions`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `transfers` ADD CONSTRAINT `transfers_originAccountId_fkey` FOREIGN KEY (`originAccountId`) REFERENCES `bank_accounts`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `transfers` ADD CONSTRAINT `transfers_destinationTransactionId_fkey` FOREIGN KEY (`destinationTransactionId`) REFERENCES `transactions`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `transfers` ADD CONSTRAINT `transfers_destinationAccountId_fkey` FOREIGN KEY (`destinationAccountId`) REFERENCES `bank_accounts`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `category_rules` ADD CONSTRAINT `category_rules_categoryId_fkey` FOREIGN KEY (`categoryId`) REFERENCES `categories`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `category_rules` ADD CONSTRAINT `category_rules_propertyId_fkey` FOREIGN KEY (`propertyId`) REFERENCES `properties`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `dre_line_items` ADD CONSTRAINT `dre_line_items_categoryId_fkey` FOREIGN KEY (`categoryId`) REFERENCES `categories`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `account_balances` ADD CONSTRAINT `account_balances_bankAccountId_fkey` FOREIGN KEY (`bankAccountId`) REFERENCES `bank_accounts`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

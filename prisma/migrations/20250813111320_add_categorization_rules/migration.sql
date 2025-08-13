-- CreateTable
CREATE TABLE `categorization_rules` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `priority` INTEGER NOT NULL DEFAULT 0,
    `categoryId` VARCHAR(191) NOT NULL,
    `criteria` JSON NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `transaction_suggestions` (
    `id` VARCHAR(191) NOT NULL,
    `processedTransactionId` VARCHAR(191) NOT NULL,
    `ruleId` VARCHAR(191) NOT NULL,
    `suggestedCategoryId` VARCHAR(191) NOT NULL,
    `confidence` DOUBLE NOT NULL DEFAULT 1.0,
    `isApplied` BOOLEAN NOT NULL DEFAULT false,
    `appliedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `transaction_suggestions_processedTransactionId_ruleId_key`(`processedTransactionId`, `ruleId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `categorization_rules` ADD CONSTRAINT `categorization_rules_categoryId_fkey` FOREIGN KEY (`categoryId`) REFERENCES `categories`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `transaction_suggestions` ADD CONSTRAINT `transaction_suggestions_processedTransactionId_fkey` FOREIGN KEY (`processedTransactionId`) REFERENCES `processed_transactions`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `transaction_suggestions` ADD CONSTRAINT `transaction_suggestions_ruleId_fkey` FOREIGN KEY (`ruleId`) REFERENCES `categorization_rules`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `transaction_suggestions` ADD CONSTRAINT `transaction_suggestions_suggestedCategoryId_fkey` FOREIGN KEY (`suggestedCategoryId`) REFERENCES `categories`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

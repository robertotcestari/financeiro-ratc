-- Add OFX support to existing tables and create new OFX mapping table

-- Add OFX fields to transactions table
ALTER TABLE `transactions` ADD COLUMN `ofxAccountId` VARCHAR(191) NULL;

-- Create indexes for OFX fields
CREATE INDEX `transactions_ofxTransId_idx` ON `transactions`(`ofxTransId`);
CREATE INDEX `transactions_ofxAccountId_idx` ON `transactions`(`ofxAccountId`);

-- Create OFX account mappings table
CREATE TABLE `ofx_account_mappings` (
    `id` VARCHAR(191) NOT NULL,
    `ofxAccountId` VARCHAR(191) NOT NULL,
    `ofxBankId` VARCHAR(191) NULL,
    `bankAccountId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `ofx_account_mappings_ofxAccountId_ofxBankId_key`(`ofxAccountId`, `ofxBankId`),
    INDEX `ofx_account_mappings_bankAccountId_idx`(`bankAccountId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Add OFX fields to import_batches table
ALTER TABLE `import_batches` ADD COLUMN `fileType` VARCHAR(191) NULL DEFAULT 'CSV';
ALTER TABLE `import_batches` ADD COLUMN `ofxVersion` VARCHAR(191) NULL;
ALTER TABLE `import_batches` ADD COLUMN `ofxBankId` VARCHAR(191) NULL;

-- Add foreign key constraint for OFX account mappings
ALTER TABLE `ofx_account_mappings` ADD CONSTRAINT `ofx_account_mappings_bankAccountId_fkey` FOREIGN KEY (`bankAccountId`) REFERENCES `bank_accounts`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
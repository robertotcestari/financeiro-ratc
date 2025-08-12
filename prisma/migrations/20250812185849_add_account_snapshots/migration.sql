-- CreateTable
CREATE TABLE `account_snapshots` (
    `id` VARCHAR(191) NOT NULL,
    `bankAccountId` VARCHAR(191) NOT NULL,
    `year` INTEGER NOT NULL,
    `month` INTEGER NOT NULL,
    `openingBalance` DECIMAL(15, 2) NOT NULL,
    `closingBalance` DECIMAL(15, 2) NOT NULL,
    `totalDebits` DECIMAL(15, 2) NOT NULL,
    `totalCredits` DECIMAL(15, 2) NOT NULL,
    `transactionCount` INTEGER NOT NULL,
    `isVerified` BOOLEAN NOT NULL DEFAULT false,
    `lastSyncedAt` DATETIME(3) NOT NULL,
    `notes` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `account_snapshots_year_month_idx`(`year`, `month`),
    INDEX `account_snapshots_bankAccountId_idx`(`bankAccountId`),
    UNIQUE INDEX `account_snapshots_bankAccountId_year_month_key`(`bankAccountId`, `year`, `month`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `account_snapshots` ADD CONSTRAINT `account_snapshots_bankAccountId_fkey` FOREIGN KEY (`bankAccountId`) REFERENCES `bank_accounts`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

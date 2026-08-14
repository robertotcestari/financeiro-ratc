-- CreateTable
CREATE TABLE `vendors` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `document` VARCHAR(191) NULL,
    `email` VARCHAR(191) NULL,
    `phone` VARCHAR(191) NULL,
    `notes` TEXT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `defaultCategoryId` VARCHAR(191) NULL,
    `defaultPropertyId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `vendors_document_key`(`document`),
    INDEX `vendors_name_idx`(`name`),
    INDEX `vendors_isActive_idx`(`isActive`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `payable_recurrences` (
    `id` VARCHAR(191) NOT NULL,
    `vendorId` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NOT NULL,
    `categoryId` VARCHAR(191) NULL,
    `propertyId` VARCHAR(191) NULL,
    `amount` DECIMAL(15, 2) NOT NULL,
    `paymentMethod` ENUM('BOLETO', 'PIX', 'BANK_TRANSFER', 'AUTO_DEBIT', 'OTHER') NOT NULL DEFAULT 'BOLETO',
    `frequency` ENUM('MONTHLY', 'YEARLY') NOT NULL DEFAULT 'MONTHLY',
    `dayOfMonth` INTEGER NOT NULL,
    `startDate` DATE NOT NULL,
    `endDate` DATE NULL,
    `nextRunDate` DATE NOT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `payable_recurrences_vendorId_idx`(`vendorId`),
    INDEX `payable_recurrences_isActive_nextRunDate_idx`(`isActive`, `nextRunDate`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `payables` (
    `id` VARCHAR(191) NOT NULL,
    `vendorId` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NOT NULL,
    `documentNumber` VARCHAR(191) NULL,
    `issueDate` DATE NULL,
    `competenceDate` DATE NULL,
    `categoryId` VARCHAR(191) NULL,
    `propertyId` VARCHAR(191) NULL,
    `status` ENUM('OPEN', 'PARTIALLY_PAID', 'PAID', 'CANCELED') NOT NULL DEFAULT 'OPEN',
    `totalAmount` DECIMAL(15, 2) NOT NULL,
    `totalPaidAmount` DECIMAL(15, 2) NOT NULL DEFAULT 0,
    `totalBalanceAmount` DECIMAL(15, 2) NOT NULL,
    `notes` TEXT NULL,
    `recurrenceId` VARCHAR(191) NULL,
    `canceledAt` DATETIME(3) NULL,
    `cancelReason` VARCHAR(191) NULL,
    `createdById` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `payables_vendorId_idx`(`vendorId`),
    INDEX `payables_status_idx`(`status`),
    INDEX `payables_competenceDate_idx`(`competenceDate`),
    INDEX `payables_categoryId_idx`(`categoryId`),
    INDEX `payables_propertyId_idx`(`propertyId`),
    INDEX `payables_recurrenceId_competenceDate_idx`(`recurrenceId`, `competenceDate`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `payable_installments` (
    `id` VARCHAR(191) NOT NULL,
    `payableId` VARCHAR(191) NOT NULL,
    `installmentNumber` INTEGER NOT NULL,
    `dueDate` DATE NOT NULL,
    `amount` DECIMAL(15, 2) NOT NULL,
    `paidAmount` DECIMAL(15, 2) NOT NULL DEFAULT 0,
    `remainingAmount` DECIMAL(15, 2) NOT NULL,
    `paymentMethod` ENUM('BOLETO', 'PIX', 'BANK_TRANSFER', 'AUTO_DEBIT', 'OTHER') NOT NULL DEFAULT 'BOLETO',
    `boletoLine` VARCHAR(60) NULL,
    `boletoBarcode` VARCHAR(191) NULL,
    `status` ENUM('OPEN', 'PARTIALLY_PAID', 'PAID', 'CANCELED') NOT NULL DEFAULT 'OPEN',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `payable_installments_payableId_installmentNumber_key`(`payableId`, `installmentNumber`),
    INDEX `payable_installments_status_dueDate_idx`(`status`, `dueDate`),
    INDEX `payable_installments_dueDate_idx`(`dueDate`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `payable_settlements` (
    `id` VARCHAR(191) NOT NULL,
    `installmentId` VARCHAR(191) NOT NULL,
    `transactionId` VARCHAR(191) NULL,
    `bankAccountId` VARCHAR(191) NOT NULL,
    `amount` DECIMAL(15, 2) NOT NULL,
    `paidAt` DATE NOT NULL,
    `method` ENUM('BOLETO', 'PIX', 'BANK_TRANSFER', 'AUTO_DEBIT', 'OTHER') NOT NULL DEFAULT 'BANK_TRANSFER',
    `status` ENUM('RECORDED', 'REVERSED') NOT NULL DEFAULT 'RECORDED',
    `notes` TEXT NULL,
    `createdById` VARCHAR(191) NULL,
    `reversedAt` DATETIME(3) NULL,
    `reversedById` VARCHAR(191) NULL,
    `reverseReason` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `payable_settlements_transactionId_key`(`transactionId`),
    INDEX `payable_settlements_installmentId_idx`(`installmentId`),
    INDEX `payable_settlements_bankAccountId_idx`(`bankAccountId`),
    INDEX `payable_settlements_paidAt_idx`(`paidAt`),
    INDEX `payable_settlements_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `payable_attachments` (
    `id` VARCHAR(191) NOT NULL,
    `payableId` VARCHAR(191) NOT NULL,
    `installmentId` VARCHAR(191) NULL,
    `title` VARCHAR(191) NOT NULL,
    `fileName` VARCHAR(191) NOT NULL,
    `contentType` VARCHAR(191) NULL,
    `sizeBytes` INTEGER NULL,
    `storageKey` VARCHAR(191) NULL,
    `referenceUrl` VARCHAR(191) NOT NULL,
    `purpose` ENUM('SOURCE_DOCUMENT', 'SUPPORTING_DOCUMENT') NOT NULL DEFAULT 'SUPPORTING_DOCUMENT',
    `createdById` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `payable_attachments_payableId_idx`(`payableId`),
    INDEX `payable_attachments_installmentId_idx`(`installmentId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `vendors` ADD CONSTRAINT `vendors_defaultCategoryId_fkey` FOREIGN KEY (`defaultCategoryId`) REFERENCES `categories`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `vendors` ADD CONSTRAINT `vendors_defaultPropertyId_fkey` FOREIGN KEY (`defaultPropertyId`) REFERENCES `properties`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `payable_recurrences` ADD CONSTRAINT `payable_recurrences_vendorId_fkey` FOREIGN KEY (`vendorId`) REFERENCES `vendors`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `payable_recurrences` ADD CONSTRAINT `payable_recurrences_categoryId_fkey` FOREIGN KEY (`categoryId`) REFERENCES `categories`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `payable_recurrences` ADD CONSTRAINT `payable_recurrences_propertyId_fkey` FOREIGN KEY (`propertyId`) REFERENCES `properties`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `payables` ADD CONSTRAINT `payables_vendorId_fkey` FOREIGN KEY (`vendorId`) REFERENCES `vendors`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `payables` ADD CONSTRAINT `payables_categoryId_fkey` FOREIGN KEY (`categoryId`) REFERENCES `categories`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `payables` ADD CONSTRAINT `payables_propertyId_fkey` FOREIGN KEY (`propertyId`) REFERENCES `properties`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `payables` ADD CONSTRAINT `payables_recurrenceId_fkey` FOREIGN KEY (`recurrenceId`) REFERENCES `payable_recurrences`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `payables` ADD CONSTRAINT `payables_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `payable_installments` ADD CONSTRAINT `payable_installments_payableId_fkey` FOREIGN KEY (`payableId`) REFERENCES `payables`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `payable_settlements` ADD CONSTRAINT `payable_settlements_installmentId_fkey` FOREIGN KEY (`installmentId`) REFERENCES `payable_installments`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `payable_settlements` ADD CONSTRAINT `payable_settlements_transactionId_fkey` FOREIGN KEY (`transactionId`) REFERENCES `transactions`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `payable_settlements` ADD CONSTRAINT `payable_settlements_bankAccountId_fkey` FOREIGN KEY (`bankAccountId`) REFERENCES `bank_accounts`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `payable_settlements` ADD CONSTRAINT `payable_settlements_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `payable_settlements` ADD CONSTRAINT `payable_settlements_reversedById_fkey` FOREIGN KEY (`reversedById`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `payable_attachments` ADD CONSTRAINT `payable_attachments_payableId_fkey` FOREIGN KEY (`payableId`) REFERENCES `payables`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `payable_attachments` ADD CONSTRAINT `payable_attachments_installmentId_fkey` FOREIGN KEY (`installmentId`) REFERENCES `payable_installments`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `payable_attachments` ADD CONSTRAINT `payable_attachments_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

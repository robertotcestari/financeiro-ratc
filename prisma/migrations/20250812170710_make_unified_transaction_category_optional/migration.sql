-- DropForeignKey
ALTER TABLE `processed_transactions` DROP FOREIGN KEY `unified_transactions_categoryId_fkey`;

-- AlterTable
ALTER TABLE `processed_transactions` MODIFY `categoryId` VARCHAR(191) NULL;

-- AddForeignKey
ALTER TABLE `processed_transactions` ADD CONSTRAINT `processed_transactions_categoryId_fkey` FOREIGN KEY (`categoryId`) REFERENCES `categories`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- DropForeignKey
ALTER TABLE `processed_transactions` DROP FOREIGN KEY `unified_transactions_transactionId_fkey`;

-- AlterTable
ALTER TABLE `processed_transactions` MODIFY `transactionId` VARCHAR(191) NULL;

-- AddForeignKey
ALTER TABLE `processed_transactions` ADD CONSTRAINT `processed_transactions_transactionId_fkey` FOREIGN KEY (`transactionId`) REFERENCES `transactions`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

/*
  Warnings:

  - You are about to drop the `dre_line_items` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE `dre_line_items` DROP FOREIGN KEY `dre_line_items_categoryId_fkey`;

-- DropForeignKey
ALTER TABLE `processed_transactions` DROP FOREIGN KEY `unified_transactions_propertyId_fkey`;

-- DropTable
DROP TABLE `dre_line_items`;

-- AddForeignKey
ALTER TABLE `processed_transactions` ADD CONSTRAINT `processed_transactions_propertyId_fkey` FOREIGN KEY (`propertyId`) REFERENCES `properties`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- RenameIndex
ALTER TABLE `processed_transactions` RENAME INDEX `unified_transactions_categoryId_idx` TO `processed_transactions_categoryId_idx`;

-- RenameIndex
ALTER TABLE `processed_transactions` RENAME INDEX `unified_transactions_propertyId_idx` TO `processed_transactions_propertyId_idx`;

-- RenameIndex
ALTER TABLE `processed_transactions` RENAME INDEX `unified_transactions_transactionId_key` TO `processed_transactions_transactionId_key`;

-- RenameIndex
ALTER TABLE `processed_transactions` RENAME INDEX `unified_transactions_year_month_idx` TO `processed_transactions_year_month_idx`;

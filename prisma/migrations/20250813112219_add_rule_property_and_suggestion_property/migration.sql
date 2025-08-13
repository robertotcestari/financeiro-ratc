-- DropForeignKey
ALTER TABLE `categorization_rules` DROP FOREIGN KEY `categorization_rules_categoryId_fkey`;

-- DropForeignKey
ALTER TABLE `transaction_suggestions` DROP FOREIGN KEY `transaction_suggestions_suggestedCategoryId_fkey`;

-- DropIndex
DROP INDEX `categorization_rules_categoryId_fkey` ON `categorization_rules`;

-- DropIndex
DROP INDEX `transaction_suggestions_suggestedCategoryId_fkey` ON `transaction_suggestions`;

-- AlterTable
ALTER TABLE `categorization_rules` ADD COLUMN `propertyId` VARCHAR(191) NULL,
    MODIFY `categoryId` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `transaction_suggestions` ADD COLUMN `suggestedPropertyId` VARCHAR(191) NULL,
    MODIFY `suggestedCategoryId` VARCHAR(191) NULL;

-- AddForeignKey
ALTER TABLE `categorization_rules` ADD CONSTRAINT `categorization_rules_categoryId_fkey` FOREIGN KEY (`categoryId`) REFERENCES `categories`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `categorization_rules` ADD CONSTRAINT `categorization_rules_propertyId_fkey` FOREIGN KEY (`propertyId`) REFERENCES `properties`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `transaction_suggestions` ADD CONSTRAINT `transaction_suggestions_suggestedCategoryId_fkey` FOREIGN KEY (`suggestedCategoryId`) REFERENCES `categories`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `transaction_suggestions` ADD CONSTRAINT `transaction_suggestions_suggestedPropertyId_fkey` FOREIGN KEY (`suggestedPropertyId`) REFERENCES `properties`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

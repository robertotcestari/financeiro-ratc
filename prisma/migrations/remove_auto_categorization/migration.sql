/*
  Warnings:

  - You are about to drop the column `autoCategorized` on the `processed_transactions` table. All the data in the column will be lost.
  - You are about to drop the `category_rules` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE `category_rules` DROP FOREIGN KEY `category_rules_categoryId_fkey`;

-- DropForeignKey
ALTER TABLE `category_rules` DROP FOREIGN KEY `category_rules_propertyId_fkey`;

-- AlterTable
ALTER TABLE `processed_transactions` DROP COLUMN `autoCategorized`;

-- DropTable
DROP TABLE `category_rules`;
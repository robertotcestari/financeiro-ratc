/*
  Warnings:

  - You are about to drop the column `transferId` on the `processed_transactions` table. All the data in the column will be lost.
  - You are about to drop the `transfers` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE `transfers` DROP FOREIGN KEY `transfers_destinationAccountId_fkey`;

-- DropForeignKey
ALTER TABLE `transfers` DROP FOREIGN KEY `transfers_destinationTransactionId_fkey`;

-- DropForeignKey
ALTER TABLE `transfers` DROP FOREIGN KEY `transfers_originAccountId_fkey`;

-- DropForeignKey
ALTER TABLE `transfers` DROP FOREIGN KEY `transfers_originTransactionId_fkey`;

-- DropForeignKey
ALTER TABLE `processed_transactions` DROP FOREIGN KEY `unified_transactions_transferId_fkey`;

-- DropIndex
DROP INDEX `unified_transactions_transferId_idx` ON `processed_transactions`;

-- AlterTable
ALTER TABLE `processed_transactions` DROP COLUMN `transferId`;

-- DropTable
DROP TABLE `transfers`;

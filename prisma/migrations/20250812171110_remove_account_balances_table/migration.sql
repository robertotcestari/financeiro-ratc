/*
  Warnings:

  - You are about to drop the `account_balances` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE `account_balances` DROP FOREIGN KEY `account_balances_bankAccountId_fkey`;

-- DropTable
DROP TABLE `account_balances`;

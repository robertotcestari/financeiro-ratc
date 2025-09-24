-- AlterTable
ALTER TABLE `saved_files`
  MODIFY `type` ENUM('DRE', 'ALUGUEIS', 'TRIBUTACAO') NOT NULL;

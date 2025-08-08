-- Adjust transactions uniqueness to allow legitimate same-day/same-amount entries

-- Ensure FK on bankAccountId keeps an index available
CREATE INDEX `transactions_bankAccountId_idx` ON `transactions`(`bankAccountId`);

-- Drop old unique index based on (bankAccountId, date, amount)
DROP INDEX `transactions_bankAccountId_date_amount_key` ON `transactions`;

-- Create new unique index including balance snapshot
CREATE UNIQUE INDEX `transactions_bankAccountId_date_amount_balance_key` ON `transactions`(`bankAccountId`, `date`, `amount`, `balance`);

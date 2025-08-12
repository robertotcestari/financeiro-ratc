'use server';

import { getCurrentBalanceOptimized } from '@/lib/financial-calculations-optimized';

/**
 * Retorna saldos para o período do arquivo OFX a serem exibidos na prévia:
 * - beforeStart: saldo imediatamente antes do início do período (início - 1ms)
 * - beforeEnd: saldo no fim do período antes da importação (somente dados já no banco)
 */
export async function getPreviewBalances(
  bankAccountId: string,
  startISO: string,
  endISO: string
): Promise<{ beforeStart: number; beforeEnd: number }> {
  const startDate = new Date(startISO);
  const endDate = new Date(endISO);

  // Saldo imediatamente antes do início do período
  const startMinus = new Date(startDate.getTime() - 1);
  const startBalance = await getCurrentBalanceOptimized(
    bankAccountId,
    startMinus
  );

  // Saldo no fim do período (sem considerar transações do arquivo ainda não importadas)
  const endBalance = await getCurrentBalanceOptimized(bankAccountId, endDate);

  return {
    beforeStart: startBalance.balance,
    beforeEnd: endBalance.balance,
  };
}

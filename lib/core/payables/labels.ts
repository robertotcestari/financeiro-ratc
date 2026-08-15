import type {
  PayableInstallmentStatus,
  PayablePaymentMethod,
  PayableRecurrenceFrequency,
  PayableStatus,
} from '@/app/generated/prisma/client';

export const payableStatusLabels: Record<PayableStatus, string> = {
  OPEN: 'Em aberto',
  PARTIALLY_PAID: 'Parcialmente pago',
  PAID: 'Pago',
  CANCELED: 'Cancelado',
};

export const installmentStatusLabels: Record<PayableInstallmentStatus, string> =
  {
    OPEN: 'Em aberto',
    PARTIALLY_PAID: 'Parcialmente pago',
    PAID: 'Pago',
    CANCELED: 'Cancelado',
  };

export const paymentMethodLabels: Record<PayablePaymentMethod, string> = {
  BOLETO: 'Boleto',
  PIX: 'Pix',
  BANK_TRANSFER: 'Transferência',
  AUTO_DEBIT: 'Débito automático',
  OTHER: 'Outro',
};

export const recurrenceFrequencyLabels: Record<
  PayableRecurrenceFrequency,
  string
> = {
  MONTHLY: 'Mensal',
  YEARLY: 'Anual',
};

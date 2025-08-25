'use client';

import { Button } from '@/components/ui/button';
import { Send } from 'lucide-react';
import { toast } from 'sonner';
import { sendMonthlyReportEmail } from '../actions';

interface SendEmailButtonProps {
  month: number;
  year: number;
  disabled: boolean;
}

export default function SendEmailButton({ month, year, disabled }: SendEmailButtonProps) {
  const handleSendEmail = async () => {
    try {
      const result = await sendMonthlyReportEmail({ month, year });
      if (result.success) {
        toast.success('Email enviado com sucesso!', {
          description: `ID da mensagem: ${result.messageId}`,
        });
      } else {
        toast.error('Erro ao enviar email', {
          description: result.error,
        });
      }
    } catch {
      toast.error('Erro ao enviar email', {
        description: 'Ocorreu um erro inesperado',
      });
    }
  };

  return (
    <Button
      onClick={handleSendEmail}
      disabled={disabled}
      className="flex items-center gap-2"
    >
      <Send className="w-4 h-4" />
      Enviar Email
    </Button>
  );
}
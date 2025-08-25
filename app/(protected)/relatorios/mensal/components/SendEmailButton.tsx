'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Send, Plus, X, Mail } from 'lucide-react';
import { toast } from 'sonner';
import { sendMonthlyReportEmail } from '../actions';
import { useState } from 'react';

interface SendEmailButtonProps {
  month: number;
  year: number;
  defaultEmail?: string;
}

export default function SendEmailButton({ month, year, defaultEmail }: SendEmailButtonProps) {
  // Parse default emails - split by comma if multiple emails are provided
  const parseDefaultEmails = (emails: string | undefined): string[] => {
    if (!emails) return [];
    return emails.split(',').map(email => email.trim()).filter(email => email.length > 0);
  };
  
  const [recipients, setRecipients] = useState<string[]>(parseDefaultEmails(defaultEmail));
  const [currentEmail, setCurrentEmail] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [isSending, setIsSending] = useState(false);

  const validateEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const addRecipient = () => {
    const trimmedEmail = currentEmail.trim();
    if (!trimmedEmail) {
      toast.error('Digite um e-mail');
      return;
    }
    if (!validateEmail(trimmedEmail)) {
      toast.error('E-mail inválido');
      return;
    }
    if (recipients.includes(trimmedEmail)) {
      toast.error('E-mail já adicionado');
      return;
    }
    setRecipients([...recipients, trimmedEmail]);
    setCurrentEmail('');
    setIsAdding(false);
  };

  const removeRecipient = (email: string) => {
    setRecipients(recipients.filter(r => r !== email));
  };

  const handleSendEmail = async () => {
    if (recipients.length === 0) {
      toast.error('Adicione pelo menos um destinatário');
      return;
    }

    setIsSending(true);
    try {
      const result = await sendMonthlyReportEmail({ month, year, recipients });
      if (result.success) {
        toast.success('Email enviado com sucesso!', {
          description: `ID da mensagem: ${result.messageId}`,
        });
        // Clear recipients after successful send
        setRecipients([]);
      } else {
        toast.error('Erro ao enviar email', {
          description: result.error,
        });
      }
    } catch {
      toast.error('Erro ao enviar email', {
        description: 'Ocorreu um erro inesperado',
      });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <label className="text-sm font-medium">Destinatários</label>
        
        {/* List of recipients */}
        {recipients.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-2">
            {recipients.map(email => (
              <div key={email} className="flex items-center gap-1 bg-gray-100 px-2 py-1 rounded-md">
                <Mail className="w-3 h-3 text-gray-600" />
                <span className="text-sm">{email}</span>
                <button
                  onClick={() => removeRecipient(email)}
                  className="ml-1 hover:text-red-600"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Add recipient input */}
        {isAdding ? (
          <div className="flex gap-2">
            <Input
              type="email"
              placeholder="email@exemplo.com"
              value={currentEmail}
              onChange={(e) => setCurrentEmail(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addRecipient();
                } else if (e.key === 'Escape') {
                  setIsAdding(false);
                  setCurrentEmail('');
                }
              }}
              className="flex-1"
              autoFocus
            />
            <Button
              type="button"
              onClick={addRecipient}
              size="sm"
              variant="outline"
            >
              Adicionar
            </Button>
            <Button
              type="button"
              onClick={() => {
                setIsAdding(false);
                setCurrentEmail('');
              }}
              size="sm"
              variant="ghost"
            >
              Cancelar
            </Button>
          </div>
        ) : (
          <Button
            type="button"
            onClick={() => setIsAdding(true)}
            variant="outline"
            size="sm"
            className="flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Adicionar destinatário
          </Button>
        )}
      </div>

      <Button
        onClick={handleSendEmail}
        disabled={isSending || recipients.length === 0}
        className="flex items-center gap-2 w-full sm:w-auto"
      >
        <Send className="w-4 h-4" />
        {isSending ? 'Enviando...' : 'Enviar Email'}
      </Button>
    </div>
  );
}
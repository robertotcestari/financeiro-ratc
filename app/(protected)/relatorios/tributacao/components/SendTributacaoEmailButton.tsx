'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Send, Plus, X, Mail } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { sendTributacaoReportEmail } from '../actions';

interface Props {
  month: number;
  year: number;
  defaultEmail?: string;
}

const parseDefaultEmails = (emails: string | undefined): string[] => {
  if (!emails) return [];
  return emails
    .split(',')
    .map((email) => email.trim())
    .filter((email) => email.length > 0);
};

const validateEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

export function SendTributacaoEmailButton({ month, year, defaultEmail }: Props) {
  const [recipients, setRecipients] = useState<string[]>(
    parseDefaultEmails(defaultEmail)
  );
  const [currentEmail, setCurrentEmail] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [isSending, setIsSending] = useState(false);

  const addRecipient = () => {
    const trimmed = currentEmail.trim();
    if (!trimmed) {
      toast.error('Digite um e-mail');
      return;
    }
    if (!validateEmail(trimmed)) {
      toast.error('E-mail inválido');
      return;
    }
    if (recipients.includes(trimmed)) {
      toast.error('E-mail já adicionado');
      return;
    }
    setRecipients([...recipients, trimmed]);
    setCurrentEmail('');
    setIsAdding(false);
  };

  const removeRecipient = (email: string) => {
    setRecipients((prev) => prev.filter((item) => item !== email));
  };

  const handleSend = async () => {
    if (recipients.length === 0) {
      toast.error('Adicione pelo menos um destinatário');
      return;
    }

    setIsSending(true);
    try {
      const result = await sendTributacaoReportEmail({
        month,
        year,
        recipients,
      });
      if (result.success) {
        toast.success('Relatório enviado com sucesso!', {
          description: result.messageId,
        });
        setRecipients([]);
      } else {
        toast.error('Erro ao enviar relatório', {
          description: result.error,
        });
      }
    } catch (error) {
      toast.error('Erro ao enviar relatório', {
        description: error instanceof Error ? error.message : undefined,
      });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <label className="text-sm font-medium">Destinatários</label>

        {recipients.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-2">
            {recipients.map((email) => (
              <div
                key={email}
                className="flex items-center gap-1 bg-gray-100 px-2 py-1 rounded-md"
              >
                <Mail className="w-3 h-3 text-gray-600" />
                <span className="text-sm">{email}</span>
                <button
                  type="button"
                  onClick={() => removeRecipient(email)}
                  className="ml-1 hover:text-red-600"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        {isAdding ? (
          <div className="flex gap-2">
            <Input
              type="email"
              placeholder="email@exemplo.com"
              value={currentEmail}
              onChange={(event) => setCurrentEmail(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  addRecipient();
                }
                if (event.key === 'Escape') {
                  setIsAdding(false);
                  setCurrentEmail('');
                }
              }}
              className="flex-1"
              autoFocus
            />
            <Button type="button" onClick={addRecipient} size="sm" variant="outline">
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
        onClick={handleSend}
        disabled={isSending || recipients.length === 0}
        className="flex items-center gap-2 w-full sm:w-auto"
      >
        <Send className="w-4 h-4" />
        {isSending ? 'Enviando...' : 'Enviar Email'}
      </Button>
    </div>
  );
}

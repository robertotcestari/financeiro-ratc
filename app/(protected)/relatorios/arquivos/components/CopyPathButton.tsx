'use client';

import { Button } from '@/components/ui/button';
import { Clipboard } from 'lucide-react';
import { useState } from 'react';

interface Props {
  text: string;
}

export default function CopyPathButton({ text }: Props) {
  const [copied, setCopied] = useState(false);

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {}
  };

  return (
    <Button variant="outline" size="sm" onClick={onCopy}>
      <Clipboard className="w-4 h-4 mr-1" /> {copied ? 'Copiado!' : 'Copiar caminho'}
    </Button>
  );
}

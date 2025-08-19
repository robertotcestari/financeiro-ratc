'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { generateAllAccountSnapshots } from '../actions';
import { toast } from 'sonner';
import { Calculator, Loader2 } from 'lucide-react';

export function CalculateBalancesButton() {
  const [isLoading, setIsLoading] = useState(false);

  const handleCalculate = async () => {
    setIsLoading(true);
    try {
      const result = await generateAllAccountSnapshots();
      
      if (result.success) {
        toast.success(
          `Saldos calculados com sucesso! ${result.snapshotCount} snapshots gerados.`
        );
      } else {
        toast.error(result.error || 'Erro ao calcular saldos');
      }
    } catch (error) {
      toast.error('Erro ao calcular saldos');
      console.error('Erro ao calcular saldos:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button
      onClick={handleCalculate}
      disabled={isLoading}
      variant="outline"
      className="gap-2"
    >
      {isLoading ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          Calculando...
        </>
      ) : (
        <>
          <Calculator className="h-4 w-4" />
          Calcular Saldos
        </>
      )}
    </Button>
  );
}
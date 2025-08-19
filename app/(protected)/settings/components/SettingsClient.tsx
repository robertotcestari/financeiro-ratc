"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

export function SettingsClient() {
  const [isLoading, setIsLoading] = useState(false);

  const handleExportData = async () => {
    setIsLoading(true);
    try {
      // Simulação - aqui você implementaria a lógica real de exportação
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      alert("Dados exportados com sucesso! Seus dados foram preparados para download.");
    } catch {
      alert("Erro ao exportar dados. Não foi possível exportar seus dados. Tente novamente.");
    } finally {
      setIsLoading(false);
    }
  };

  // Excluir conta (em breve)

  return (
    <div className="space-x-2">
      <Button
        onClick={handleExportData}
        variant="outline"
        size="sm"
        disabled={isLoading}
      >
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Exportando...
          </>
        ) : (
          "Exportar Dados"
        )}
      </Button>
    </div>
  );
}

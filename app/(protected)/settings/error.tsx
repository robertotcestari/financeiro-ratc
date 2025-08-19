"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";

export default function SettingsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error("Settings page error:", error);
  }, [error]);

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <Card className="border-red-200 bg-red-50">
        <CardHeader>
          <div className="flex items-center space-x-2">
            <AlertCircle className="h-5 w-5 text-red-600" />
            <CardTitle className="text-red-900">
              Erro ao carregar configurações
            </CardTitle>
          </div>
          <CardDescription className="text-red-700">
            Ocorreu um erro ao tentar carregar suas configurações.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <p className="text-sm text-red-700">
              {error.message || "Erro desconhecido"}
            </p>
            
            <div className="flex space-x-2">
              <Button 
                onClick={reset}
                variant="default"
              >
                Tentar Novamente
              </Button>
              
              <Button 
                onClick={() => window.location.href = "/"}
                variant="outline"
              >
                Voltar ao Início
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
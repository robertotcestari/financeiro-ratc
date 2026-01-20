"use client";

import { useAuth } from "@/hooks/use-auth";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function SignInPage() {
  const { isLoading, signInWithGoogle } = useAuth();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  // Relaxed: do not gate by role or redirect if already authenticated
  const queryError =
    searchParams.get("error") === "unauthorized"
      ? "Acesso negado. Apenas usuários autorizados podem acessar o sistema."
      : null;
  const errorMessage = error ?? queryError;

  // Do not auto-redirect when already authenticated; let the user stay here

  const handleSignIn = async () => {
    try {
      setError(null);
      await signInWithGoogle();
    } catch (err: unknown) {
      // Handle authentication errors
      if (err instanceof Error && err.message.includes("Acesso negado")) {
        setError("Acesso negado. Apenas usuários autorizados podem acessar o sistema.");
      } else {
        setError("Erro ao fazer login. Por favor, tente novamente.");
      }
    }
  };

  // Relaxed: still show sign-in page even if authenticated

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-2xl font-bold">Financeiro RATC</CardTitle>
          <CardDescription>
            Faça login para acessar o sistema financeiro
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {errorMessage && (
            <Alert variant="destructive">
              <AlertDescription>{errorMessage}</AlertDescription>
            </Alert>
          )}
          
          <Button
            onClick={handleSignIn}
            disabled={isLoading}
            className="w-full"
            size="lg"
            variant="outline"
          >
            <svg
              className="mr-2 h-5 w-5"
              aria-hidden="true"
              focusable="false"
              data-prefix="fab"
              data-icon="google"
              role="img"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 488 512"
            >
              <path
                fill="currentColor"
                d="M488 261.8C488 403.3 391.1 504 248 504 110.8 504 0 393.2 0 256S110.8 8 248 8c66.8 0 123 24.5 166.3 64.9l-67.5 64.9C258.5 52.6 94.3 116.6 94.3 256c0 86.5 69.1 156.6 153.7 156.6 98.2 0 135-70.4 140.8-106.9H248v-85.3h236.1c2.3 12.7 3.9 24.9 3.9 41.4z"
              />
            </svg>
            {isLoading ? "Conectando..." : "Entrar com Google"}
          </Button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">
                Acesso seguro
              </span>
            </div>
          </div>

          <p className="text-center text-sm text-muted-foreground">
            Ao fazer login, você concorda com nossos{" "}
            <a href="#" className="underline underline-offset-4 hover:text-primary">
              Termos de Uso
            </a>{" "}
            e{" "}
            <a href="#" className="underline underline-offset-4 hover:text-primary">
              Política de Privacidade
            </a>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

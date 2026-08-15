"use client";

import { useAuth } from "@/hooks/use-auth";
import { useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function SignInPage() {
  const { isLoading, signInWithGoogle, signInWithEmail } = useAuth();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const queryError =
    searchParams.get("error") === "unauthorized"
      ? "Acesso negado. Apenas usuários autorizados podem acessar o sistema."
      : null;
  const errorMessage = error ?? queryError;

  const handleEmailSignIn = async (event: FormEvent) => {
    event.preventDefault();
    try {
      setError(null);
      setSubmitting(true);
      await signInWithEmail(email, password);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Erro ao fazer login. Por favor, tente novamente.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      setError(null);
      await signInWithGoogle();
    } catch (err: unknown) {
      if (err instanceof Error && err.message.includes("Acesso negado")) {
        setError("Acesso negado. Apenas usuários autorizados podem acessar o sistema.");
      } else {
        setError("Erro ao fazer login. Por favor, tente novamente.");
      }
    }
  };

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

          <form onSubmit={handleEmailSignIn} className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="signin-email">E-mail</Label>
              <Input
                id="signin-email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="seu@email.com"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="signin-password">Senha</Label>
              <Input
                id="signin-password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Sua senha"
                required
                minLength={8}
              />
            </div>
            <Button
              type="submit"
              disabled={isLoading || submitting}
              className="w-full"
              size="lg"
            >
              {submitting ? "Entrando..." : "Entrar com e-mail"}
            </Button>
          </form>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">
                ou continue com
              </span>
            </div>
          </div>
          
          <Button
            onClick={handleGoogleSignIn}
            disabled={isLoading || submitting}
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

          <p className="text-center text-sm text-muted-foreground">
            O cadastro é feito apenas por um administrador.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

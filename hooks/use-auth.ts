"use client";

import { useSession, signIn, signOut } from "@/lib/core/auth/auth-client";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";

export function useAuth() {
  const router = useRouter();
  const session = useSession();
  const searchParams = useSearchParams();

  const redirectTo = searchParams.get("redirect") || "/";

  const signInWithGoogle = async () => {
    try {
      await signIn.social({
        provider: "google",
        callbackURL: redirectTo,
      });
    } catch (error) {
      console.error("Sign in error:", error);
      toast.error("Erro ao fazer login. Por favor, tente novamente.");
    }
  };

  const signInWithEmail = async (email: string, password: string) => {
    const { error } = await signIn.email({
      email,
      password,
      callbackURL: redirectTo,
    });

    if (error) {
      const message =
        error.message?.toLowerCase().includes("invalid") ||
        error.code === "INVALID_EMAIL_OR_PASSWORD"
          ? "E-mail ou senha inválidos."
          : "Erro ao fazer login. Por favor, tente novamente.";
      toast.error(message);
      throw new Error(message);
    }

    router.push(redirectTo);
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      router.push("/auth/signin");
      toast.success("Logout realizado com sucesso!");
    } catch (error) {
      console.error("Sign out error:", error);
      toast.error("Erro ao fazer logout. Por favor, tente novamente.");
    }
  };

  return {
    session,
    user: session.data?.user,
    isLoading: session.isPending,
    isAuthenticated: !!session.data,
    signInWithGoogle,
    signInWithEmail,
    signOut: handleSignOut,
  };
}
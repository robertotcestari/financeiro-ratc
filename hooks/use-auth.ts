"use client";

import { useSession, signIn, signOut } from "@/lib/core/auth/auth-client";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";

export function useAuth() {
  const router = useRouter();
  const session = useSession();
  const searchParams = useSearchParams();

  const signInWithGoogle = async () => {
    try {
      // Get the redirect parameter from URL, fallback to "/"
      const redirectTo = searchParams.get("redirect") || "/";
      
      await signIn.social({
        provider: "google",
        callbackURL: redirectTo,
      });
    } catch (error) {
      console.error("Sign in error:", error);
      toast.error("Erro ao fazer login. Por favor, tente novamente.");
    }
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
    signOut: handleSignOut,
  };
}
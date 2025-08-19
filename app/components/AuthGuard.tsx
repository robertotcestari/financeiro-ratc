import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/core/auth/auth-utils";

// Allowed email for authentication
const ALLOWED_EMAIL = "robertotcestari@gmail.com";

interface AuthGuardProps {
  children: React.ReactNode;
}

export default async function AuthGuard({ children }: AuthGuardProps) {
  const user = await getCurrentUser();
  
  // Check if user is authenticated
  if (!user) {
    redirect("/auth/signin");
  }
  
  // Check if user email is allowed
  if (user.email !== ALLOWED_EMAIL) {
    redirect("/auth/signin?error=unauthorized");
  }
  
  // User is authenticated and authorized
  return <>{children}</>;
}
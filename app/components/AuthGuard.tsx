import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/core/auth/auth-utils";

interface AuthGuardProps {
  children: React.ReactNode;
}

export default async function AuthGuard({ children }: AuthGuardProps) {
  const user = await getCurrentUser();
  
  // Check if user is authenticated
  if (!user) {
    redirect("/auth/signin");
  }
  
  // User is authenticated and authorized
  return <>{children}</>;
}

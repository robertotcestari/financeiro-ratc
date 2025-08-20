import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/core/auth/auth-utils";

// Allowed emails for authentication
const ALLOWED_EMAILS = [
  "robertotcestari@gmail.com",
  "contato@iolhoscatanduva.com.br"
];

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
  if (!ALLOWED_EMAILS.includes(user.email || "")) {
    redirect("/auth/signin?error=unauthorized");
  }
  
  // User is authenticated and authorized
  return <>{children}</>;
}
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Auth pages don't show the navbar (it's rendered in the parent layout)
  // This layout can be used for auth-specific styling or logic
  return <>{children}</>;
}
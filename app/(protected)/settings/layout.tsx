import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Configurações | Financeiro RATC",
  description: "Gerencie suas preferências e configurações da conta",
};

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gray-50">
      {children}
    </div>
  );
}
import type { Metadata } from "next";
import "./globals.css";
import Navbar from "./components/Navbar";
import { Toaster } from "sonner";

export const metadata: Metadata = {
  title: "Financeiro RATC",
  description: "Sistema financeiro RATC",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body>
        <Navbar />
        {children}
        <Toaster richColors position="top-right" />
      </body>
    </html>
  );
}

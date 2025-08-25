"use client";

import { useAuth } from "@/hooks/use-auth";
import { useSession } from "@/lib/core/auth/auth-client";
import { Button } from "@/components/ui/button";
import { ArrowRight, Shield, TrendingUp, FileText } from "lucide-react";
import Link from "next/link";

export default function WelcomeHero() {
  const { user, isAuthenticated, isLoading, signInWithGoogle } = useAuth();
  const session = useSession();
  const role = session.data?.user?.role as string | undefined;
  const canSeeReports = role === 'admin' || role === 'superuser';

  if (!isAuthenticated) {
    return (
      <div className="bg-gradient-to-br from-blue-50 to-indigo-100 py-16">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Sistema Financeiro RATC
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            Gerencie suas finanças com segurança e eficiência
          </p>
          <Button onClick={signInWithGoogle} size="lg" className="font-semibold" disabled={isLoading}>
            <Shield className="mr-2 h-5 w-5" />
            {isLoading ? "Conectando..." : "Fazer Login com Google"}
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
          
          <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            <div className="text-center">
              <FileText className="h-12 w-12 text-blue-600 mx-auto mb-4" />
              <h3 className="font-semibold text-lg mb-2">Importação OFX</h3>
              <p className="text-gray-600">Importe extratos bancários automaticamente</p>
            </div>
            <div className="text-center">
              <TrendingUp className="h-12 w-12 text-blue-600 mx-auto mb-4" />
              <h3 className="font-semibold text-lg mb-2">DRE Automático</h3>
              <p className="text-gray-600">Demonstrativo de resultados em tempo real</p>
            </div>
            <div className="text-center">
              <Shield className="h-12 w-12 text-blue-600 mx-auto mb-4" />
              <h3 className="font-semibold text-lg mb-2">Segurança Total</h3>
              <p className="text-gray-600">Autenticação segura com Google OAuth</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-blue-50 to-indigo-100 py-16">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Bem-vindo de volta, {user?.name?.split(' ')[0]}!
          </h1>
          <p className="text-xl text-gray-600">
            Aqui está um resumo das suas atividades financeiras
          </p>
        </div>

        <div className={`grid grid-cols-1 md:grid-cols-${canSeeReports ? '4' : '2'} gap-6 max-w-6xl mx-auto`}>
          <Link href="/transacoes" className="block">
            <div className="bg-white p-6 rounded-lg shadow hover:shadow-lg transition-shadow">
              <FileText className="h-8 w-8 text-blue-600 mb-3" />
              <h3 className="font-semibold text-lg mb-1">Transações</h3>
              <p className="text-sm text-gray-600">Visualize e categorize</p>
            </div>
          </Link>

          <Link href="/ofx-import" className="block">
            <div className="bg-white p-6 rounded-lg shadow hover:shadow-lg transition-shadow">
              <ArrowRight className="h-8 w-8 text-green-600 mb-3" />
              <h3 className="font-semibold text-lg mb-1">Importar OFX</h3>
              <p className="text-sm text-gray-600">Adicione novos extratos</p>
            </div>
          </Link>

          {canSeeReports && (
            <Link href="/dre" className="block">
              <div className="bg-white p-6 rounded-lg shadow hover:shadow-lg transition-shadow">
                <TrendingUp className="h-8 w-8 text-purple-600 mb-3" />
                <h3 className="font-semibold text-lg mb-1">DRE</h3>
                <p className="text-sm text-gray-600">Demonstrativo de resultados</p>
              </div>
            </Link>
          )}

          {canSeeReports && (
            <Link href="/integridade" className="block">
              <div className="bg-white p-6 rounded-lg shadow hover:shadow-lg transition-shadow">
                <Shield className="h-8 w-8 text-orange-600 mb-3" />
                <h3 className="font-semibold text-lg mb-1">Integridade</h3>
                <p className="text-sm text-gray-600">Verifique consistência</p>
              </div>
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

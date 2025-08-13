'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertTriangle, RefreshCw, Landmark, ArrowLeft } from 'lucide-react'
import { logger } from '@/lib/logger'
import Link from 'next/link'

interface ErrorProps {
  error: Error & { digest?: string }
  reset: () => void
}

export default function BancosError({ error, reset }: ErrorProps) {
  useEffect(() => {
    // Log the error with bank accounts context
    logger.error('Bank accounts error occurred', {
      error,
      errorName: error.name,
      errorMessage: error.message,
      errorDigest: error.digest,
      section: 'bancos',
      userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : undefined,
      url: typeof window !== 'undefined' ? window.location.href : undefined,
      timestamp: new Date().toISOString(),
    })
  }, [error])

  const isAccountError = error.message?.toLowerCase().includes('conta') || 
                        error.message?.toLowerCase().includes('account') ||
                        error.message?.toLowerCase().includes('banco')
  
  const isStatsError = error.message?.toLowerCase().includes('estatística') ||
                      error.message?.toLowerCase().includes('stats') ||
                      error.message?.toLowerCase().includes('saldo')

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <AlertTriangle className="h-12 w-12 text-red-500" />
          </div>
          <CardTitle className="text-xl text-red-600">
            Erro nas Contas Bancárias
          </CardTitle>
          <CardDescription className="text-gray-600">
            Ocorreu um problema ao carregar informações das contas bancárias.
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-sm text-red-700">
              <strong>Erro:</strong> {error.message || 'Erro desconhecido ao carregar contas bancárias'}
            </p>
            {error.digest && (
              <p className="text-sm text-red-600 mt-1">
                <strong>ID:</strong> {error.digest}
              </p>
            )}
          </div>

          {isAccountError && (
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
              <h4 className="text-sm font-medium text-orange-800 mb-2">
                Problema ao carregar contas:
              </h4>
              <ul className="text-sm text-orange-700 space-y-1">
                <li>• Verifique sua conexão com a internet</li>
                <li>• Pode haver problemas temporários com o banco de dados</li>
                <li>• Algumas contas podem ter dados inconsistentes</li>
                <li>• Tente acessar uma conta específica diretamente</li>
              </ul>
            </div>
          )}

          {isStatsError && (
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
              <h4 className="text-sm font-medium text-orange-800 mb-2">
                Problema com estatísticas da conta:
              </h4>
              <ul className="text-sm text-orange-700 space-y-1">
                <li>• Pode haver problemas no cálculo de saldos</li>
                <li>• Verifique se existem transações na conta</li>
                <li>• Alguns snapshots podem estar desatualizados</li>
                <li>• Tente recalcular os saldos se disponível</li>
              </ul>
            </div>
          )}

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="text-sm font-medium text-blue-800 mb-2">
              Seus dados bancários estão seguros:
            </h4>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>• Todas as contas e transações estão preservadas</li>
              <li>• Este é apenas um problema de exibição</li>
              <li>• Você pode acessar transações individuais</li>
              <li>• Importações OFX não foram afetadas</li>
            </ul>
          </div>

          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <h4 className="text-sm font-medium text-green-800 mb-2">
              Alternativas disponíveis:
            </h4>
            <ul className="text-sm text-green-700 space-y-1">
              <li>• Acesse transações diretamente pela seção "Transações"</li>
              <li>• Use a importação OFX para adicionar novas transações</li>
              <li>• Verifique a integridade dos dados</li>
              <li>• Consulte o DRE para visão consolidada</li>
            </ul>
          </div>

          <div className="flex flex-col gap-3 pt-2">
            <Button 
              onClick={reset} 
              className="w-full"
              variant="default"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Recarregar contas bancárias
            </Button>
            
            <Button 
              onClick={() => window.location.href = '/bancos'} 
              variant="outline"
              className="w-full"
            >
              <Landmark className="w-4 h-4 mr-2" />
              Tentar carregar novamente
            </Button>

            <div className="flex gap-3">
              <Link href="/transacoes" className="flex-1">
                <Button variant="outline" className="w-full">
                  Ver transações
                </Button>
              </Link>
              <Link href="/ofx-import" className="flex-1">
                <Button variant="outline" className="w-full">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Importar OFX
                </Button>
              </Link>
            </div>
          </div>

          <div className="text-xs text-gray-500 text-center pt-2">
            Você pode continuar usando outras funcionalidades enquanto este problema é resolvido.
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
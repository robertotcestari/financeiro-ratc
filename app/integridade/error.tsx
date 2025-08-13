'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertTriangle, RefreshCw, Shield, ArrowLeft } from 'lucide-react'
import { logger } from '@/lib/logger'
import Link from 'next/link'

interface ErrorProps {
  error: Error & { digest?: string }
  reset: () => void
}

export default function IntegridadeError({ error, reset }: ErrorProps) {
  useEffect(() => {
    // Log the error with integrity check context
    logger.error('Integrity check error occurred', {
      error,
      errorName: error.name,
      errorMessage: error.message,
      errorDigest: error.digest,
      section: 'integridade',
      userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : undefined,
      url: typeof window !== 'undefined' ? window.location.href : undefined,
      timestamp: new Date().toISOString(),
    })
  }, [error])

  const isBalanceError = error.message?.toLowerCase().includes('saldo') || 
                        error.message?.toLowerCase().includes('balance') ||
                        error.message?.toLowerCase().includes('snapshot')
  
  const isValidationError = error.message?.toLowerCase().includes('validação') ||
                           error.message?.toLowerCase().includes('validation') ||
                           error.message?.toLowerCase().includes('consistency')

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <AlertTriangle className="h-12 w-12 text-red-500" />
          </div>
          <CardTitle className="text-xl text-red-600">
            Erro na Verificação de Integridade
          </CardTitle>
          <CardDescription className="text-gray-600">
            Ocorreu um problema durante a análise de integridade dos dados financeiros.
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-sm text-red-700">
              <strong>Erro:</strong> {error.message || 'Erro desconhecido na verificação de integridade'}
            </p>
            {error.digest && (
              <p className="text-sm text-red-600 mt-1">
                <strong>ID:</strong> {error.digest}
              </p>
            )}
          </div>

          {isBalanceError && (
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
              <h4 className="text-sm font-medium text-orange-800 mb-2">
                Problema com cálculo de saldos:
              </h4>
              <ul className="text-sm text-orange-700 space-y-1">
                <li>• Pode haver inconsistências entre snapshots e transações</li>
                <li>• Verifique se existem transferências desbalanceadas</li>
                <li>• Tente recalcular os snapshots de saldos</li>
                <li>• Alguns saldos podem estar desatualizados</li>
              </ul>
            </div>
          )}

          {isValidationError && (
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
              <h4 className="text-sm font-medium text-orange-800 mb-2">
                Problema na validação de dados:
              </h4>
              <ul className="text-sm text-orange-700 space-y-1">
                <li>• Pode haver transações com dados inconsistentes</li>
                <li>• Verifique se há categorias órfãs ou duplicadas</li>
                <li>• Algumas transações podem estar mal formatadas</li>
                <li>• Pode haver conflitos entre dados importados</li>
              </ul>
            </div>
          )}

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="text-sm font-medium text-blue-800 mb-2">
              Impacto nos seus dados:
            </h4>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>• Seus dados financeiros permanecem seguros</li>
              <li>• Este é apenas um problema de verificação/exibição</li>
              <li>• Transações individuais não foram afetadas</li>
              <li>• Você pode continuar usando outras funcionalidades</li>
            </ul>
          </div>

          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <h4 className="text-sm font-medium text-green-800 mb-2">
              Próximos passos recomendados:
            </h4>
            <ul className="text-sm text-green-700 space-y-1">
              <li>• Tente recarregar a verificação de integridade</li>
              <li>• Verifique transações por conta individual</li>
              <li>• Execute uma nova importação se necessário</li>
              <li>• Entre em contato com suporte se persistir</li>
            </ul>
          </div>

          <div className="flex flex-col gap-3 pt-2">
            <Button 
              onClick={reset} 
              className="w-full"
              variant="default"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Tentar verificação novamente
            </Button>
            
            <Button 
              onClick={() => window.location.href = '/integridade'} 
              variant="outline"
              className="w-full"
            >
              <Shield className="w-4 h-4 mr-2" />
              Recarregar página de integridade
            </Button>

            <div className="flex gap-3">
              <Link href="/transacoes" className="flex-1">
                <Button variant="outline" className="w-full">
                  Ver transações
                </Button>
              </Link>
              <Link href="/bancos" className="flex-1">
                <Button variant="outline" className="w-full">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Ver contas
                </Button>
              </Link>
            </div>
          </div>

          <div className="text-xs text-gray-500 text-center pt-2">
            A verificação de integridade ajuda a identificar inconsistências, mas não afeta seus dados reais.
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
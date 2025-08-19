'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertTriangle, RefreshCw, Download, ArrowLeft } from 'lucide-react'
import { logger } from '@/lib/core/logger/logger'
import Link from 'next/link'

interface ErrorProps {
  error: Error & { digest?: string }
  reset: () => void
}

export default function TransacoesError({ error, reset }: ErrorProps) {
  useEffect(() => {
    // Log the error with transactions context
    logger.error('Transactions page error occurred', {
      error,
      errorName: error.name,
      errorMessage: error.message,
      errorDigest: error.digest,
      section: 'transacoes',
      userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : undefined,
      url: typeof window !== 'undefined' ? window.location.href : undefined,
      timestamp: new Date().toISOString(),
    })
  }, [error])

  const isFilterError = error.message?.toLowerCase().includes('filtro') || 
                       error.message?.toLowerCase().includes('filter') ||
                       error.message?.toLowerCase().includes('busca')
  
  const isLoadError = error.message?.toLowerCase().includes('carregar') ||
                     error.message?.toLowerCase().includes('loading') ||
                     error.message?.toLowerCase().includes('fetch')

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <AlertTriangle className="h-12 w-12 text-red-500" />
          </div>
          <CardTitle className="text-xl text-red-600">
            Erro ao Carregar Transações
          </CardTitle>
          <CardDescription className="text-gray-600">
            Ocorreu um problema ao exibir suas transações financeiras.
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-sm text-red-700">
              <strong>Erro:</strong> {error.message || 'Erro desconhecido ao carregar transações'}
            </p>
            {error.digest && (
              <p className="text-sm text-red-600 mt-1">
                <strong>ID:</strong> {error.digest}
              </p>
            )}
          </div>

          {isFilterError && (
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
              <h4 className="text-sm font-medium text-orange-800 mb-2">
                Problema com filtros de busca:
              </h4>
              <ul className="text-sm text-orange-700 space-y-1">
                <li>• Verifique se as datas informadas são válidas</li>
                <li>• Limpe os filtros e tente novamente</li>
                <li>• Verifique se a conta selecionada existe</li>
                <li>• Tente uma busca mais simples primeiro</li>
              </ul>
            </div>
          )}

          {isLoadError && (
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
              <h4 className="text-sm font-medium text-orange-800 mb-2">
                Problema ao carregar dados:
              </h4>
              <ul className="text-sm text-orange-700 space-y-1">
                <li>• Verifique sua conexão com a internet</li>
                <li>• O servidor pode estar temporariamente indisponível</li>
                <li>• Tente recarregar a página</li>
                <li>• Se persistir, pode ser um problema com muitos dados</li>
              </ul>
            </div>
          )}

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="text-sm font-medium text-blue-800 mb-2">
              Seus dados estão seguros:
            </h4>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>• Todas as transações estão salvas no banco de dados</li>
              <li>• Nenhum dado financeiro foi perdido</li>
              <li>• Este é apenas um erro de exibição</li>
              <li>• Você pode acessar outras seções normalmente</li>
            </ul>
          </div>

          <div className="flex flex-col gap-3 pt-2">
            <Button 
              onClick={reset} 
              className="w-full"
              variant="default"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Recarregar transações
            </Button>
            
            <Button 
              onClick={() => window.location.href = '/transacoes'} 
              variant="outline"
              className="w-full"
            >
              <Download className="w-4 h-4 mr-2" />
              Limpar filtros e recarregar
            </Button>

            <Link href="/bancos" className="w-full">
              <Button variant="outline" className="w-full">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Ver contas bancárias
              </Button>
            </Link>
          </div>

          <div className="text-xs text-gray-500 text-center pt-2">
            Em caso de problemas persistentes, tente acessar uma conta específica ou período menor.
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertTriangle, RefreshCw, Settings, ArrowLeft } from 'lucide-react'
import { logger } from '@/lib/logger'
import Link from 'next/link'

interface ErrorProps {
  error: Error & { digest?: string }
  reset: () => void
}

export default function RegraCategorizacaoError({ error, reset }: ErrorProps) {
  useEffect(() => {
    // Log the error with categorization rules context
    logger.error('Categorization rules error occurred', {
      error,
      errorName: error.name,
      errorMessage: error.message,
      errorDigest: error.digest,
      section: 'regras-categorizacao',
      userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : undefined,
      url: typeof window !== 'undefined' ? window.location.href : undefined,
      timestamp: new Date().toISOString(),
    })
  }, [error])

  const isRuleError = error.message?.toLowerCase().includes('regra') || 
                     error.message?.toLowerCase().includes('rule') ||
                     error.message?.toLowerCase().includes('categoria')
  
  const isValidationError = error.message?.toLowerCase().includes('validação') ||
                           error.message?.toLowerCase().includes('validation') ||
                           error.message?.toLowerCase().includes('critério')

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <AlertTriangle className="h-12 w-12 text-red-500" />
          </div>
          <CardTitle className="text-xl text-red-600">
            Erro nas Regras de Categorização
          </CardTitle>
          <CardDescription className="text-gray-600">
            Ocorreu um problema ao gerenciar as regras de categorização automática.
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-sm text-red-700">
              <strong>Erro:</strong> {error.message || 'Erro desconhecido nas regras de categorização'}
            </p>
            {error.digest && (
              <p className="text-sm text-red-600 mt-1">
                <strong>ID:</strong> {error.digest}
              </p>
            )}
          </div>

          {isRuleError && (
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
              <h4 className="text-sm font-medium text-orange-800 mb-2">
                Problema com regras de categorização:
              </h4>
              <ul className="text-sm text-orange-700 space-y-1">
                <li>• Verifique se a regra tem todos os campos obrigatórios</li>
                <li>• A categoria selecionada pode não existir mais</li>
                <li>• Pode haver conflito entre regras existentes</li>
                <li>• Verifique se os critérios da regra estão corretos</li>
              </ul>
            </div>
          )}

          {isValidationError && (
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
              <h4 className="text-sm font-medium text-orange-800 mb-2">
                Problema na validação da regra:
              </h4>
              <ul className="text-sm text-orange-700 space-y-1">
                <li>• Verifique se os valores inseridos são válidos</li>
                <li>• Datas devem estar no formato correto</li>
                <li>• Valores monetários devem ser números válidos</li>
                <li>• Descrições não podem conter caracteres especiais</li>
              </ul>
            </div>
          )}

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="text-sm font-medium text-blue-800 mb-2">
              Suas regras estão seguras:
            </h4>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>• Regras existentes não foram afetadas</li>
              <li>• Categorizações já aplicadas permanecem inalteradas</li>
              <li>• Você pode continuar usando outras funcionalidades</li>
              <li>• Este é apenas um problema de gerenciamento de regras</li>
            </ul>
          </div>

          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <h4 className="text-sm font-medium text-green-800 mb-2">
              Como resolver:
            </h4>
            <ul className="text-sm text-green-700 space-y-1">
              <li>• Tente simplificar a regra removendo critérios complexos</li>
              <li>• Verifique se a categoria de destino existe</li>
              <li>• Teste a regra com uma transação específica primeiro</li>
              <li>• Você pode categorizar manualmente enquanto resolve o problema</li>
            </ul>
          </div>

          <div className="flex flex-col gap-3 pt-2">
            <Button 
              onClick={reset} 
              className="w-full"
              variant="default"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Tentar novamente
            </Button>
            
            <Button 
              onClick={() => window.location.href = '/regras-categorizacao'} 
              variant="outline"
              className="w-full"
            >
              <Settings className="w-4 h-4 mr-2" />
              Recarregar regras de categorização
            </Button>

            <div className="flex gap-3">
              <Link href="/transacoes" className="flex-1">
                <Button variant="outline" className="w-full">
                  Ver transações
                </Button>
              </Link>
              <Link href="/categorias" className="flex-1">
                <Button variant="outline" className="w-full">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Gerenciar categorias
                </Button>
              </Link>
            </div>
          </div>

          <div className="text-xs text-gray-500 text-center pt-2">
            Você sempre pode categorizar transações manualmente enquanto resolve problemas com regras.
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertTriangle, RefreshCw, Home } from 'lucide-react'
import { logger } from '@/lib/core/logger/logger'

interface ErrorProps {
  error: Error & { digest?: string }
  reset: () => void
}

export default function Error({ error, reset }: ErrorProps) {
  useEffect(() => {
    // Log the error for monitoring
    logger.error('Global application error occurred', {
      error,
      errorName: error.name,
      errorMessage: error.message,
      errorDigest: error.digest,
      userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : undefined,
      url: typeof window !== 'undefined' ? window.location.href : undefined,
      timestamp: new Date().toISOString(),
    })
  }, [error])

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <AlertTriangle className="h-12 w-12 text-red-500" />
          </div>
          <CardTitle className="text-xl text-red-600">
            Oops! Algo deu errado
          </CardTitle>
          <CardDescription className="text-gray-600">
            Ocorreu um erro inesperado no sistema. Nossos dados financeiros estão seguros.
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-sm text-red-700">
              <strong>Erro:</strong> {error.message || 'Erro desconhecido'}
            </p>
            {error.digest && (
              <p className="text-sm text-red-600 mt-1">
                <strong>ID:</strong> {error.digest}
              </p>
            )}
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="text-sm font-medium text-blue-800 mb-2">
              O que você pode fazer:
            </h4>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>• Tente recarregar a página</li>
              <li>• Verifique sua conexão com a internet</li>
              <li>• Se o problema persistir, entre em contato com o suporte</li>
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
              onClick={() => window.location.href = '/'} 
              variant="outline"
              className="w-full"
            >
              <Home className="w-4 h-4 mr-2" />
              Voltar ao início
            </Button>
          </div>

          <div className="text-xs text-gray-500 text-center pt-2">
            Seus dados financeiros estão seguros e não foram afetados por este erro.
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
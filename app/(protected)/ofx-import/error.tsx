'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertTriangle, RefreshCw, Upload, ArrowLeft } from 'lucide-react'
import { logger } from '@/lib/core/logger/logger'
import Link from 'next/link'

interface ErrorProps {
  error: Error & { digest?: string }
  reset: () => void
}

export default function OFXImportError({ error, reset }: ErrorProps) {
  useEffect(() => {
    // Log the error with OFX import context
    logger.error('OFX Import error occurred', {
      error,
      errorName: error.name,
      errorMessage: error.message,
      errorDigest: error.digest,
      section: 'ofx-import',
      userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : undefined,
      url: typeof window !== 'undefined' ? window.location.href : undefined,
      timestamp: new Date().toISOString(),
    })
  }, [error])

  const isFileError = error.message?.toLowerCase().includes('arquivo') || 
                     error.message?.toLowerCase().includes('file') ||
                     error.message?.toLowerCase().includes('ofx')
  
  const isDatabaseError = error.message?.toLowerCase().includes('database') ||
                         error.message?.toLowerCase().includes('prisma') ||
                         error.message?.toLowerCase().includes('conexão')

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <AlertTriangle className="h-12 w-12 text-red-500" />
          </div>
          <CardTitle className="text-xl text-red-600">
            Erro na Importação OFX
          </CardTitle>
          <CardDescription className="text-gray-600">
            Ocorreu um problema durante o processo de importação do arquivo OFX.
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-sm text-red-700">
              <strong>Erro:</strong> {error.message || 'Erro desconhecido durante a importação'}
            </p>
            {error.digest && (
              <p className="text-sm text-red-600 mt-1">
                <strong>ID:</strong> {error.digest}
              </p>
            )}
          </div>

          {isFileError && (
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
              <h4 className="text-sm font-medium text-orange-800 mb-2">
                Problema com o arquivo OFX:
              </h4>
              <ul className="text-sm text-orange-700 space-y-1">
                <li>• Verifique se o arquivo está no formato OFX correto</li>
                <li>• Certifique-se que o arquivo não está corrompido</li>
                <li>• Tente baixar o arquivo novamente do seu banco</li>
                <li>• Verifique se o tamanho do arquivo não excede o limite</li>
              </ul>
            </div>
          )}

          {isDatabaseError && (
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
              <h4 className="text-sm font-medium text-orange-800 mb-2">
                Problema de conexão com o banco de dados:
              </h4>
              <ul className="text-sm text-orange-700 space-y-1">
                <li>• Tente novamente em alguns instantes</li>
                <li>• Verifique sua conexão com a internet</li>
                <li>• O sistema pode estar temporariamente indisponível</li>
              </ul>
            </div>
          )}

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="text-sm font-medium text-blue-800 mb-2">
              Suas transações estão seguras:
            </h4>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>• Nenhum dado foi perdido ou corrompido</li>
              <li>• As transações existentes não foram afetadas</li>
              <li>• Você pode tentar importar o arquivo novamente</li>
              <li>• Em caso de importação parcial, apenas as novas transações serão processadas</li>
            </ul>
          </div>

          <div className="flex flex-col gap-3 pt-2">
            <Button 
              onClick={reset} 
              className="w-full"
              variant="default"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Tentar importação novamente
            </Button>
            
            <Button 
              onClick={() => window.location.reload()} 
              variant="outline"
              className="w-full"
            >
              <Upload className="w-4 h-4 mr-2" />
              Selecionar novo arquivo
            </Button>

            <Link href="/transacoes" className="w-full">
              <Button variant="outline" className="w-full">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Ver transações existentes
              </Button>
            </Link>
          </div>

          <div className="text-xs text-gray-500 text-center pt-2">
            Se o problema persistir, verifique o formato do arquivo OFX ou entre em contato com o suporte.
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
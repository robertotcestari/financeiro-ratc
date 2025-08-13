'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertTriangle, RefreshCw, Users, ArrowLeft } from 'lucide-react'
import { logger } from '@/lib/logger'
import Link from 'next/link'

interface ErrorProps {
  error: Error & { digest?: string }
  reset: () => void
}

export default function CadastrosError({ error, reset }: ErrorProps) {
  useEffect(() => {
    // Log the error with registrations context
    logger.error('Registrations/Cadastros error occurred', {
      error,
      errorName: error.name,
      errorMessage: error.message,
      errorDigest: error.digest,
      section: 'cadastros',
      userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : undefined,
      url: typeof window !== 'undefined' ? window.location.href : undefined,
      timestamp: new Date().toISOString(),
    })
  }, [error])

  const isFormError = error.message?.toLowerCase().includes('formulário') || 
                     error.message?.toLowerCase().includes('form') ||
                     error.message?.toLowerCase().includes('validação')
  
  const isDataError = error.message?.toLowerCase().includes('salvar') ||
                     error.message?.toLowerCase().includes('cadastro') ||
                     error.message?.toLowerCase().includes('registro')

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <AlertTriangle className="h-12 w-12 text-red-500" />
          </div>
          <CardTitle className="text-xl text-red-600">
            Erro nos Cadastros
          </CardTitle>
          <CardDescription className="text-gray-600">
            Ocorreu um problema ao gerenciar os cadastros do sistema.
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-sm text-red-700">
              <strong>Erro:</strong> {error.message || 'Erro desconhecido nos cadastros'}
            </p>
            {error.digest && (
              <p className="text-sm text-red-600 mt-1">
                <strong>ID:</strong> {error.digest}
              </p>
            )}
          </div>

          {isFormError && (
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
              <h4 className="text-sm font-medium text-orange-800 mb-2">
                Problema no formulário:
              </h4>
              <ul className="text-sm text-orange-700 space-y-1">
                <li>• Verifique se todos os campos obrigatórios foram preenchidos</li>
                <li>• Certifique-se que os dados estão no formato correto</li>
                <li>• Alguns caracteres especiais podem não ser aceitos</li>
                <li>• Tente limpar o formulário e preencher novamente</li>
              </ul>
            </div>
          )}

          {isDataError && (
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
              <h4 className="text-sm font-medium text-orange-800 mb-2">
                Problema ao salvar dados:
              </h4>
              <ul className="text-sm text-orange-700 space-y-1">
                <li>• Verifique sua conexão com a internet</li>
                <li>• Pode haver problemas temporários com o servidor</li>
                <li>• O registro pode já existir no sistema</li>
                <li>• Tente novamente em alguns instantes</li>
              </ul>
            </div>
          )}

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="text-sm font-medium text-blue-800 mb-2">
              Seus cadastros estão seguros:
            </h4>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>• Cadastros existentes não foram afetados</li>
              <li>• Dados já salvos permanecem íntegros</li>
              <li>• Você pode continuar usando outras funcionalidades</li>
              <li>• Este é apenas um problema temporário de cadastro</li>
            </ul>
          </div>

          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <h4 className="text-sm font-medium text-green-800 mb-2">
              Como resolver:
            </h4>
            <ul className="text-sm text-green-700 space-y-1">
              <li>• Tente recarregar a página e preencher novamente</li>
              <li>• Verifique se o item já não existe na lista</li>
              <li>• Simplifique os dados e tente cadastrar por partes</li>
              <li>• Use funcionalidades básicas enquanto resolve o problema</li>
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
              onClick={() => window.location.href = '/cadastros'} 
              variant="outline"
              className="w-full"
            >
              <Users className="w-4 h-4 mr-2" />
              Recarregar página de cadastros
            </Button>

            <div className="flex gap-3">
              <Link href="/bancos" className="flex-1">
                <Button variant="outline" className="w-full">
                  Ver contas bancárias
                </Button>
              </Link>
              <Link href="/" className="flex-1">
                <Button variant="outline" className="w-full">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Voltar ao início
                </Button>
              </Link>
            </div>
          </div>

          <div className="text-xs text-gray-500 text-center pt-2">
            Os cadastros são opcionais. Você pode usar o sistema normalmente mesmo sem alguns cadastros.
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
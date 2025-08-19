import { auth } from "@/lib/core/auth/auth";
import { headers } from "next/headers";
import Image from "next/image";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { User, Shield, Bell, Palette, Database } from "lucide-react";

export default async function SettingsPage() {
  // Get session from Better Auth
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  // Session will always exist here because middleware protects this route
  const user = session!.user;

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Configurações</h1>
        <p className="text-muted-foreground mt-2">
          Gerencie suas preferências e configurações da conta
        </p>
      </div>

      <div className="space-y-6">
        {/* Profile Section */}
        <Card>
          <CardHeader>
            <div className="flex items-center space-x-2">
              <User className="h-5 w-5" />
              <CardTitle>Perfil</CardTitle>
            </div>
            <CardDescription>
              Suas informações pessoais
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">
                  Nome
                </label>
                <p className="text-lg">{user.name || "Não informado"}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">
                  Email
                </label>
                <p className="text-lg">{user.email}</p>
              </div>
            </div>
            
            {user.image && (
              <div>
                <label className="text-sm font-medium text-muted-foreground">
                  Foto do Perfil
                </label>
                <div className="mt-2">
                  <Image 
                    src={user.image} 
                    alt={user.name || "Profile"} 
                    width={80}
                    height={80}
                    className="h-20 w-20 rounded-full"
                  />
                </div>
              </div>
            )}

            <Separator className="my-4" />
            
            <div>
              <label className="text-sm font-medium text-muted-foreground">
                ID da Conta
              </label>
              <p className="text-sm font-mono text-muted-foreground">{user.id}</p>
            </div>
            
            <div>
              <label className="text-sm font-medium text-muted-foreground">
                Conta Criada
              </label>
              <p className="text-sm text-muted-foreground">
                {(() => {
                  const createdAt = user.createdAt;
                  let date: Date;
                  
                  if (typeof createdAt === 'string') {
                    date = new Date(createdAt);
                  } else if (typeof createdAt === 'number') {
                    // Check if it's likely milliseconds or seconds
                    if (createdAt < 10000000000) {
                      date = new Date(createdAt * 1000);
                    } else {
                      date = new Date(createdAt);
                    }
                  } else if (createdAt instanceof Date) {
                    date = createdAt;
                  } else {
                    return "Data não disponível";
                  }
                  
                  if (isNaN(date.getTime())) {
                    return "Data não disponível";
                  }
                  
                  return date.toLocaleDateString('pt-BR', {
                    day: '2-digit',
                    month: 'long',
                    year: 'numeric'
                  });
                })()}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Security Section */}
        <Card>
          <CardHeader>
            <div className="flex items-center space-x-2">
              <Shield className="h-5 w-5" />
              <CardTitle>Segurança</CardTitle>
            </div>
            <CardDescription>
              Configurações de autenticação e segurança
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Provedor de Autenticação</p>
                  <p className="text-sm text-muted-foreground">
                    Você está autenticado via Google OAuth
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="h-2 w-2 bg-green-500 rounded-full" />
                  <span className="text-sm text-green-600">Conectado</span>
                </div>
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Verificação de Email</p>
                  <p className="text-sm text-muted-foreground">
                    Status da verificação do seu email
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  {user.emailVerified ? (
                    <>
                      <div className="h-2 w-2 bg-green-500 rounded-full" />
                      <span className="text-sm text-green-600">Verificado</span>
                    </>
                  ) : (
                    <>
                      <div className="h-2 w-2 bg-yellow-500 rounded-full" />
                      <span className="text-sm text-yellow-600">Não verificado</span>
                    </>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Preferences Section */}
        <Card>
          <CardHeader>
            <div className="flex items-center space-x-2">
              <Palette className="h-5 w-5" />
              <CardTitle>Preferências</CardTitle>
            </div>
            <CardDescription>
              Personalize sua experiência
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Tema</p>
                  <p className="text-sm text-muted-foreground">
                    Escolha entre tema claro ou escuro
                  </p>
                </div>
                <Button variant="outline" size="sm" disabled>
                  Em breve
                </Button>
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Idioma</p>
                  <p className="text-sm text-muted-foreground">
                    Português (Brasil)
                  </p>
                </div>
                <Button variant="outline" size="sm" disabled>
                  PT-BR
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Notifications Section */}
        <Card>
          <CardHeader>
            <div className="flex items-center space-x-2">
              <Bell className="h-5 w-5" />
              <CardTitle>Notificações</CardTitle>
            </div>
            <CardDescription>
              Configure suas preferências de notificação
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Notificações por Email</p>
                  <p className="text-sm text-muted-foreground">
                    Receba atualizações importantes por email
                  </p>
                </div>
                <Button variant="outline" size="sm" disabled>
                  Configurar
                </Button>
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Alertas do Sistema</p>
                  <p className="text-sm text-muted-foreground">
                    Notificações sobre importações e processamentos
                  </p>
                </div>
                <Button variant="outline" size="sm" disabled>
                  Configurar
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Data & Privacy Section */}
        <Card>
          <CardHeader>
            <div className="flex items-center space-x-2">
              <Database className="h-5 w-5" />
              <CardTitle>Dados e Privacidade</CardTitle>
            </div>
            <CardDescription>
              Gerencie seus dados e configurações de privacidade
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Exportar Dados</p>
                  <p className="text-sm text-muted-foreground">
                    Baixe uma cópia de todos os seus dados
                  </p>
                </div>
                <Button variant="outline" size="sm" disabled>
                  Exportar
                </Button>
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-red-600">Excluir Conta</p>
                  <p className="text-sm text-muted-foreground">
                    Remova permanentemente sua conta e todos os dados
                  </p>
                </div>
                <Button variant="destructive" size="sm" disabled>
                  Excluir Conta
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

      </div>
    </div>
  );
}

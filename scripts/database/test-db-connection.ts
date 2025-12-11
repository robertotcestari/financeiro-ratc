#!/usr/bin/env tsx
/**
 * Script para testar a conexão com o banco de dados
 * Uso: tsx scripts/database/test-db-connection.ts [local|remote]
 */

import { PrismaClient } from '@/app/generated/prisma'

const args = process.argv.slice(2)
const env = args[0] || 'local'

// Determinar qual DATABASE_URL usar
const getDatabaseUrl = (): string => {
  if (env === 'remote') {
    const remoteUrl = process.env.DATABASE_URL_REMOTE
    if (!remoteUrl) {
      throw new Error('DATABASE_URL_REMOTE não está configurado no .env')
    }
    console.log('🌐 Testando conexão REMOTA (produção)')
    return remoteUrl
  } else {
    const localUrl = process.env.DATABASE_URL
    if (!localUrl) {
      throw new Error('DATABASE_URL não está configurado no .env')
    }
    console.log('💻 Testando conexão LOCAL (desenvolvimento)')
    return localUrl
  }
}

async function testConnection() {
  let prisma: PrismaClient | null = null

  try {
    const databaseUrl = getDatabaseUrl()

    // Mostrar informações da conexão (mascarando a senha)
    const urlParts = databaseUrl.match(/mysql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/(.+)/)
    if (urlParts) {
      const [, user, , host, port, database] = urlParts
      console.log('\n📋 Informações da Conexão:')
      console.log(`   Usuário: ${user}`)
      console.log(`   Host: ${host}`)
      console.log(`   Porta: ${port}`)
      console.log(`   Database: ${database}`)
      console.log()
    }

    // Criar cliente Prisma com a URL específica
    prisma = new PrismaClient({
      datasources: {
        db: {
          url: databaseUrl
        }
      }
    })

    console.log('🔌 Conectando ao banco de dados...')

    // Testar conexão básica
    await prisma.$connect()
    console.log('✅ Conexão estabelecida com sucesso!')

    // Testar query simples
    console.log('\n🔍 Testando query...')
    const result = await prisma.$queryRaw`SELECT 1 as test`
    console.log('✅ Query executada com sucesso:', result)

    // Verificar tabelas do banco
    console.log('\n📊 Verificando estrutura do banco...')

    // Contar registros em algumas tabelas principais
    const [bankAccounts, categories, transactions] = await Promise.all([
      prisma.bankAccount.count(),
      prisma.category.count(),
      prisma.transaction.count()
    ])

    console.log('\n📈 Estatísticas:')
    console.log(`   Contas Bancárias: ${bankAccounts}`)
    console.log(`   Categorias: ${categories}`)
    console.log(`   Transações: ${transactions}`)

    // Listar contas bancárias
    console.log('\n🏦 Contas Bancárias:')
    const banks = await prisma.bankAccount.findMany({
      select: {
        name: true,
        bankName: true,
        isActive: true
      }
    })

    banks.forEach(bank => {
      const status = bank.isActive ? '✓' : '✗'
      console.log(`   ${status} ${bank.name} (${bank.bankName})`)
    })

    console.log('\n✨ Teste de conexão concluído com sucesso!')

  } catch (error) {
    console.error('\n❌ Erro ao conectar ao banco de dados:')

    if (error instanceof Error) {
      console.error(`   Mensagem: ${error.message}`)

      // Identificar tipos comuns de erro
      if (error.message.includes('ECONNREFUSED')) {
        console.error('\n💡 Dica: O servidor do banco de dados não está acessível.')
        console.error('   Verifique se:')
        console.error('   - O servidor MySQL está rodando')
        console.error('   - O host e porta estão corretos')
        console.error('   - O firewall permite a conexão')
      } else if (error.message.includes('Access denied')) {
        console.error('\n💡 Dica: Credenciais de acesso incorretas.')
        console.error('   Verifique se:')
        console.error('   - O usuário e senha estão corretos')
        console.error('   - O usuário tem permissões no banco de dados')
      } else if (error.message.includes('Unknown database')) {
        console.error('\n💡 Dica: O banco de dados não existe.')
        console.error('   Verifique se:')
        console.error('   - O nome do banco está correto')
        console.error('   - O banco foi criado no servidor')
      }
    } else {
      console.error(error)
    }

    process.exit(1)
  } finally {
    if (prisma) {
      await prisma.$disconnect()
      console.log('\n🔌 Conexão encerrada.')
    }
  }
}

// Executar teste
testConnection()

/**
 * Script para testar o sistema de logging com Pino
 * Execute com: npx tsx scripts/test-logger.ts
 */

import { logger, childLogger, createActionLogger, createDatabaseLogger } from '../lib/logger';

console.log('🔍 Testando sistema de logging com Pino...\n');

// Teste básico do logger principal
console.log('1. Teste do logger principal:');
logger.debug('Mensagem de debug', { component: 'test' });
logger.info('Mensagem informativa', { userId: '123', action: 'login' });
logger.warn('Mensagem de aviso', { threshold: 80, current: 85 });
logger.error('Mensagem de erro', { 
  error: new Error('Erro de teste'),
  context: 'test-script' 
});

console.log('\n2. Teste de child logger com contexto fixo:');
const userLogger = childLogger({ 
  userId: 'user-456',
  sessionId: 'session-789' 
});
userLogger.info('Usuário realizou ação', { action: 'view_dashboard' });
userLogger.debug('Debug info do usuário', { page: '/dashboard' });

console.log('\n3. Teste de logger para Server Actions:');
const actionLog = createActionLogger('testAction', { 
  inputParams: { test: true } 
});
actionLog.info('Executando ação de teste');
actionLog.warn('Ação demorou mais que o esperado', { duration: 1500 });

console.log('\n4. Teste de logger para banco de dados:');
const dbLog = createDatabaseLogger('SELECT', { 
  table: 'transactions',
  conditions: { status: 'pending' } 
});
dbLog.info('Query executada com sucesso', { rowCount: 42 });
dbLog.debug('SQL gerado', { sql: 'SELECT * FROM transactions WHERE status = ?' });

console.log('\n5. Teste de redação de dados sensíveis:');
logger.info('Teste de redação', {
  username: 'john.doe',
  password: 'senha-secreta-123', // Será redatado
  token: 'bearer-token-xyz',      // Será redatado
  apiKey: 'api-key-123',          // Será redatado
  cpf: '123.456.789-00',          // Será redatado
  creditCard: '1234-5678-9012-3456', // Será redatado
  publicInfo: 'Esta informação será visível'
});

console.log('\n✅ Teste concluído! Verifique os logs acima.');
console.log('Em desenvolvimento, os logs aparecem formatados com pino-pretty.');
console.log('Em produção, os logs são em formato JSON para melhor processamento.\n');
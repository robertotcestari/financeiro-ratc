import fs from 'fs';
import path from 'path';
import { logger } from '@/lib/core/logger/logger';

/**
 * Salva dados de debug da OpenAI em arquivos separados para análise completa
 */
export class OpenAIDebugLogger {
  private debugDir: string;
  private enabled: boolean;

  constructor() {
    this.debugDir = process.env.OPENAI_DEBUG_DIR || './logs/openai-debug';
    this.enabled = process.env.OPENAI_DEBUG === 'true';
    
    if (this.enabled) {
      // Criar diretório se não existir
      if (!fs.existsSync(this.debugDir)) {
        fs.mkdirSync(this.debugDir, { recursive: true });
      }
      logger.info('OpenAI Debug Logger habilitado', { debugDir: this.debugDir });
    }
  }

  /**
   * Salva o request completo em arquivo
   */
  saveRequest(transactionId: string, request: unknown): string | null {
    if (!this.enabled) return null;
    
    try {
      const timestamp = new Date().toISOString().replace(/:/g, '-');
      const filename = `request_${transactionId}_${timestamp}.json`;
      const filepath = path.join(this.debugDir, filename);
      
      fs.writeFileSync(filepath, JSON.stringify(request, null, 2));
      
      logger.info('📝 Request OpenAI salvo em arquivo', { 
        file: filepath,
        size: fs.statSync(filepath).size + ' bytes'
      });
      
      return filepath;
    } catch (error) {
      logger.error('Erro ao salvar request OpenAI', { error });
      return null;
    }
  }

  /**
   * Salva o response completo em arquivo
   */
  saveResponse(transactionId: string, response: unknown): string | null {
    if (!this.enabled) return null;
    
    try {
      const timestamp = new Date().toISOString().replace(/:/g, '-');
      const filename = `response_${transactionId}_${timestamp}.json`;
      const filepath = path.join(this.debugDir, filename);
      
      fs.writeFileSync(filepath, JSON.stringify(response, null, 2));
      
      logger.info('📝 Response OpenAI salvo em arquivo', { 
        file: filepath,
        size: fs.statSync(filepath).size + ' bytes'
      });
      
      return filepath;
    } catch (error) {
      logger.error('Erro ao salvar response OpenAI', { error });
      return null;
    }
  }

  /**
   * Salva request e response de batch
   */
  saveBatch(batchId: string, request: unknown, response: unknown): void {
    if (!this.enabled) return;
    
    try {
      const timestamp = new Date().toISOString().replace(/:/g, '-');
      
      // Salvar request
      const requestFile = path.join(this.debugDir, `batch_request_${batchId}_${timestamp}.json`);
      fs.writeFileSync(requestFile, JSON.stringify(request, null, 2));
      
      // Salvar response
      const responseFile = path.join(this.debugDir, `batch_response_${batchId}_${timestamp}.json`);
      fs.writeFileSync(responseFile, JSON.stringify(response, null, 2));
      
      logger.info('📦 Batch OpenAI salvo em arquivos', { 
        requestFile,
        responseFile,
        requestSize: fs.statSync(requestFile).size + ' bytes',
        responseSize: fs.statSync(responseFile).size + ' bytes'
      });
    } catch (error) {
      logger.error('Erro ao salvar batch OpenAI', { error });
    }
  }
}

// Instância singleton
export const openAIDebugLogger = new OpenAIDebugLogger();
/**
 * Database Backup Command
 *
 * Creates a backup of the production database via SSH.
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { printSuccess, printError, printInfo, printHeader } from '../utils/output';

export interface BackupOptions {
  json?: boolean;
  output?: string;
}

interface BackupResult {
  success: boolean;
  filename: string;
  path: string;
  size: string;
  timestamp: string;
}

const SSH_HOST = 'robertotcestari@64.176.5.254';
const DB_NAME = 'financeiro_ratc';
const DEFAULT_BACKUP_DIR = 'data/backups';

/**
 * Creates a backup of the production database
 */
export async function createBackup(options: BackupOptions = {}): Promise<BackupResult | null> {
  const { json, output } = options;

  // Determine backup directory and filename
  const backupDir = output ? path.dirname(output) : DEFAULT_BACKUP_DIR;
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const filename = output ? path.basename(output) : `backup-${timestamp}.sql`;
  const fullPath = path.join(backupDir, filename);

  if (!json) {
    printHeader('Backup do Banco de Dados');
    printInfo(`Conectando ao servidor de producao...`);
  }

  try {
    // Ensure backup directory exists
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
      if (!json) {
        printInfo(`Diretorio criado: ${backupDir}`);
      }
    }

    // Execute mysqldump via SSH
    const command = `ssh ${SSH_HOST} "sudo mysqldump -u root ${DB_NAME}" > "${fullPath}"`;

    if (!json) {
      printInfo(`Executando backup...`);
    }

    execSync(command, {
      stdio: ['pipe', 'pipe', 'pipe'],
      timeout: 120000, // 2 minutes timeout
    });

    // Verify backup was created and get size
    if (!fs.existsSync(fullPath)) {
      throw new Error('Arquivo de backup nao foi criado');
    }

    const stats = fs.statSync(fullPath);
    const sizeInMB = (stats.size / (1024 * 1024)).toFixed(2);

    // Verify backup has content
    if (stats.size < 1000) {
      throw new Error('Arquivo de backup parece estar vazio ou corrompido');
    }

    const result: BackupResult = {
      success: true,
      filename,
      path: fullPath,
      size: `${sizeInMB} MB`,
      timestamp,
    };

    if (json) {
      console.log(JSON.stringify(result, null, 2));
    } else {
      printSuccess(`Backup criado com sucesso!`);
      console.log('');
      console.log(`  Arquivo:  ${filename}`);
      console.log(`  Caminho:  ${fullPath}`);
      console.log(`  Tamanho:  ${sizeInMB} MB`);
      console.log(`  Data:     ${new Date().toLocaleString('pt-BR')}`);
    }

    return result;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';

    if (json) {
      console.log(JSON.stringify({ success: false, error: errorMessage }, null, 2));
    } else {
      printError(`Falha ao criar backup: ${errorMessage}`);
      console.log('');
      console.log('Verifique:');
      console.log('  1. Conexao SSH com o servidor de producao');
      console.log('  2. Permissoes de sudo para mysqldump');
      console.log('  3. Acesso ao banco de dados');
    }

    return null;
  }
}

/**
 * Lists existing backups
 */
export async function listBackups(options: { json?: boolean } = {}): Promise<void> {
  const { json } = options;

  if (!fs.existsSync(DEFAULT_BACKUP_DIR)) {
    if (json) {
      console.log(JSON.stringify({ backups: [] }, null, 2));
    } else {
      printInfo('Nenhum backup encontrado.');
    }
    return;
  }

  const files = fs.readdirSync(DEFAULT_BACKUP_DIR)
    .filter(f => f.endsWith('.sql'))
    .map(filename => {
      const fullPath = path.join(DEFAULT_BACKUP_DIR, filename);
      const stats = fs.statSync(fullPath);
      return {
        filename,
        path: fullPath,
        size: `${(stats.size / (1024 * 1024)).toFixed(2)} MB`,
        created: stats.mtime.toISOString(),
      };
    })
    .sort((a, b) => new Date(b.created).getTime() - new Date(a.created).getTime());

  if (json) {
    console.log(JSON.stringify({ backups: files }, null, 2));
  } else {
    printHeader('Backups Disponiveis');

    if (files.length === 0) {
      printInfo('Nenhum backup encontrado.');
      return;
    }

    console.log('');
    for (const file of files) {
      console.log(`  ${file.filename}`);
      console.log(`    Tamanho: ${file.size}`);
      console.log(`    Data:    ${new Date(file.created).toLocaleString('pt-BR')}`);
      console.log('');
    }

    console.log(`Total: ${files.length} backup(s)`);
  }
}

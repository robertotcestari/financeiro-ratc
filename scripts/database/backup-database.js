#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config();

function parseConnectionString(databaseUrl) {
  if (!databaseUrl) {
    throw new Error('DATABASE_URL não está definida no arquivo .env');
  }

  const url = new URL(databaseUrl);
  
  return {
    host: url.hostname,
    port: url.port || '3306',
    username: url.username,
    password: url.password,
    database: url.pathname.slice(1) // Remove the leading slash
  };
}

function createBackupDirectory() {
  const backupDir = path.join(process.cwd(), 'backups');
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
    console.log('📁 Pasta backups/ criada');
  }
  return backupDir;
}

function generateTimestamp() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hour = String(now.getHours()).padStart(2, '0');
  const minute = String(now.getMinutes()).padStart(2, '0');
  const second = String(now.getSeconds()).padStart(2, '0');
  
  return `${year}-${month}-${day}-${hour}-${minute}-${second}`;
}

function checkDependencies() {
  try {
    execSync('which mysqldump', { stdio: 'ignore' });
  } catch (error) {
    throw new Error('mysqldump não está instalado ou não está no PATH');
  }

  try {
    execSync('which gzip', { stdio: 'ignore' });
  } catch (error) {
    throw new Error('gzip não está instalado ou não está no PATH');
  }
}

function createBackup() {
  console.log('🔄 Iniciando backup da database...');
  
  try {
    // Check dependencies
    checkDependencies();
    
    // Parse connection string
    const dbConfig = parseConnectionString(process.env.DATABASE_URL);
    
    // Create backup directory
    const backupDir = createBackupDirectory();
    
    // Generate filename with timestamp
    const timestamp = generateTimestamp();
    const filename = `backup-${timestamp}.sql.gz`;
    const filepath = path.join(backupDir, filename);
    
    // Build mysqldump command with gzip compression
    const mysqldumpCommand = [
      'mysqldump',
      `--host=${dbConfig.host}`,
      `--port=${dbConfig.port}`,
      `--user=${dbConfig.username}`,
      `--password=${dbConfig.password}`,
      '--single-transaction',
      '--routines',
      '--triggers',
      '--quick',
      '--no-autocommit',
      dbConfig.database
    ].join(' ');
    
    const fullCommand = `${mysqldumpCommand} | gzip > "${filepath}"`;
    
    console.log('📊 Executando backup...');
    const startTime = Date.now();
    
    execSync(fullCommand, { stdio: 'inherit' });
    
    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);
    
    // Get file size
    const stats = fs.statSync(filepath);
    const fileSizeMB = (stats.size / (1024 * 1024)).toFixed(2);
    
    console.log('✅ Backup concluído com sucesso!');
    console.log(`📁 Arquivo: ${filename}`);
    console.log(`📏 Tamanho: ${fileSizeMB} MB (comprimido)`);
    console.log(`⏱️  Tempo: ${duration}s`);
    console.log(`📍 Local: ${filepath}`);
    
  } catch (error) {
    console.error('❌ Erro ao criar backup:', error.message);
    process.exit(1);
  }
}

// Execute backup
createBackup();
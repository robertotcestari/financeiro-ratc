import fs from 'fs'
import path from 'path'
import { pipeline } from 'stream/promises'
import { createGzip } from 'zlib'
import { spawn } from 'child_process'

export interface DatabaseBackupResult {
  filename: string
  filepath: string
  sizeBytes: number
  sizeHuman: string
  durationMs: number
  createdAt: string
}

interface DatabaseConfig {
  host: string
  port: string
  username: string
  password: string
  database: string
}

function parseConnectionString(databaseUrl: string | undefined): DatabaseConfig {
  if (!databaseUrl) {
    throw new Error('DATABASE_URL não está definida')
  }

  const url = new URL(databaseUrl)

  return {
    host: url.hostname,
    port: url.port || '3306',
    username: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    database: url.pathname.slice(1),
  }
}

function generateTimestamp(): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  const hour = String(now.getHours()).padStart(2, '0')
  const minute = String(now.getMinutes()).padStart(2, '0')
  const second = String(now.getSeconds()).padStart(2, '0')

  return `${year}-${month}-${day}-${hour}-${minute}-${second}`
}

function formatSize(bytes: number): string {
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}

function resolveBackupDirectory(): string {
  const explicitDir = process.env.BACKUP_DIR?.trim()
  if (explicitDir) {
    return path.resolve(explicitDir)
  }

  const cwd = process.cwd()
  if (cwd.startsWith('/opt/financeiro-ratc/')) {
    return '/opt/financeiro-ratc/shared/backups'
  }

  return path.join(cwd, 'backups')
}

async function ensureCommandAvailable(command: string): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const child = spawn('which', [command], { stdio: 'ignore' })

    child.on('error', reject)
    child.on('close', (code) => {
      if (code === 0) {
        resolve()
        return
      }
      reject(new Error(`${command} não está instalado ou não está no PATH`))
    })
  })
}

export async function createDatabaseBackup(): Promise<DatabaseBackupResult> {
  await ensureCommandAvailable('mysqldump')

  const dbConfig = parseConnectionString(process.env.DATABASE_URL)
  const backupDir = resolveBackupDirectory()
  fs.mkdirSync(backupDir, { recursive: true })

  const timestamp = generateTimestamp()
  const filename = `backup-${timestamp}.sql.gz`
  const filepath = path.join(backupDir, filename)
  const createdAt = new Date().toISOString()
  const start = Date.now()

  const dump = spawn(
    'mysqldump',
    [
      `--host=${dbConfig.host}`,
      `--port=${dbConfig.port}`,
      `--user=${dbConfig.username}`,
      `--password=${dbConfig.password}`,
      '--single-transaction',
      '--routines',
      '--triggers',
      '--quick',
      '--no-autocommit',
      dbConfig.database,
    ],
    {
      stdio: ['ignore', 'pipe', 'pipe'],
    }
  )

  let stderr = ''
  dump.stderr.on('data', (chunk) => {
    stderr += chunk.toString()
  })

  const output = fs.createWriteStream(filepath)

  try {
    await pipeline(dump.stdout, createGzip(), output)
  } catch (error) {
    if (fs.existsSync(filepath)) {
      fs.rmSync(filepath, { force: true })
    }
    throw error
  }

  const exitCode = await new Promise<number>((resolve, reject) => {
    dump.on('error', reject)
    dump.on('close', resolve)
  })

  if (exitCode !== 0) {
    if (fs.existsSync(filepath)) {
      fs.rmSync(filepath, { force: true })
    }
    throw new Error(stderr.trim() || `mysqldump falhou com código ${exitCode}`)
  }

  const stats = fs.statSync(filepath)
  if (stats.size < 1024) {
    fs.rmSync(filepath, { force: true })
    throw new Error('Arquivo de backup parece estar vazio ou corrompido')
  }

  return {
    filename,
    filepath,
    sizeBytes: stats.size,
    sizeHuman: formatSize(stats.size),
    durationMs: Date.now() - start,
    createdAt,
  }
}

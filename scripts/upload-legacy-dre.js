#!/usr/bin/env node

require('dotenv').config({ path: '.env.local' });
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const fs = require('fs');
const path = require('path');

// Configuração do S3
const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

const BUCKET = process.env.S3_BUCKET;
const BASE_DIR = '/Users/robertotcestari/Library/CloudStorage/GoogleDrive-robertotcestari@gmail.com/Shared drives/Instituto - Sócios/RATC/Financeiro - Relatórios';

// Lista de arquivos DRE encontrados
const dreFiles = [
  { path: '2022-09/202209 - DRE.pdf', year: 2022, month: 9 },
  { path: '2022-10/2022-10 DRE RATC.pdf', year: 2022, month: 10 },
  { path: '2022-11/2022-11 DRE.pdf', year: 2022, month: 11 },
  { path: '2022-12/DRE.pdf', year: 2022, month: 12 },
  { path: '2023-01/DRE.pdf', year: 2023, month: 1 },
  { path: '2023-02/DRE.pdf', year: 2023, month: 2 },
  { path: '2023-03/202303 - DRE.pdf', year: 2023, month: 3 },
  { path: '2023-04/202304 - DRE.pdf', year: 2023, month: 4 },
  { path: '2023-06/202307 - DRE.pdf', year: 2023, month: 6 }, // Note: arquivo está na pasta 06 mas nome indica 07
  { path: '2023-07/202307 - DRE.pdf', year: 2023, month: 7 },
  { path: '2023-08/202308 - DRE.pdf', year: 2023, month: 8 },
  { path: '2023-09/202309 - DRE.pdf', year: 2023, month: 9 },
  { path: '2023-10/202310 - DRE.pdf', year: 2023, month: 10 },
  { path: '2023-11/202311 - DRE.pdf', year: 2023, month: 11 },
  { path: '2023-12/202312 - DRE.pdf', year: 2023, month: 12 },
  { path: '2024-01/202401 - DRE.pdf', year: 2024, month: 1 },
  { path: '2024-02/202402 - DRE.pdf', year: 2024, month: 2 },
  { path: '2024-04/202404 - DRE.pdf', year: 2024, month: 4 },
  { path: '2024-05/202405 - DRE.pdf', year: 2024, month: 5 },
  { path: '2024-06/2024-06 - DRE.pdf', year: 2024, month: 6 },
  { path: '2024-07/2024-07 - dre.pdf', year: 2024, month: 7 },
  { path: '2024-08/2024-08 - dre.pdf', year: 2024, month: 8 },
  { path: '2024-09/2024-09 - DRE.pdf', year: 2024, month: 9 },
  { path: '2024-10/202410 - DRE.pdf', year: 2024, month: 10 },
  { path: '2024-11/202411 - DRE RATC.pdf', year: 2024, month: 11 },
  { path: '2024-12/202412 - RATC DRE.pdf', year: 2024, month: 12 },
  { path: '2025-01/202501 - DRE.pdf', year: 2025, month: 1 },
  { path: '2025-02/202502 - DRE.pdf', year: 2025, month: 2 },
  { path: '2025-03/202503 - DRE.pdf', year: 2025, month: 3 },
  { path: '2025-04/202504 - DRE.pdf', year: 2025, month: 4 },
  { path: '2025-05/202505 - DRE RATC.pdf', year: 2025, month: 5 },
  { path: '2025-06/202506 - DRE RATC.pdf', year: 2025, month: 6 },
];

async function uploadToS3(filePath, s3Key) {
  const fileContent = fs.readFileSync(filePath);
  
  const command = new PutObjectCommand({
    Bucket: BUCKET,
    Key: s3Key,
    Body: fileContent,
    ContentType: 'application/pdf',
  });
  
  await s3Client.send(command);
  return `s3://${BUCKET}/${s3Key}`;
}

async function main() {
  console.log('Starting upload of legacy DRE files to S3...\n');
  
  const results = [];
  const errors = [];
  
  for (const file of dreFiles) {
    const fullPath = path.join(BASE_DIR, file.path);
    
    // Padronizar nome do arquivo no S3
    const paddedMonth = String(file.month).padStart(2, '0');
    const standardFileName = `DRE_${file.year}_${paddedMonth}.pdf`;
    const s3Key = `dre/${file.year}/${standardFileName}`;
    
    try {
      // Verificar se arquivo existe
      if (!fs.existsSync(fullPath)) {
        console.error(`❌ File not found: ${file.path}`);
        errors.push({ file: file.path, error: 'File not found' });
        continue;
      }
      
      // Upload para S3
      const s3Uri = await uploadToS3(fullPath, s3Key);
      
      console.log(`✅ Uploaded: ${file.year}-${paddedMonth} -> ${s3Key}`);
      
      results.push({
        year: file.year,
        month: file.month,
        fileName: standardFileName,
        s3Uri: s3Uri,
        originalPath: file.path,
      });
      
    } catch (error) {
      console.error(`❌ Error uploading ${file.path}:`, error.message);
      errors.push({ file: file.path, error: error.message });
    }
  }
  
  // Gerar SQL para inserção no banco
  console.log('\n=== SQL INSERT STATEMENTS ===\n');
  
  const sqlStatements = results.map(r => {
    const savedAt = new Date(`${r.year}-${String(r.month).padStart(2, '0')}-15T12:00:00Z`).toISOString();
    return `INSERT INTO SavedFile (fileName, path, type, savedAt, createdAt, updatedAt)
VALUES ('${r.fileName}', '${r.s3Uri}', 'DRE', '${savedAt}', NOW(), NOW());`;
  });
  
  console.log(sqlStatements.join('\n'));
  
  // Salvar SQL em arquivo
  const sqlFile = path.join(process.cwd(), 'scripts', 'legacy-dre-inserts.sql');
  fs.writeFileSync(sqlFile, `-- Legacy DRE uploads to database
-- Generated at: ${new Date().toISOString()}
-- Total files: ${results.length}

${sqlStatements.join('\n')}
`);
  
  console.log(`\n✅ SQL saved to: ${sqlFile}`);
  
  // Resumo
  console.log('\n=== SUMMARY ===');
  console.log(`Total files processed: ${dreFiles.length}`);
  console.log(`Successfully uploaded: ${results.length}`);
  console.log(`Errors: ${errors.length}`);
  
  if (errors.length > 0) {
    console.log('\n=== ERRORS ===');
    errors.forEach(e => console.log(`- ${e.file}: ${e.error}`));
  }
}

// Executar
main().catch(console.error);
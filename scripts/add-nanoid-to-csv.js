const fs = require('fs');
const path = require('path');
const { createId } = require('@paralleldrive/cuid2');

function findNoBalanceFiles() {
  const seederDir = path.join(__dirname, '..', 'prisma', 'seeder');
  const files = fs.readdirSync(seederDir);
  return files
    .filter(file => file.endsWith('_no_balance.csv'))
    .map(file => path.join(seederDir, file));
}

function addNanoidToCSV(filePath) {
  console.log(`\nProcessing: ${path.basename(filePath)}`);
  
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.trim().split('\n');
    
    if (lines.length === 0) {
      console.log('  Warning: File is empty');
      return;
    }
    
    // Add 'id' to header (first line)
    const header = lines[0];
    const newHeader = `id,${header}`;
    
    // Process data lines - add cuid to each
    const newLines = [newHeader];
    for (let i = 1; i < lines.length; i++) {
      const id = createId();
      const newLine = `${id},${lines[i]}`;
      newLines.push(newLine);
    }
    
    // Write back to file
    fs.writeFileSync(filePath, newLines.join('\n'));
    
    const dataRows = lines.length - 1;
    console.log(`  ✓ Added 'id' column with cuid`);
    console.log(`  ✓ Generated ${dataRows} unique cuids`);
    
  } catch (error) {
    console.log(`  ✗ Error: ${error.message}`);
  }
}

function main() {
  const files = findNoBalanceFiles();
  
  if (files.length === 0) {
    console.log('No _no_balance CSV files found');
    return;
  }
  
  console.log(`Found ${files.length} _no_balance CSV files to process:`);
  
  files.forEach(addNanoidToCSV);
  
  console.log('\n✅ Processing complete!');
}

main();
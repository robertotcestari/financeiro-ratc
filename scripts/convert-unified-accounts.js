const fs = require('fs');
const path = require('path');
const { categoryMapping } = require('./category-mapping');

// Function to parse CSV line considering quoted values with commas
function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  
  result.push(current.trim());
  return result;
}

// Function to escape CSV field
function escapeCSVField(field) {
  if (field.includes(',') || field.includes('"') || field.includes('\n')) {
    return '"' + field.replace(/"/g, '""') + '"';
  }
  return field;
}

// Function to map old category to new category ID
function mapCategory(oldCategory, value) {
  // Special handling for Ajuste de Saldo
  if (oldCategory === 'Ajuste de Saldo') {
    // Parse value - remove quotes and convert comma decimal to dot
    const cleanValue = value.replace(/"/g, '').replace(',', '.');
    const numericValue = parseFloat(cleanValue);
    
    if (numericValue >= 0) {
      return 'cat-ajuste-saldo-receita';
    } else {
      return 'cat-ajuste-saldo-despesa';
    }
  }
  
  return categoryMapping[oldCategory] || null;
}

async function convertUnifiedAccountsCSV() {
  try {
    const inputPath = path.join(__dirname, '../old_implementation/Contratos de Locação - Contas Unificadas.csv');
    const outputPath = path.join(__dirname, '../old_implementation/Contratos de Locação - Contas Unificadas - New Categories.csv');
    
    console.log('Reading input file:', inputPath);
    const data = fs.readFileSync(inputPath, 'utf-8');
    const lines = data.split('\n').filter(line => line.trim());
    
    if (lines.length === 0) {
      console.error('No data found in input file');
      return;
    }
    
    const header = parseCSVLine(lines[0]);
    console.log('Header:', header);
    
    // Add new column for category ID
    const newHeader = [...header, 'CategoryId'];
    
    const results = [];
    results.push(newHeader.map(escapeCSVField).join(','));
    
    let mappedCount = 0;
    let unmappedCount = 0;
    const unmappedCategories = new Set();
    
    // Process each data line
    for (let i = 1; i < lines.length; i++) {
      const row = parseCSVLine(lines[i]);
      
      if (row.length >= 4) {
        const oldCategory = row[3]; // Categoria column (0-indexed)
        const value = row[8]; // Valor column (0-indexed)
        
        const newCategoryId = mapCategory(oldCategory, value);
        
        if (newCategoryId) {
          mappedCount++;
        } else {
          unmappedCount++;
          unmappedCategories.add(oldCategory);
        }
        
        const newRow = [...row, newCategoryId || ''];
        results.push(newRow.map(escapeCSVField).join(','));
      }
    }
    
    // Write output file
    fs.writeFileSync(outputPath, results.join('\n'), 'utf-8');
    
    console.log(`\nConversion completed!`);
    console.log(`Input file: ${inputPath}`);
    console.log(`Output file: ${outputPath}`);
    console.log(`Total rows processed: ${lines.length - 1}`);
    console.log(`Successfully mapped: ${mappedCount}`);
    console.log(`Unmapped categories: ${unmappedCount}`);
    
    if (unmappedCategories.size > 0) {
      console.log('\nUnmapped categories:');
      unmappedCategories.forEach(cat => console.log(`  - "${cat}"`));
      console.log('\nPlease update the category mapping for these categories.');
    }
    
  } catch (error) {
    console.error('Error converting CSV:', error.message);
  }
}

// Run the conversion
if (require.main === module) {
  convertUnifiedAccountsCSV();
}

module.exports = { convertUnifiedAccountsCSV };
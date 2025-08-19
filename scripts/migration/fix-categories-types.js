const fs = require('fs');
const path = require('path');

// Read the categories JSON
const categoriesPath = path.join(__dirname, '../prisma/seeder/categories.json');
const categories = JSON.parse(fs.readFileSync(categoriesPath, 'utf-8'));

// Define type mappings based on category names
const typeMapping = {
  'cat-receitas-operacionais': 'INCOME',
  'cat-receitas-nao-operacionais': 'INCOME',
  'cat-despesas-operacionais': 'EXPENSE',
  'cat-despesas-nao-operacionais': 'EXPENSE',
  'cat-transferencias': 'TRANSFER'
};

// Function to determine type for a category
function getCategoryType(category) {
  // Level 1 categories - use direct mapping
  if (category.level === 1) {
    return typeMapping[category.id] || 'EXPENSE'; // Default to EXPENSE
  }
  
  // For child categories, inherit from parent
  const parent = categories.find(c => c.id === category.parentId);
  if (parent) {
    return getCategoryType(parent);
  }
  
  return 'EXPENSE'; // Default fallback
}

// Add type field to all categories
categories.forEach(category => {
  category.type = getCategoryType(category);
});

// Special handling for Ajuste de Saldo categories
categories.forEach(category => {
  if (category.name === 'Ajuste de Saldo') {
    category.type = 'ADJUSTMENT';
  }
});

// Write updated categories back to file
fs.writeFileSync(categoriesPath, JSON.stringify(categories, null, 2), 'utf-8');

console.log('✅ Updated categories with type field');
console.log(`📊 Summary:`);

const typeCounts = categories.reduce((acc, cat) => {
  acc[cat.type] = (acc[cat.type] || 0) + 1;
  return acc;
}, {});

Object.entries(typeCounts).forEach(([type, count]) => {
  console.log(`   ${type}: ${count} categories`);
});
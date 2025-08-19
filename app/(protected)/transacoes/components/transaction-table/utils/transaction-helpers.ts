import type { Category } from '../types';

export function prepareCategories(categories: Category[]) {
  const groupedCategories = categories.reduce((acc, category) => {
    const categoryDisplay =
      category.level === 1
        ? category.name
        : `${category.parent?.name} > ${category.name}`;

    if (!acc[category.level]) {
      acc[category.level] = [];
    }
    acc[category.level].push({
      ...category,
      displayName: categoryDisplay,
    });
    return acc;
  }, {} as Record<number, Array<Category & { displayName: string }>>);

  const sortedCategories = Object.keys(groupedCategories)
    .sort((a, b) => parseInt(a) - parseInt(b))
    .flatMap((level) => groupedCategories[parseInt(level)]);

  return sortedCategories;
}

export function getTypeColor(type: string): string {
  switch (type) {
    case 'INCOME':
      return 'text-green-600 bg-green-50';
    case 'EXPENSE':
      return 'text-red-600 bg-red-50';
    case 'TRANSFER':
      return 'text-blue-600 bg-blue-50';
    case 'ADJUSTMENT':
      return 'text-yellow-600 bg-yellow-50';
    default:
      return 'text-gray-600 bg-gray-50';
  }
}

export function getTypeLabel(type: string): string {
  switch (type) {
    case 'INCOME':
      return 'Receita';
    case 'EXPENSE':
      return 'Despesa';
    case 'TRANSFER':
      return 'Transf.';
    case 'ADJUSTMENT':
      return 'Ajuste';
    default:
      return type;
  }
}
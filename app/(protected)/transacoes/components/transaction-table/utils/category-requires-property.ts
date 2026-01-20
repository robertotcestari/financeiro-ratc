const REQUIRED_PROPERTY_CATEGORIES = new Set([
  'Aluguel',
  'Aluguel de Terceiros',
  'Repasse de Aluguel',
  'Aluguel Pago',
  'Manutenção',
  'Condomínios',
]);

export function categoryRequiresProperty(categoryName?: string | null) {
  if (!categoryName) return false;
  return REQUIRED_PROPERTY_CATEGORIES.has(categoryName);
}

import { generateMonthlyDRE } from '../actions';

interface DRETableProps {
  year: number;
  selectedMonths: number[];
}

const MONTH_NAMES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

export async function DRETable({ year, selectedMonths }: DRETableProps) {
  if (selectedMonths.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <p className="text-gray-500 text-center">Selecione ao menos um mês para visualizar o DRE</p>
      </div>
    );
  }

  const { rows } = await generateMonthlyDRE(year, selectedMonths);

  const formatCurrency = (value: number) => {
    if (value === 0) return '-';
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 2,
    }).format(value);
  };

  const getCellClass = (lineType: string, isBold: boolean) => {
    let classes = 'px-3 py-1 text-right border-b border-gray-200 text-sm';
    
    if (lineType === 'SEPARATOR') {
      return 'px-3 py-2 border-b border-gray-300';
    }
    
    if (isBold || lineType === 'SUBTOTAL' || lineType === 'TOTAL') {
      classes += ' font-bold';
    }
    
    if (lineType === 'TOTAL') {
      classes += ' bg-blue-50 border-t border-gray-400 border-b-2 border-gray-400';
    } else if (lineType === 'SUBTOTAL') {
      classes += ' bg-gray-50 font-semibold';
    } else if (lineType === 'HEADER') {
      classes += ' bg-blue-100 font-bold';
    }
    
    return classes;
  };

  const getNameCellClass = (lineType: string, isBold: boolean) => {
    let classes = 'px-3 py-1 border-b border-gray-200 text-sm';
    
    if (lineType === 'SEPARATOR') {
      return 'px-3 py-2 border-b border-gray-300';
    }
    
    if (isBold || lineType === 'SUBTOTAL' || lineType === 'TOTAL') {
      classes += ' font-bold';
    }
    
    if (lineType === 'TOTAL') {
      classes += ' bg-blue-50 border-t border-gray-400 border-b-2 border-gray-400';
    } else if (lineType === 'SUBTOTAL') {
      classes += ' bg-gray-50 font-semibold';
    } else if (lineType === 'HEADER') {
      classes += ' bg-blue-100 font-bold';
    }
    
    return classes;
  };

  const getValueColor = (value: number, lineType: string) => {
    if (value === 0 || lineType === 'SEPARATOR') return 'text-gray-400';
    if (value > 0) return 'text-green-700';
    return 'text-red-700';
  };

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="px-3 py-3 text-left font-medium text-gray-900 sticky left-0 bg-gray-50 min-w-[300px]">
                Linha DRE
              </th>
              <th className="px-3 py-3 text-center font-medium text-gray-900 min-w-[100px]">
                Ano
              </th>
              {selectedMonths.map(month => (
                <th key={month} className="px-3 py-3 text-center font-medium text-gray-900 min-w-[120px]">
                  <div className="flex flex-col">
                    <span>{year}</span>
                    <span className="text-sm">{month}</span>
                    <span className="text-sm">{MONTH_NAMES[month - 1]}</span>
                  </div>
                </th>
              ))}
              {selectedMonths.length > 1 && (
                <th className="px-3 py-3 text-center font-medium text-gray-900 min-w-[120px] bg-blue-50">
                  Total
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="hover:bg-gray-50">
                <td className={`${getNameCellClass(row.lineType, row.isBold)} sticky left-0 bg-white`}>
                  {row.lineType === 'SEPARATOR' ? (
                    <div className="h-2"></div>
                  ) : (
                    <span style={{ paddingLeft: `${Math.max(0, (row.level - 1) * 16)}px` }}>
                      {row.name}
                    </span>
                  )}
                </td>
                <td className={getCellClass(row.lineType, row.isBold)}>
                  {row.lineType === 'SEPARATOR' ? '' : year}
                </td>
                {selectedMonths.map(month => {
                  const value = row.monthlyAmounts[month] || 0;
                  return (
                    <td 
                      key={month} 
                      className={`${getCellClass(row.lineType, row.isBold)} ${getValueColor(value, row.lineType)}`}
                    >
                      {row.lineType === 'SEPARATOR' ? '' : formatCurrency(value)}
                    </td>
                  );
                })}
                {selectedMonths.length > 1 && (
                  <td className={`${getCellClass(row.lineType, row.isBold)} bg-blue-50 ${getValueColor(row.total || 0, row.lineType)}`}>
                    {row.lineType === 'SEPARATOR' ? '' : formatCurrency(row.total || 0)}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
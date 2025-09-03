import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface DRERow {
  id: string;
  name: string;
  level: number;
  lineType: 'DETAIL' | 'SUBTOTAL' | 'TOTAL' | 'SEPARATOR' | 'HEADER';
  isBold: boolean;
  monthlyAmounts: Record<number, number>;
  total?: number;
}

const MONTH_NAMES = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
];

export function exportDREToPDF(
  rows: DRERow[],
  year: number,
  selectedMonths: number[],
  showZeroValues: boolean,
  expandedSections: Record<string, boolean>
) {
  const doc = new jsPDF({
    orientation: selectedMonths.length > 6 ? 'landscape' : 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  // Configurações de estilo ajustadas para caber em uma página
  const styles = {
    fontSize: 6, // Reduzido de 8 para 6
    cellPadding: 1, // Reduzido de 2 para 1
    lineColor: [200, 200, 200],
    lineWidth: 0.1,
  };

  // Título do documento (tamanhos reduzidos)
  doc.setFontSize(12); // Reduzido de 14
  doc.text('DRE - Demonstrativo do Resultado do Exercício', 14, 10); // Y reduzido de 15
  
  doc.setFontSize(8); // Reduzido de 10
  const monthsText = selectedMonths.map(m => MONTH_NAMES[m - 1]).join(', ');
  doc.text(`Período: ${monthsText} de ${year}`, 14, 15); // Y reduzido de 22
  
  doc.setFontSize(7); // Reduzido de 8
  doc.text(`Gerado em: ${new Date().toLocaleDateString('pt-BR')}`, 14, 19); // Y reduzido de 28

  // Preparar dados da tabela
  const headers = ['Descrição'];
  selectedMonths.forEach((month) => {
    headers.push(`${MONTH_NAMES[month - 1]}`);
  });

  // Filtrar e processar linhas
  const tableData: any[] = [];
  let currentSection: string | null = null;
  const SECTION_IDS = {
    SALDOS_BANCARIOS: 'saldos-bancarios-header',
    RECEITAS_OPERACIONAIS: 'section-receitas-operacionais',
    DESPESAS_OPERACIONAIS: 'section-despesas-operacionais',
    RECEITAS_NAO_OPERACIONAIS: 'section-receitas-não-operacionais',
    DESPESAS_NAO_OPERACIONAIS: 'section-despesas-não-operacionais',
  };

  const formatCurrency = (value: number) => {
    if (value === 0) return '-';
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 2,
    }).format(value);
  };

  const hasOnlyZeroValues = (row: DRERow) => {
    if (row.lineType !== 'DETAIL') return false;
    return !selectedMonths.some((month) => {
      const value = row.monthlyAmounts[month] || 0;
      return value !== 0;
    });
  };

  for (const row of rows) {
    // Sempre mostra separadores, subtotais e totais
    if (['SEPARATOR', 'SUBTOTAL', 'TOTAL'].includes(row.lineType)) {
      if (row.lineType === 'SEPARATOR') {
        // Adicionar linha vazia para separador
        const emptyRow = [''];
        selectedMonths.forEach(() => emptyRow.push(''));
        tableData.push(emptyRow);
        continue;
      }
      
      const dataRow = [];
      // Adicionar indentação para nome
      const indent = row.lineType === 'SUBTOTAL' ? '  ' : '';
      dataRow.push(indent + row.name);
      
      selectedMonths.forEach((month) => {
        dataRow.push(formatCurrency(row.monthlyAmounts[month] || 0));
      });
      
      tableData.push(dataRow);
      continue;
    }

    // Para headers, sempre mostra e atualiza a seção atual
    if (row.lineType === 'HEADER') {
      const dataRow = [row.name];
      selectedMonths.forEach((month) => {
        dataRow.push(formatCurrency(row.monthlyAmounts[month] || 0));
      });
      tableData.push(dataRow);
      
      // Atualiza a seção atual se for uma seção com toggle
      if (Object.values(SECTION_IDS).includes(row.id)) {
        currentSection = row.id;
      } else {
        currentSection = null;
      }
      continue;
    }

    // Para linhas de detalhes, verifica se a seção está expandida
    if (row.lineType === 'DETAIL') {
      // Verifica se deve filtrar valores zero
      if (!showZeroValues && hasOnlyZeroValues(row)) {
        continue;
      }

      if (currentSection && expandedSections[currentSection]) {
        const dataRow = [];
        // Adicionar indentação baseada no nível
        const indent = '  '.repeat(Math.max(0, row.level - 1));
        dataRow.push(indent + row.name);
        
        selectedMonths.forEach((month) => {
          dataRow.push(formatCurrency(row.monthlyAmounts[month] || 0));
        });
        
        tableData.push(dataRow);
      } else if (!currentSection) {
        // Se não está em uma seção com toggle, sempre mostra
        const dataRow = [];
        const indent = '  '.repeat(Math.max(0, row.level - 1));
        dataRow.push(indent + row.name);
        
        selectedMonths.forEach((month) => {
          dataRow.push(formatCurrency(row.monthlyAmounts[month] || 0));
        });
        
        tableData.push(dataRow);
      }
    }
  }

  // Gerar tabela no PDF com configurações para caber em uma página
  autoTable(doc, {
    head: [headers],
    body: tableData,
    startY: 22, // Reduzido de 35
    styles: {
      fontSize: styles.fontSize,
      cellPadding: styles.cellPadding,
      minCellHeight: 3, // Altura mínima da célula
    },
    headStyles: {
      fillColor: [0, 0, 0], // preto
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 7, // Tamanho de fonte do cabeçalho
    },
    columnStyles: {
      0: { cellWidth: 'auto', halign: 'left' },
    },
    alternateRowStyles: {
      fillColor: [249, 250, 251], // gray-50
    },
    margin: { top: 22, left: 10, right: 10, bottom: 10 }, // Margens ajustadas
    tableWidth: 'auto', // Tabela se ajusta automaticamente
    showHead: 'firstPage',
    didParseCell: function(data) {
      // Aplicar estilos especiais para linhas específicas
      const rowData = rows[data.row.index];
      if (rowData) {
        // Destacar não categorizados com fundo preto e texto branco
        if (rowData.id === 'nao-categorizados') {
          data.cell.styles.fillColor = [0, 0, 0]; // preto
          data.cell.styles.textColor = [255, 255, 255]; // branco
          data.cell.styles.fontStyle = 'bold';
        }
        // Destacar totais
        else if (rowData.lineType === 'TOTAL') {
          data.cell.styles.fillColor = [219, 234, 254]; // blue-100
          data.cell.styles.fontStyle = 'bold';
        }
        // Destacar subtotais
        else if (rowData.lineType === 'SUBTOTAL') {
          data.cell.styles.fillColor = [243, 244, 246]; // gray-100
          data.cell.styles.fontStyle = 'bold';
        }
        // Destacar headers
        else if (rowData.lineType === 'HEADER') {
          data.cell.styles.fontStyle = 'bold';
        }
        
        // Colorir valores (exceto para linha não categorizados que já tem cor branca)
        if (
          rowData.id !== 'nao-categorizados' &&
          data.column.index > 0 &&
          data.cell.raw != null &&
          data.cell.raw !== '-' &&
          data.cell.raw !== ''
        ) {
          const value = parseFloat(data.cell.raw.toString().replace(/[^\d,-]/g, '').replace(',', '.'));
          if (value < 0) {
            data.cell.styles.textColor = [220, 38, 38]; // red-600
          } else if (value > 0) {
            data.cell.styles.textColor = [34, 197, 94]; // green-600
          }
        }
      }
    },
  });

  // Salvar o PDF
  const fileName = `DRE_${year}_${selectedMonths.join('-')}_${new Date().getTime()}.pdf`;
  doc.save(fileName);
}

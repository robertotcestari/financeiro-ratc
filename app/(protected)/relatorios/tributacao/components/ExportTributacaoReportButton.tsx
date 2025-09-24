'use client';

import { useMemo, useState } from 'react';
import jsPDF from 'jspdf';
import autoTable, { type CellHookData } from 'jspdf-autotable';
import { FileText, CloudUpload, FileDown, RotateCcw } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { formatCurrency } from '@/lib/formatters';
import { saveGeneratedTributacaoReportToStorage } from '../actions';

export interface TributacaoReportRow {
  propertyId: string | null;
  propertyCode: string;
  propertyLabel: string;
  amount: number;
  condominio: number;
  iptu: number;
  nonTaxable: number;
  taxable: number;
  forceZero: boolean;
}

function buildDocument(rows: TributacaoReportRow[], month: number, year: number) {
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

  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

  doc.setFontSize(12);
  doc.text('Relatório de Tributação dos Aluguéis', 14, 10);
  doc.setFontSize(8);
  doc.text(`Período: ${MONTH_NAMES[month - 1]} de ${year}`, 14, 15);
  doc.setFontSize(7);
  doc.text(`Gerado em: ${new Date().toLocaleDateString('pt-BR')}`, 14, 19);

  const sortedRows = [...rows].sort((a, b) => a.propertyCode.localeCompare(b.propertyCode));

  const head = [
    ['Imóvel', 'Valor Recebido', 'Condomínio', 'IPTU', 'Não Tributável', 'Receita Tributável'],
  ];

  let totalAmount = 0;
  let totalCondominio = 0;
  let totalIptu = 0;
  let totalNonTaxable = 0;
  let totalTaxable = 0;

  const body: string[][] = sortedRows.map((row) => {
    totalAmount += row.amount;
    totalCondominio += row.condominio;
    totalIptu += row.iptu;
    totalNonTaxable += row.nonTaxable;
    totalTaxable += row.taxable;
    return [
      row.propertyLabel,
      formatCurrency(row.amount),
      formatCurrency(row.condominio),
      formatCurrency(row.iptu),
      formatCurrency(row.nonTaxable),
      formatCurrency(row.taxable),
    ];
  });

  body.push([
    'TOTAL',
    formatCurrency(totalAmount),
    formatCurrency(totalCondominio),
    formatCurrency(totalIptu),
    formatCurrency(totalNonTaxable),
    formatCurrency(totalTaxable),
  ]);

  autoTable(doc, {
    head,
    body,
    startY: 22,
    styles: {
      fontSize: 7,
      cellPadding: 1.5,
    },
    headStyles: {
      fillColor: [0, 0, 0],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8,
    },
    columnStyles: {
      0: { cellWidth: 90 },
      1: { cellWidth: 28, halign: 'right' },
      2: { cellWidth: 28, halign: 'right' },
      3: { cellWidth: 28, halign: 'right' },
      4: { cellWidth: 32, halign: 'right' },
      5: { cellWidth: 32, halign: 'right' },
    },
    willDrawCell: (data: CellHookData<string>) => {
      if (data.row.index === body.length - 1) {
        data.cell.styles.fillColor = [243, 244, 246];
        data.cell.styles.fontStyle = 'bold';
      }
    },
    margin: { top: 22, left: 14, right: 14, bottom: 10 },
  });

  const finalY = (doc as jsPDF & { lastAutoTable?: { finalY?: number } })
    .lastAutoTable?.finalY ?? 22;
  doc.setFontSize(7);
  doc.text(`Total de ${rows.length} imóveis`, 14, finalY + 5);

  return doc;
}

interface Props {
  rows: TributacaoReportRow[];
  month: number;
  year: number;
}

export function ExportTributacaoReportButton({ rows, month, year }: Props) {
  const [exporting, setExporting] = useState(false);
  const [blob, setBlob] = useState<Blob | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const [savedPath, setSavedPath] = useState<string | null>(null);

  const generatedUrl = useMemo(() => (blob ? URL.createObjectURL(blob) : null), [blob]);

  const generate = async () => {
    setExporting(true);
    setSavedPath(null);
    try {
      const doc = buildDocument(rows, month, year);
      const paddedMonth = String(month).padStart(2, '0');
      const name = `Tributacao_${year}_${paddedMonth}.pdf`;
      const arrayBuffer = doc.output('arraybuffer');
      const pdfBlob = new Blob([arrayBuffer], { type: 'application/pdf' });
      setBlob(pdfBlob);
      setFileName(name);
    } finally {
      setExporting(false);
    }
  };

  const download = () => {
    if (!blob || !fileName) return;
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = fileName;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  };

  const reset = () => {
    setBlob(null);
    setFileName('');
    setSavedPath(null);
    if (generatedUrl) URL.revokeObjectURL(generatedUrl);
  };

  const save = async () => {
    if (!blob || !fileName) return;
    const base64 = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        resolve(result.split(',')[1] ?? '');
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
    const res = await saveGeneratedTributacaoReportToStorage({
      base64,
      fileName,
      month,
      year,
    });
    if (res.ok) setSavedPath(res.path);
  };

  if (!blob) {
    return (
      <Button onClick={generate} disabled={exporting}>
        {exporting ? 'Gerando PDF…' : 'Gerar PDF do relatório'}
      </Button>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="flex items-center gap-2 text-gray-700">
        <FileText className="w-4 h-4" />
        <span className="text-sm font-medium">{fileName}</span>
        {savedPath && <span className="text-xs text-gray-500">salvo</span>}
      </div>
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={download}>
          <FileDown className="w-4 h-4 mr-1" /> Baixar
        </Button>
        <Button variant="outline" size="sm" onClick={save}>
          <CloudUpload className="w-4 h-4 mr-1" /> Salvar
        </Button>
        <Button variant="ghost" size="sm" onClick={reset}>
          <RotateCcw className="w-4 h-4 mr-1" /> Gerar novamente
        </Button>
      </div>
    </div>
  );
}

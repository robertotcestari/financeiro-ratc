'use client';

import { Button } from '@/components/ui/button';
import type { DRERowData } from '@/app/(protected)/dre/actions';
import { useState } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { saveGeneratedDREToStorage } from '../actions';
import { FileDown, CloudUpload, FileText } from 'lucide-react';

interface Props {
  rows: DRERowData[];
  year: number;
  months: number[];
  fileName?: string; // e.g., DRE_2025_08.pdf
}

function buildDoc(rows: DRERowData[], year: number, months: number[]) {
  const MONTH_NAMES = [
    'Janeiro','Fevereiro','Março','Abril','Maio','Junho',
    'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'
  ];
  const doc = new jsPDF({
    orientation: months.length > 6 ? 'landscape' : 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  doc.setFontSize(12);
  doc.text('DRE - Demonstrativo do Resultado do Exercício', 14, 10);
  doc.setFontSize(8);
  const monthsText = months.map(m => MONTH_NAMES[m - 1]).join(', ');
  doc.text(`Período: ${monthsText} de ${year}`, 14, 15);
  doc.setFontSize(7);
  doc.text(`Gerado em: ${new Date().toLocaleDateString('pt-BR')}`, 14, 19);

  const headers = ['Descrição', ...months.map(m => MONTH_NAMES[m - 1])];
  const formatCurrency = (value: number) => value === 0 ? '-' : new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL'}).format(value);

  const body: string[][] = [];
  for (const row of rows) {
    const dataRow = [row.name];
    months.forEach(m => dataRow.push(formatCurrency(row.monthlyAmounts[m] || 0)));
    body.push(dataRow);
  }

  autoTable(doc, {
    head: [headers],
    body,
    startY: 22,
    styles: { fontSize: 6, cellPadding: 1 },
    headStyles: { fillColor: [0,0,0], textColor: [255,255,255], fontStyle: 'bold', fontSize: 7 },
    margin: { top: 22, left: 10, right: 10, bottom: 10 },
    tableWidth: 'auto',
  });
  return doc;
}

export default function ExportYearDREButton({ rows, year, months, fileName }: Props) {
  const [exporting, setExporting] = useState(false);
  const [blob, setBlob] = useState<Blob | null>(null);
  const [generatedFileName, setGeneratedFileName] = useState<string>('');
  const [savedPath, setSavedPath] = useState<string | null>(null);

  const onGenerate = async () => {
    setSavedPath(null);
    setExporting(true);
    try {
      const doc = buildDoc(rows, year, months);
      const name = fileName ?? `DRE_${year}_${months.join('-')}.pdf`;
      const arrayBuffer = doc.output('arraybuffer');
      const b = new Blob([arrayBuffer], { type: 'application/pdf' });
      setBlob(b);
      setGeneratedFileName(name);
    } finally {
      setExporting(false);
    }
  };

  const onDownload = () => {
    if (!blob || !generatedFileName) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = generatedFileName;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const onSave = async () => {
    if (!blob || !generatedFileName) return;
    const base64 = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const res = (reader.result as string).split(',')[1] || '';
        resolve(res);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
    const res = await saveGeneratedDREToStorage({ base64, fileName: generatedFileName });
    if (res.ok) setSavedPath(res.path);
  };

  if (!blob) {
    return (
      <Button variant="default" onClick={onGenerate} disabled={exporting}>
        {exporting ? 'Gerando PDF…' : 'Gerar PDF consolidado'}
      </Button>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-2 text-gray-700">
        <FileText className="w-4 h-4" />
        <span className="text-sm font-medium">{generatedFileName}</span>
        {savedPath && <span className="text-xs text-gray-500">salvo</span>}
      </div>
      <Button variant="outline" size="sm" onClick={onSave}>
        <CloudUpload className="w-4 h-4 mr-1" /> Salvar no S3
      </Button>
      <Button variant="default" size="sm" onClick={onDownload}>
        <FileDown className="w-4 h-4 mr-1" /> Download
      </Button>
    </div>
  );
}

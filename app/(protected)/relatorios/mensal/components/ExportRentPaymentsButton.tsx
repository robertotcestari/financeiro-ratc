'use client';

import { Button } from '@/components/ui/button';
import { useState } from 'react';
import jsPDF from 'jspdf';
import autoTable, { type CellHookData } from 'jspdf-autotable';
import { saveGeneratedRentPaymentsToStorage } from '../actions';
import { FileDown, CloudUpload, FileText } from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/formatters';

export interface RentPayment {
  id: string;
  date: Date;
  propertyCode: string;
  propertyAddress: string;
  propertyCity: string;
  tenant: string;
  amount: number;
  bankAccount: string;
  category: string;
}

interface Props {
  payments: RentPayment[];
  month: number;
  year: number;
  fileName?: string;
}

function buildDoc(payments: RentPayment[], month: number, year: number) {
  const MONTH_NAMES = [
    'Janeiro','Fevereiro','Março','Abril','Maio','Junho',
    'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'
  ];
  
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  });

  // Title
  doc.setFontSize(12);
  doc.text('Relatório de Aluguéis Recebidos', 14, 10);
  doc.setFontSize(8);
  doc.text(`Período: ${MONTH_NAMES[month - 1]} de ${year}`, 14, 15);
  doc.setFontSize(7);
  doc.text(`Gerado em: ${new Date().toLocaleDateString('pt-BR')}`, 14, 19);

  // Prepare data
  const headers = ['Data', 'Código', 'Imóvel', 'Cidade', 'Inquilino', 'Valor', 'Conta'];
  const body: string[][] = [];
  
  // Sort payments by property code and date
  const sortedPayments = [...payments].sort((a, b) => {
    const codeCompare = a.propertyCode.localeCompare(b.propertyCode);
    if (codeCompare !== 0) return codeCompare;
    return new Date(a.date).getTime() - new Date(b.date).getTime();
  });

  let totalAmount = 0;
  
  for (const payment of sortedPayments) {
    body.push([
      formatDate(payment.date),
      payment.propertyCode,
      payment.propertyAddress,
      payment.propertyCity,
      payment.tenant,
      formatCurrency(payment.amount),
      payment.bankAccount
    ]);
    totalAmount += payment.amount;
  }

  // Add total row
  body.push([
    '',
    '',
    '',
    '',
    'TOTAL',
    formatCurrency(totalAmount),
    ''
  ]);

  // Create table
  autoTable(doc, {
    head: [headers],
    body,
    startY: 22,
    styles: { 
      fontSize: 7, 
      cellPadding: 1.5 
    },
    headStyles: { 
      fillColor: [0,0,0], 
      textColor: [255,255,255], 
      fontStyle: 'bold', 
      fontSize: 8 
    },
    bodyStyles: {
      fontSize: 7
    },
    columnStyles: {
      0: { cellWidth: 20 }, // Data
      1: { cellWidth: 20 }, // Código
      2: { cellWidth: 60 }, // Imóvel
      3: { cellWidth: 35 }, // Cidade
      4: { cellWidth: 50 }, // Inquilino
      5: { cellWidth: 25, halign: 'right' }, // Valor
      6: { cellWidth: 30 }  // Conta
    },
    willDrawCell: (data: CellHookData) => {
      // Style the total row before drawing
      if (data.row.index === body.length - 1) {
        data.cell.styles.fillColor = [243, 244, 246];
        data.cell.styles.fontStyle = 'bold';
      }
    },
    margin: { top: 22, left: 14, right: 14, bottom: 10 },
  });

  // Footer
  const lastAutoTable = (doc as jsPDF & { lastAutoTable?: { finalY?: number } })
    .lastAutoTable;
  const finalY = lastAutoTable?.finalY ?? 22;
  doc.setFontSize(7);
  doc.text(`Total de ${payments.length} recebimento${payments.length !== 1 ? 's' : ''}`, 14, finalY + 5);

  return doc;
}

export default function ExportRentPaymentsButton({ payments, month, year, fileName }: Props) {
  const [exporting, setExporting] = useState(false);
  const [blob, setBlob] = useState<Blob | null>(null);
  const [generatedFileName, setGeneratedFileName] = useState<string>('');
  const [savedPath, setSavedPath] = useState<string | null>(null);

  const onGenerate = async () => {
    setSavedPath(null);
    setExporting(true);
    try {
      const doc = buildDoc(payments, month, year);
      const paddedMonth = String(month).padStart(2, '0');
      const name = fileName ?? `Alugueis_${year}_${paddedMonth}.pdf`;
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
    const res = await saveGeneratedRentPaymentsToStorage({ base64, fileName: generatedFileName, month, year });
    if (res.ok) setSavedPath(res.path);
  };

  if (!blob) {
    return (
      <Button variant="default" onClick={onGenerate} disabled={exporting}>
        {exporting ? 'Gerando PDF…' : 'Gerar PDF dos aluguéis'}
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

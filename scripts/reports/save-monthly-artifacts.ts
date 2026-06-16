import { config } from 'dotenv';
import jsPDF from 'jspdf';
import autoTable, { type CellHookData } from 'jspdf-autotable';

config({ path: '.env' });

import { generateMonthlyDRE, type DRERowData } from '@/app/(protected)/dre/actions';
import { getRentPayments } from '@/app/(protected)/relatorios/mensal/actions';
import { uploadPdfToS3 } from '@/lib/core/storage/s3';
import { createSavedFile } from '@/lib/core/database/saved-files';
import { prisma } from '@/lib/core/database/client';
import { formatCurrency, formatDate } from '@/lib/formatters';

const MONTH_NAMES = [
  'Janeiro',
  'Fevereiro',
  'Marco',
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

interface RentPayment {
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

function buildDreDoc(rows: DRERowData[], year: number, months: number[]) {
  const doc = new jsPDF({
    orientation: months.length > 6 ? 'landscape' : 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  doc.setFontSize(12);
  doc.text('DRE - Demonstrativo do Resultado do Exercicio', 14, 10);
  doc.setFontSize(8);
  const monthsText = months.map((month) => MONTH_NAMES[month - 1]).join(', ');
  doc.text(`Periodo: ${monthsText} de ${year}`, 14, 15);
  doc.setFontSize(7);
  doc.text(`Gerado em: ${new Date().toLocaleDateString('pt-BR')}`, 14, 19);

  const headers = ['Descricao', ...months.map((month) => MONTH_NAMES[month - 1])];
  const body = rows.map((row) => [
    row.name,
    ...months.map((month) => formatCurrency(row.monthlyAmounts[month] || 0)),
  ]);

  autoTable(doc, {
    head: [headers],
    body,
    startY: 22,
    styles: { fontSize: 6, cellPadding: 1 },
    headStyles: {
      fillColor: [0, 0, 0],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 7,
    },
    margin: { top: 22, left: 10, right: 10, bottom: 10 },
    tableWidth: 'auto',
  });

  return doc;
}

function buildRentPaymentsDoc(payments: RentPayment[], month: number, year: number) {
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  });

  doc.setFontSize(12);
  doc.text('Relatorio de Alugueis Recebidos', 14, 10);
  doc.setFontSize(8);
  doc.text(`Periodo: ${MONTH_NAMES[month - 1]} de ${year}`, 14, 15);
  doc.setFontSize(7);
  doc.text(`Gerado em: ${new Date().toLocaleDateString('pt-BR')}`, 14, 19);

  const sortedPayments = [...payments].sort((a, b) => {
    const codeCompare = a.propertyCode.localeCompare(b.propertyCode);
    if (codeCompare !== 0) return codeCompare;
    return new Date(a.date).getTime() - new Date(b.date).getTime();
  });

  let totalAmount = 0;
  const body = sortedPayments.map((payment) => {
    totalAmount += payment.amount;
    return [
      formatDate(payment.date),
      payment.propertyCode,
      payment.propertyAddress,
      payment.propertyCity,
      payment.tenant,
      formatCurrency(payment.amount),
      payment.bankAccount,
    ];
  });

  body.push(['', '', '', '', 'TOTAL', formatCurrency(totalAmount), '']);

  autoTable(doc, {
    head: [['Data', 'Codigo', 'Imovel', 'Cidade', 'Inquilino', 'Valor', 'Conta']],
    body,
    startY: 22,
    styles: { fontSize: 7, cellPadding: 1.5 },
    headStyles: {
      fillColor: [0, 0, 0],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8,
    },
    bodyStyles: { fontSize: 7 },
    columnStyles: {
      0: { cellWidth: 20 },
      1: { cellWidth: 20 },
      2: { cellWidth: 60 },
      3: { cellWidth: 35 },
      4: { cellWidth: 50 },
      5: { cellWidth: 25, halign: 'right' },
      6: { cellWidth: 30 },
    },
    willDrawCell: (data: CellHookData) => {
      if (data.row.index === body.length - 1) {
        data.cell.styles.fillColor = [243, 244, 246];
        data.cell.styles.fontStyle = 'bold';
      }
    },
    margin: { top: 22, left: 14, right: 14, bottom: 10 },
  });

  const lastAutoTable = (doc as jsPDF & { lastAutoTable?: { finalY?: number } }).lastAutoTable;
  const finalY = lastAutoTable?.finalY ?? 22;
  doc.setFontSize(7);
  doc.text(`Total de ${payments.length} recebimento${payments.length !== 1 ? 's' : ''}`, 14, finalY + 5);

  return doc;
}

async function uploadAndRegister(params: {
  type: 'DRE' | 'ALUGUEIS';
  keyPrefix: string;
  fileName: string;
  pdf: jsPDF;
}) {
  const s3Bucket = process.env.S3_BUCKET;
  if (!s3Bucket) {
    throw new Error('S3_BUCKET nao configurado');
  }

  const arrayBuffer = params.pdf.output('arraybuffer');
  const body = Buffer.from(arrayBuffer);
  const key = `${params.keyPrefix}/${Date.now()}_${params.fileName}`;

  await uploadPdfToS3({ key, body, contentType: 'application/pdf' });
  const path = `s3://${s3Bucket}/${key}`;
  await createSavedFile({ fileName: params.fileName, path, type: params.type });

  return path;
}

function parseArgs() {
  const [, , yearArg, monthArg] = process.argv;
  const year = Number(yearArg);
  const month = Number(monthArg);

  if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) {
    throw new Error('Uso: tsx scripts/reports/save-monthly-artifacts.ts <ano> <mes>');
  }

  return { year, month };
}

async function main() {
  const { year, month } = parseArgs();
  const paddedMonth = String(month).padStart(2, '0');
  const allMonths = Array.from({ length: 12 }, (_, index) => index + 1);

  const [{ rows }, rentPayments] = await Promise.all([
    generateMonthlyDRE(year, allMonths),
    getRentPayments(month, year),
  ]);

  const dreFileName = `DRE_${year}_${paddedMonth}.pdf`;
  const rentFileName = `Alugueis_${year}_${paddedMonth}.pdf`;

  const drePath = await uploadAndRegister({
    type: 'DRE',
    keyPrefix: `dre/${new Date().getFullYear()}`,
    fileName: dreFileName,
    pdf: buildDreDoc(rows, year, allMonths),
  });

  const rentPath = await uploadAndRegister({
    type: 'ALUGUEIS',
    keyPrefix: `alugueis/${year}`,
    fileName: rentFileName,
    pdf: buildRentPaymentsDoc(rentPayments, month, year),
  });

  console.log(JSON.stringify({
    ok: true,
    dre: { fileName: dreFileName, path: drePath },
    alugueis: { fileName: rentFileName, path: rentPath, count: rentPayments.length },
  }, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

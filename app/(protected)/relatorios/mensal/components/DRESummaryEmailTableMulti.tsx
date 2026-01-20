'use client';

import { Button } from '@/components/ui/button';
import { formatCurrency } from '@/lib/formatters';
import { useState } from 'react';

export interface DREMonthValues {
  receitasOperacionais: number;
  despesasOperacionais: number;
  lucroOperacional: number;
  receitasEDespesasNaoOperacionais: number;
  resultadoDeCaixa: number;
}

export interface DRESummaryEmailTableMultiProps {
  months: Array<{ label: string; values: DREMonthValues }>;
}

export default function DRESummaryEmailTableMulti({ months }: DRESummaryEmailTableMultiProps) {
  const [copied, setCopied] = useState<null | 'tab' | 'md' | 'html'>(null);

  const rowsData = [
    {
      label: 'Receitas operacionais',
      values: months.map((m) => formatCurrency(m.values.receitasOperacionais)),
    },
    {
      label: 'Despesas operacionais',
      values: months.map((m) => formatCurrency(m.values.despesasOperacionais)),
    },
    {
      label: 'Lucro operacional',
      values: months.map((m) => formatCurrency(m.values.lucroOperacional)),
    },
    {
      label: 'Receitas e despesas não operacionais',
      values: months.map((m) => formatCurrency(m.values.receitasEDespesasNaoOperacionais)),
    },
    {
      label: 'Resultado de caixa',
      values: months.map((m) => formatCurrency(m.values.resultadoDeCaixa)),
    },
  ];

  const buildTabDelimited = (): string => {
    const header = ['Linha', ...months.map((m) => m.label)].join('\t');
    const lines = rowsData.map((r) => [r.label, ...r.values].join('\t'));
    return [header, ...lines].join('\n');
  };

  const buildMarkdown = (): string => {
    const header = ['Linha', ...months.map((m) => m.label)].join(' | ');
    const divider = ['---', ...months.map(() => '---')].join(' | ');
    const lines = rowsData.map((r) => [r.label, ...r.values].join(' | '));
    return ['| ' + header + ' |', '| ' + divider + ' |', ...lines.map((l) => '| ' + l + ' |')].join('\n');
  };

  const buildHTML = (): string => {
    const thStyle = 'border:1px solid #e5e7eb;padding:8px;text-align:left;background:#f9fafb;color:#374151;';
    const tdStyle = 'border:1px solid #e5e7eb;padding:8px;text-align:left;';
    const pos = 'color:#047857;font-weight:600;';
    const neg = 'color:#b91c1c;font-weight:600;';
    const posStrong = 'color:#065f46;font-weight:700;';
    const tableOpen = '<table style="border-collapse:collapse;width:100%;font-family:system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif;font-size:14px;">';
    const thead = [
      '<thead><tr>',
      `<th style="${thStyle}">Linha</th>`,
      ...months.map((m) => `<th style="${thStyle}">${m.label}</th>`),
      '</tr></thead>',
    ].join('');
    const bodyRows = rowsData
      .map((r) => {
        const cells = r.values
          .map((v) => {
            // choose style by row type
            const isLucro = r.label === 'Lucro operacional';
            const isCaixa = r.label === 'Resultado de caixa';
            // We don't have numeric raw values here (already formatted). Keep positive/negative heuristic by sign char.
            const isNeg = String(v).trim().startsWith('-');
            const color = isCaixa ? (isNeg ? neg.replace('#b91c1c', '#991b1b') : posStrong) : isLucro ? (isNeg ? neg : pos) : isNeg ? neg : pos;
            return `<td style="${tdStyle}${color}">${v}</td>`;
          })
          .join('');
        return `<tr><td style="${tdStyle}">${r.label}</td>${cells}</tr>`;
      })
      .join('');
    return `${tableOpen}${thead}<tbody>${bodyRows}</tbody></table>`;
  };

  const handleCopy = async (type: 'tab' | 'md' | 'html') => {
    try {
      if (type === 'tab') {
        await navigator.clipboard.writeText(buildTabDelimited());
      } else if (type === 'md') {
        await navigator.clipboard.writeText(buildMarkdown());
      } else {
        const html = buildHTML();
        const ClipboardItemCtor =
          typeof window !== 'undefined'
            ? (window as Window & { ClipboardItem?: typeof ClipboardItem })
                .ClipboardItem
            : undefined;
        if (ClipboardItemCtor) {
          const item = new ClipboardItemCtor({
            'text/html': new Blob([html], { type: 'text/html' }),
            'text/plain': new Blob([html], { type: 'text/plain' }),
          });
          await navigator.clipboard.write([item]);
        } else {
          await navigator.clipboard.writeText(html);
        }
      }
      setCopied(type);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      // noop
    }
  };

  return (
    <div className="w-full text-xs">
      <div className="flex justify-end mb-2 gap-2 flex-wrap">
        <Button onClick={() => handleCopy('tab')} variant="outline" size="sm">
          {copied === 'tab' ? 'Copiado!' : 'Copiar texto tabulado'}
        </Button>
        <Button onClick={() => handleCopy('md')} variant="outline" size="sm">
          {copied === 'md' ? 'Copiado!' : 'Copiar tabela Markdown'}
        </Button>
        <Button onClick={() => handleCopy('html')} variant="default" size="sm">
          {copied === 'html' ? 'Copiado!' : 'Copiar tabela HTML'}
        </Button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-left text-gray-600 border-b">
              <th className="py-2 pr-4">Linha</th>
              {months.map((m) => (
                <th key={m.label} className="py-2 pr-4">
                  {m.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr className="border-b">
              <td className="py-2 pr-4">Receitas operacionais</td>
              {months.map((m) => (
                <td key={`rec-${m.label}`} className="py-2 font-medium text-green-700 pr-4">
                  {formatCurrency(m.values.receitasOperacionais)}
                </td>
              ))}
            </tr>
            <tr className="border-b">
              <td className="py-2 pr-4">Despesas operacionais</td>
              {months.map((m) => (
                <td key={`desp-${m.label}`} className="py-2 font-medium text-red-700 pr-4">
                  {formatCurrency(m.values.despesasOperacionais)}
                </td>
              ))}
            </tr>
            <tr className="border-b">
              <td className="py-2 pr-4">Lucro operacional</td>
              {months.map((m) => (
                <td
                  key={`lucro-${m.label}`}
                  className={`py-2 font-semibold pr-4 ${m.values.lucroOperacional >= 0 ? 'text-green-700' : 'text-red-700'}`}
                >
                  {formatCurrency(m.values.lucroOperacional)}
                </td>
              ))}
            </tr>
            <tr className="border-b">
              <td className="py-2 pr-4">Receitas e despesas não operacionais</td>
              {months.map((m) => (
                <td
                  key={`nao-op-${m.label}`}
                  className={`py-2 font-medium pr-4 ${
                    m.values.receitasEDespesasNaoOperacionais >= 0 ? 'text-green-700' : 'text-red-700'
                  }`}
                >
                  {formatCurrency(m.values.receitasEDespesasNaoOperacionais)}
                </td>
              ))}
            </tr>
            <tr>
              <td className="py-2 pr-4">Resultado de caixa</td>
              {months.map((m) => (
                <td
                  key={`caixa-${m.label}`}
                  className={`py-2 font-semibold pr-4 ${
                    m.values.resultadoDeCaixa >= 0 ? 'text-green-800' : 'text-red-800'
                  }`}
                >
                  {formatCurrency(m.values.resultadoDeCaixa)}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

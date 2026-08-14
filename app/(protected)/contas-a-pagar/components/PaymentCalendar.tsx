'use client';

import Link from 'next/link';
import { formatCurrency } from '@/lib/formatters';
import type { InstallmentListItem } from '@/lib/core/database/payables';
import { isoDate } from '@/lib/core/payables/dates';

export function PaymentCalendar({
  year,
  month,
  items,
}: {
  year: number;
  month: number;
  items: InstallmentListItem[];
}) {
  const first = new Date(Date.UTC(year, month - 1, 1));
  const startWeekday = first.getUTCDay();
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const cells: Array<{ day: number | null; date?: string }> = [];
  for (let i = 0; i < startWeekday; i += 1) cells.push({ day: null });
  for (let day = 1; day <= daysInMonth; day += 1) {
    cells.push({
      day,
      date: isoDate(new Date(Date.UTC(year, month - 1, day))),
    });
  }

  const byDate = new Map<string, InstallmentListItem[]>();
  for (const item of items) {
    const key = isoDate(new Date(item.dueDate));
    const current = byDate.get(key) ?? [];
    current.push(item);
    byDate.set(key, current);
  }

  const prev = month === 1 ? { year: year - 1, month: 12 } : { year, month: month - 1 };
  const next = month === 12 ? { year: year + 1, month: 1 } : { year, month: month + 1 };
  const monthLabel = first.toLocaleDateString('pt-BR', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Link
          className="text-sm text-blue-700 hover:underline"
          href={`/contas-a-pagar/agenda?ano=${prev.year}&mes=${prev.month}`}
        >
          ← Anterior
        </Link>
        <h2 className="text-xl font-semibold capitalize">{monthLabel}</h2>
        <Link
          className="text-sm text-blue-700 hover:underline"
          href={`/contas-a-pagar/agenda?ano=${next.year}&mes=${next.month}`}
        >
          Próximo →
        </Link>
      </div>
      <div className="grid grid-cols-7 gap-2 text-xs font-medium text-gray-500">
        {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((label) => (
          <div key={label} className="px-1">
            {label}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-2">
        {cells.map((cell, index) => {
          const dayItems = cell.date ? byDate.get(cell.date) ?? [] : [];
          return (
            <div
              key={index}
              className="min-h-28 rounded-lg border bg-white p-2 text-xs"
            >
              {cell.day && <div className="mb-1 font-semibold">{cell.day}</div>}
              <div className="space-y-1">
                {dayItems.map((item) => (
                  <Link
                    key={item.id}
                    href={`/contas-a-pagar/${item.payableId}`}
                    className={`block rounded px-1 py-0.5 ${
                      item.isOverdue
                        ? 'bg-red-50 text-red-800'
                        : 'bg-blue-50 text-blue-800'
                    }`}
                  >
                    <div className="truncate">{item.payable.vendor.name}</div>
                    <div>{formatCurrency(item.remainingAmount)}</div>
                  </Link>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

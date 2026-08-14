import Link from 'next/link';
import { cn } from '@/lib/utils';

const links = [
  { href: '/contas-a-pagar', label: 'Parcelas' },
  { href: '/contas-a-pagar/agenda', label: 'Agenda' },
  { href: '/contas-a-pagar/nova', label: 'Novo título' },
  { href: '/contas-a-pagar/fornecedores', label: 'Fornecedores' },
  { href: '/contas-a-pagar/recorrentes', label: 'Recorrentes' },
];

export function PayablesNav({ current }: { current: string }) {
  return (
    <div className="flex flex-wrap gap-2">
      {links.map((link) => {
        const active =
          link.href === '/contas-a-pagar'
            ? current === '/contas-a-pagar'
            : current.startsWith(link.href);

        return (
          <Link
            key={link.href}
            href={link.href}
            className={cn(
              'rounded-md px-3 py-1.5 text-sm font-medium',
              active
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 border hover:bg-gray-50'
            )}
          >
            {link.label}
          </Link>
        );
      })}
    </div>
  );
}

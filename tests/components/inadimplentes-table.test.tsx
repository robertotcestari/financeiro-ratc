import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';

// Mock server actions used by the component to avoid execution in tests
vi.mock('@/app/(protected)/inadimplentes/actions', () => ({
  setSettled: vi.fn(),
  deleteItem: vi.fn(),
}));

import InadimplentesTable from '@/app/(protected)/inadimplentes/components/InadimplentesTable';

describe('InadimplentesTable - date rendering', () => {
  it('renders due date without timezone rollback for yyyy-MM-dd', () => {
    const items = [
      {
        id: 'itm-1',
        data: {
          propertyId: 'prop-1',
          tenant: 'João da Silva',
          amount: 123.45,
          dueDate: '2025-09-10', // ensure this is displayed as 10/09/2025
          settled: false,
        },
      },
    ];
    const properties = { 'prop-1': { code: 'P-001' } };

    render(<InadimplentesTable items={items as any} properties={properties} />);

    // Should show the exact same local date (DD/MM/YYYY)
    expect(screen.getByText('10/09/2025')).toBeInTheDocument();

    // And should not show the previous day due to UTC shift
    expect(screen.queryByText('09/09/2025')).not.toBeInTheDocument();
  });
});


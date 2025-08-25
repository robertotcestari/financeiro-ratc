'use client';

import { useRouter } from 'next/navigation';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Props {
  selectedMonth: number;
  selectedYear: number;
}

const months = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

export default function RentFilters({ selectedMonth, selectedYear }: Props) {
  const router = useRouter();

  const handleMonthChange = (month: number, year: number) => {
    const params = new URLSearchParams();
    params.set('mes', month.toString());
    params.set('ano', year.toString());
    router.replace(`/recebimento-alugueis?${params.toString()}`, { scroll: false });
  };

  const handlePreviousMonth = () => {
    let newMonth = selectedMonth - 1;
    let newYear = selectedYear;
    
    if (newMonth < 1) {
      newMonth = 12;
      newYear -= 1;
    }
    
    handleMonthChange(newMonth, newYear);
  };

  const handleNextMonth = () => {
    let newMonth = selectedMonth + 1;
    let newYear = selectedYear;
    
    if (newMonth > 12) {
      newMonth = 1;
      newYear += 1;
    }
    
    handleMonthChange(newMonth, newYear);
  };

  const handleCurrentMonth = () => {
    const now = new Date();
    handleMonthChange(now.getMonth() + 1, now.getFullYear());
  };

  return (
    <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={handlePreviousMonth}
            className="h-8 w-8"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          
          <div className="text-lg font-semibold text-gray-900">
            {months[selectedMonth - 1]} {selectedYear}
          </div>
          
          <Button
            variant="outline"
            size="icon"
            onClick={handleNextMonth}
            className="h-8 w-8"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={handleCurrentMonth}
        >
          Mês Atual
        </Button>
      </div>
    </div>
  );
}
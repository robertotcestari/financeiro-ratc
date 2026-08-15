import { render } from 'react-email';
import { MonthlyReportEmail } from './monthly-report';

export * from './monthly-report';

export async function renderMonthlyReportEmail(props: React.ComponentProps<typeof MonthlyReportEmail>) {
  return render(MonthlyReportEmail(props));
}
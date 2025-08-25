import { getImobziPendingRents } from '../actions';
import ImobziPendingRents from './ImobziPendingRents';

interface ImobziSectionProps {
  month: number;
  year: number;
}

export default async function ImobziSection({ month, year }: ImobziSectionProps) {
  const imobziInvoices = await getImobziPendingRents({ month, year });
  
  return <ImobziPendingRents invoices={imobziInvoices} />;
}
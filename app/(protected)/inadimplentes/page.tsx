import { getProperties, listItems } from './actions';
import InadimplentesForm from './components/InadimplentesForm';
import InadimplentesTable from './components/InadimplentesTable';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default async function InadimplentesPage() {
  const [properties, items] = await Promise.all([getProperties(), listItems()]);

  const propertyMap = Object.fromEntries(properties.map((p) => [p.id, { code: p.code }]));

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Gestão de Inadimplentes</h1>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Novo Inadimplente (parcela)</CardTitle>
          </CardHeader>
          <CardContent>
            <InadimplentesForm properties={properties} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Lista</CardTitle>
          </CardHeader>
          <CardContent>
            <InadimplentesTable items={items} properties={propertyMap} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

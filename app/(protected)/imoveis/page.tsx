import { getProperties } from './actions';
import { getCities } from '../cidades/actions';
import PropertiesManager from './components/PropertiesManager';

export default async function PropertiesPage() {
  const [properties, cities] = await Promise.all([
    getProperties(),
    getCities(),
  ]);

  return (
    <PropertiesManager initialProperties={properties} initialCities={cities} />
  );
}

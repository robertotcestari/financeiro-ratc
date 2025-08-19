import { getCities } from './actions';
import CitiesManager from './components/CitiesManager';

export default async function CitiesPage() {
  const cities = await getCities();

  return <CitiesManager initialCities={cities} />;
}

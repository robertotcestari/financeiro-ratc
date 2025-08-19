import WelcomeHero from './components/WelcomeHero';

export default function Home() {
  return (
    <main className="min-h-screen bg-gray-50">
      {/* Welcome Hero - adapts based on authentication */}
      <WelcomeHero />

      {/* Cards removed from home — only WelcomeHero shown */}
    </main>
  );
}

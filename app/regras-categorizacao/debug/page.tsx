import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';

export default function DebugPage() {
  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Debug Page</h1>
          <p className="text-gray-600 mt-1">Testing if basic button renders</p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Test Button
        </Button>
      </div>
      
      <div className="bg-gray-100 p-4 rounded">
        <p>If you can see this test button above, the issue is with the CreateRuleDialog component.</p>
        <p>If you can't see the test button, the issue is with basic component rendering.</p>
      </div>
    </div>
  );
}
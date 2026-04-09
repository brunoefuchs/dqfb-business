import { modules } from '@/config/modules';
import { ModuleCard } from '@/components/cards/ModuleCard';

export function ModulesGrid() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
      {modules.map((module) => (
        <ModuleCard key={module.id} module={module} />
      ))}
    </div>
  );
}

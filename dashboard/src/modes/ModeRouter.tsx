import { Suspense } from 'react';
import { useStore } from '../store/useStore';
import { modes } from './registry';

export function ModeRouter() {
  const activeMode = useStore((s) => s.activeMode);
  const mode = modes.find((m) => m.id === activeMode) ?? modes[0];
  const Component = mode.component;

  return (
    <Suspense
      fallback={
        <div className="text-center py-12 text-slate-400">Loading mode...</div>
      }
    >
      <Component />
    </Suspense>
  );
}

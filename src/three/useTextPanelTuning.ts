import { useEffect, useReducer } from 'react';
import { onTextPanelChange } from './poses';

// Re-render the subscribing component when the dev panel mutates TEXT_PANEL, so
// scale/size (React props, not read per-frame) apply live. No-op outside dev.
export function useTextPanelTuning(): void {
  const [, force] = useReducer((c) => c + 1, 0);
  useEffect(() => onTextPanelChange(force), []);
}

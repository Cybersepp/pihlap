import { Component, ReactNode } from 'react';
import { SceneFallback } from './SceneFallback';

interface Props {
  children: ReactNode;
}
interface State {
  failed: boolean;
}

// Catches anything the lazy WebGL scene throws at runtime — a lost/failed GL
// context, a chunk that failed to stream in, a render error — and swaps in the
// plain-document fallback so the site never dead-ends on a blank canvas. The
// pre-flight isWebGLAvailable() check in App handles the "no GL at all" case; this
// is the safety net for failures that only surface once the scene is running.
export class SceneBoundary extends Component<Props, State> {
  state: State = { failed: false };

  static getDerivedStateFromError(): State {
    return { failed: true };
  }

  componentDidCatch(error: unknown) {
    // Surfaced in the console for debugging; the user just sees the fallback.
    console.error('WebGL scene failed, showing fallback:', error);
  }

  render() {
    if (this.state.failed) return <SceneFallback />;
    return this.props.children;
  }
}

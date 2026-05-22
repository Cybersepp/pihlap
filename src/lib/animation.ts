import { Transition } from 'framer-motion';
import { IconClickOrigin } from '../components/DesktopIcon';

// Compute transform-origin in the window's local coordinate space so that a
// scale animation appears to emerge from where the user clicked on the desktop.
// Windows are centered (top/left 50% + translate -50% -50%), so the window's
// top-left in viewport coords is (innerWidth - width) / 2, etc.
export function makeTransformOrigin(
  origin: IconClickOrigin | null,
  width: number,
  height: number
): string {
  if (!origin || typeof window === 'undefined') return '50% 50%';
  const left = (window.innerWidth - width) / 2;
  const top = (window.innerHeight - height) / 2;
  return `${origin.x - left}px ${origin.y - top}px`;
}

// Apple-feel spring: quick, slight overshoot, settles fast.
export const springOpen: Transition = {
  type: 'spring',
  stiffness: 340,
  damping: 28,
  mass: 0.9,
};

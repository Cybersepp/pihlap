import { motion } from 'framer-motion';
import { IconClickOrigin } from './DesktopIcon';
import { makeTransformOrigin, springOpen } from '../lib/animation';
import { clampWindowSize, getPopupWindowStyle } from '../lib/device';

interface SimpleTextWindowProps {
  title: string;
  content: string;
  onClose: () => void;
  isMobile: boolean;
  origin: IconClickOrigin | null;
}

const WIN_WIDTH = 480;
const WIN_HEIGHT = 380;

export function SimpleTextWindow({
  title,
  content,
  onClose,
  isMobile,
  origin,
}: SimpleTextWindowProps) {
  const clampedSize = clampWindowSize(WIN_WIDTH, WIN_HEIGHT);
  const windowStyle = getPopupWindowStyle(WIN_WIDTH, WIN_HEIGHT);

  return (
    <motion.div
      className="window text-window"
      style={{
        ...windowStyle,
        transformOrigin: isMobile ? '50% 50%' : makeTransformOrigin(origin, clampedSize.width, clampedSize.height),
      }}
      initial={{ scale: 0.85, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0.9, opacity: 0 }}
      transition={springOpen}
    >
      <div className="window-titlebar">
        <div className="traffic-lights">
          <button className="tl tl--close" onClick={onClose} aria-label="Close" />
          <span className="tl tl--min tl--dim" aria-hidden="true" />
          <span className="tl tl--zoom tl--dim" aria-hidden="true" />
        </div>
        <span className="window-titlebar-title">{title}</span>
      </div>

      <div className="window-body">{content}</div>
    </motion.div>
  );
}

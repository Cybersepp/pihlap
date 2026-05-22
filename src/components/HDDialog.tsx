import { motion } from 'framer-motion';
import { CautionIcon } from './Icons';

interface HDDialogProps {
  onClose: () => void;
}

export function HDDialog({ onClose }: HDDialogProps) {
  return (
    <motion.div
      className="dialog-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
    >
      <motion.div
        className="dialog"
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
      >
        <div className="dialog-icon">
          <CautionIcon />
        </div>
        <h2 className="dialog-title">Sharing is not configured</h2>
        <p className="dialog-text">
          You cannot open this disk because Sharing Setup has not been configured.
        </p>
        <div className="dialog-actions">
          <button className="btn btn--primary" onClick={onClose}>
            OK
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

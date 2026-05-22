import { CautionIcon } from './Icons';

interface HDDialogProps {
  onClose: () => void;
}

export function HDDialog({ onClose }: HDDialogProps) {
  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 500,
      }}
    >
      <div className="os9-dialog" style={{ width: 320 }}>
        <div className="os9-dialog-body">
          <div className="os9-dialog-icon">
            <CautionIcon />
          </div>
          <div className="os9-dialog-text">
            You cannot open this disk because Sharing Setup has not been configured.
          </div>
        </div>
        <div className="os9-dialog-footer">
          <button className="os9-button os9-button-default" onClick={onClose}>
            OK
          </button>
        </div>
      </div>
    </div>
  );
}

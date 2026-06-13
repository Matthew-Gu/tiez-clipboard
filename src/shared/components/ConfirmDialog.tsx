interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  theme: string;
  confirmLabel: string;
  cancelLabel: string;
  onConfirm: () => void;
  onClose: () => void;
}

const ConfirmDialog = ({
  open,
  title,
  message,
  theme,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onClose
}: ConfirmDialogProps) => {
  if (!open) return null;

  return (
    <div className="dialog-backdrop" onClick={onClose}>
      <div className={`dialog theme-${theme}`} onClick={(e) => e.stopPropagation()}>
        <div className="dialog__title">{title}</div>
        <div className="dialog__message">{message}</div>
        <div className="dialog__actions">
          <button className="dialog__button" onClick={onClose}>
            {cancelLabel}
          </button>
          <button className="dialog__button dialog__button--primary" onClick={onConfirm}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmDialog;

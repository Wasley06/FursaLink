import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { Modal } from './Modal';

export function ConfirmModal({
  open,
  title,
  description,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  tone = 'primary',
  loading,
  onConfirm,
  onClose,
}: {
  open: boolean;
  title: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  tone?: 'primary' | 'danger' | 'warning' | 'success';
  loading?: boolean;
  onConfirm: () => void | Promise<void>;
  onClose: () => void;
}) {
  const btn =
    tone === 'danger'
      ? 'bg-danger hover:bg-danger/90'
      : tone === 'warning'
        ? 'bg-warning hover:bg-warning/90'
        : tone === 'success'
          ? 'bg-emerald hover:bg-emerald/90'
          : 'bg-primary hover:bg-primary-hover';

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      footer={
        <div className="flex flex-col sm:flex-row gap-3 sm:justify-end">
          <button type="button" className="btn-outline justify-center py-3" onClick={onClose} disabled={loading}>
            {cancelText}
          </button>
          <button
            type="button"
            className={`btn-primary justify-center py-3 border-none ${btn}`}
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? 'Working…' : confirmText}
          </button>
        </div>
      }
    >
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-xl bg-sky border border-white/50">
          <AlertTriangle className="w-5 h-5 text-warning" />
        </div>
        <div className="min-w-0">
          {description && <div className="text-sm text-muted font-medium whitespace-pre-line">{description}</div>}
        </div>
      </div>
    </Modal>
  );
}


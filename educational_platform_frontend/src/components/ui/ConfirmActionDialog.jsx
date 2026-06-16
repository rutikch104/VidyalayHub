// @ts-nocheck
import { Loader2, X } from 'lucide-react';
import UserAvatar from '@/components/ui/UserAvatar';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';

const TONE_CONFIRM_CLASS = {
  danger: 'confirm-action-dialog__btn--danger',
  warning: 'confirm-action-dialog__btn--warning',
  info: 'confirm-action-dialog__btn--info',
  success: 'confirm-action-dialog__btn--success',
};

/**
 * Premium Lovable-style confirmation dialog — centered layout, pill actions, contextual cards.
 */
export default function ConfirmActionDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  cancelLabel = 'Cancel',
  tone = 'danger',
  icon: Icon,
  loading = false,
  loadingLabel = 'Processing…',
  confirmDisabled = false,
  error = '',
  onConfirm,
  onCancel,
  contextPerson,
  contextPreview,
  contextSlot,
}) {
  const handleOpenChange = (next) => {
    if (!next && loading) return;
    if (!next) onCancel?.();
    onOpenChange?.(next);
  };

  const handleClose = () => {
    if (!loading) handleOpenChange(false);
  };

  const handleCancel = () => {
    if (!loading) handleClose();
  };

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogContent
        overlayClassName="confirm-action-dialog__overlay"
        className={cn(
          'confirm-action-dialog',
          'max-w-none gap-0 border-0 bg-transparent p-0 shadow-none',
          'data-[state=open]:animate-none data-[state=closed]:animate-none',
          'sm:rounded-none',
        )}
      >
        <div className="confirm-action-dialog__surface">
          <button
            type="button"
            className="confirm-action-dialog__close"
            onClick={handleClose}
            disabled={loading}
            aria-label="Close dialog"
          >
            <X className="h-4 w-4" strokeWidth={2} aria-hidden />
          </button>

          <div className="confirm-action-dialog__body">
            <AlertDialogHeader className="confirm-action-dialog__header space-y-0">
              {Icon ? (
                <div
                  className={cn(
                    'confirm-action-dialog__icon',
                    `confirm-action-dialog__icon--${tone}`,
                  )}
                  aria-hidden
                >
                  <Icon className="h-5 w-5" strokeWidth={2.25} />
                </div>
              ) : null}

              <AlertDialogTitle className="confirm-action-dialog__title">{title}</AlertDialogTitle>

              {description ? (
                <AlertDialogDescription className="confirm-action-dialog__desc">
                  {description}
                </AlertDialogDescription>
              ) : null}
            </AlertDialogHeader>

            {contextSlot}

            {!contextSlot && contextPerson ? (
              <div className="confirm-action-dialog__context confirm-action-dialog__context--person">
                <UserAvatar
                  name={contextPerson.name}
                  avatarUrl={contextPerson.avatarUrl}
                  size="md"
                  showStatus={false}
                />
                <div className="min-w-0 flex-1 text-left">
                  <p className="confirm-action-dialog__context-title">{contextPerson.name}</p>
                  {contextPerson.subtitle ? (
                    <p className="confirm-action-dialog__context-meta">{contextPerson.subtitle}</p>
                  ) : null}
                </div>
              </div>
            ) : null}

            {!contextSlot && !contextPerson && contextPreview ? (
              <div className="confirm-action-dialog__context confirm-action-dialog__context--preview">
                <p className="confirm-action-dialog__context-preview">{contextPreview}</p>
              </div>
            ) : null}

            {error ? (
              <p className="confirm-action-dialog__error" role="alert">
                {error}
              </p>
            ) : null}

            <div className="confirm-action-dialog__actions">
              <button
                type="button"
                disabled={loading}
                onClick={handleCancel}
                className="confirm-action-dialog__btn confirm-action-dialog__btn--cancel"
              >
                {cancelLabel}
              </button>
              <button
                type="button"
                disabled={loading || confirmDisabled}
                onClick={onConfirm}
                className={cn(
                  'confirm-action-dialog__btn confirm-action-dialog__btn--confirm',
                  TONE_CONFIRM_CLASS[tone] || TONE_CONFIRM_CLASS.danger,
                )}
              >
                {loading ? <Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-hidden /> : null}
                <span>{loading ? loadingLabel : confirmLabel}</span>
              </button>
            </div>
          </div>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  );
}

import { CONFIRM_ACTION_PRESETS } from '@/components/ui/confirmActionPresets';
import ConfirmActionDialog from '@/components/ui/ConfirmActionDialog';

export default function RemoveAmplifyDialog({
  open,
  onOpenChange,
  loading = false,
  onConfirm,
}) {
  const preset = CONFIRM_ACTION_PRESETS.removeAmplify;

  return (
    <ConfirmActionDialog
      open={open}
      onOpenChange={onOpenChange}
      title={preset.title}
      description={preset.description}
      confirmLabel={preset.confirmLabel}
      tone={preset.tone}
      icon={preset.icon}
      loading={loading}
      loadingLabel="Removing…"
      onConfirm={onConfirm}
      onCancel={() => onOpenChange?.(false)}
    />
  );
}

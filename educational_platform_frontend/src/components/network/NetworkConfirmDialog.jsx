// @ts-nocheck
import ConfirmActionDialog from '@/components/ui/ConfirmActionDialog';

export default function NetworkConfirmDialog({
  open,
  preset,
  person,
  loading = false,
  onCancel,
  onConfirm,
}) {
  if (!preset) return null;

  return (
    <ConfirmActionDialog
      open={open}
      onOpenChange={(next) => {
        if (!next && !loading) onCancel?.();
      }}
      title={preset.title}
      description={preset.description}
      confirmLabel={preset.confirmLabel}
      tone={preset.tone}
      icon={preset.icon}
      loading={loading}
      onConfirm={onConfirm}
      onCancel={onCancel}
      contextPerson={
        person
          ? {
              name: person.name,
              avatarUrl: person.avatar,
              subtitle: person.academic_identity || person.title || null,
            }
          : null
      }
    />
  );
}

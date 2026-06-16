import { CONFIRM_ACTION_PRESETS } from '@/components/ui/confirmActionPresets';

/** Network tab presets — aliases over the platform confirmation system. */
export const NETWORK_CONFIRM_PRESETS = {
  remove: CONFIRM_ACTION_PRESETS.removeConnection,
  decline: CONFIRM_ACTION_PRESETS.ignoreInvitation,
  withdraw: CONFIRM_ACTION_PRESETS.withdrawRequest,
  unfollow: CONFIRM_ACTION_PRESETS.unfollow,
};

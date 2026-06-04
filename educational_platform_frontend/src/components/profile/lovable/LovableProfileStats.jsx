/**
 * Legacy stats grid — header now embeds the social stats strip.
 * Re-export compact variant for any secondary usage.
 */
import { formatStatValue } from '@/components/profile/lovable/profileHeaderUtils';

export { formatStatValue };

/** @deprecated Stats are rendered inside LovableProfileHeader. Kept for backward compatibility. */
export default function LovableProfileStats() {
  return null;
}

import React, { useEffect, useMemo, useState } from 'react';
import { Building2, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import brandingService from '@/services/brandingService';
import {
  institutionBrandingFromUser,
  institutionMonogram,
} from '@/lib/institutionBranding';

/**
 * Header institution identity — college name + logo from tenant record.
 */
export default function InstitutionBranding({
  onNavigate,
  className,
  compact = false,
}) {
  const { user, updateUser } = useAuth();
  const [logoFailed, setLogoFailed] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const branding = useMemo(() => institutionBrandingFromUser(user), [user]);

  useEffect(() => {
    setLogoFailed(false);
  }, [branding?.logo_url, branding?.name]);

  useEffect(() => {
    if (!user?.tenant_id) return;
    if (user.tenant_name) return;

    let cancelled = false;
    setRefreshing(true);
    brandingService
      .fetchInstitutionBranding()
      .then((b) => {
        if (cancelled || !b) return;
        updateUser({
          tenant_name: b.name,
          tenant_logo_url: b.logo_url,
          institution: b,
        });
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setRefreshing(false);
      });

    return () => {
      cancelled = true;
    };
  }, [user?.tenant_id, user?.tenant_name, user?.tenant_logo_url, updateUser]);

  if (!branding) return null;

  const monogram = institutionMonogram(branding.name);
  const showLogo = Boolean(branding.logo_url) && !logoFailed;

  return (
    <button
      type="button"
      onClick={() => onNavigate?.('home')}
      className={cn(
        'institution-brand group flex min-w-0 shrink items-center gap-2.5 rounded-xl border border-transparent px-1 py-0.5 transition-all duration-200',
        'hover:border-border/60 hover:bg-muted/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/30',
        className,
      )}
      aria-label={`${branding.name} — go to home`}
      title={branding.name}
    >
      <div
        className={cn(
          'relative flex shrink-0 items-center justify-center overflow-hidden rounded-xl bg-card shadow-soft ring-1 ring-border/80',
          compact ? 'h-8 w-8' : 'h-9 w-9 sm:h-10 sm:w-10',
        )}
      >
        {showLogo ? (
          <img
            src={branding.logo_url}
            alt=""
            className="h-full w-full object-contain p-1"
            onError={() => setLogoFailed(true)}
          />
        ) : (
          <span
            className={cn(
              'font-display font-extrabold tracking-tight text-primary',
              compact ? 'text-xs' : 'text-sm',
            )}
          >
            {monogram}
          </span>
        )}
        {refreshing ? (
          <span className="absolute inset-0 flex items-center justify-center bg-background/70">
            <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" aria-hidden />
          </span>
        ) : null}
      </div>

      <div className="hidden min-w-0 text-left sm:block">
        <p
          className={cn(
            'institution-brand__name truncate font-display font-bold tracking-tight text-foreground',
            compact ? 'max-w-[9rem] text-xs' : 'max-w-[10rem] text-sm sm:max-w-[12rem] md:max-w-[16rem] lg:max-w-[20rem] xl:max-w-[24rem] sm:text-[15px]',
          )}
        >
          {branding.name}
        </p>
        {!compact && !branding.isPlatformFallback ? (
          <p className="institution-brand__meta flex items-center gap-1 truncate text-[10px] font-medium uppercase tracking-widest text-muted-foreground/75">
            <Building2 className="h-2.5 w-2.5 shrink-0 opacity-70" aria-hidden />
            <span className="truncate">Institution portal</span>
          </p>
        ) : null}
      </div>
    </button>
  );
}

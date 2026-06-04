import React from 'react';
import type { LucideIcon } from 'lucide-react';
import { Search } from 'lucide-react';

type TabItem = { id: string; label: string; icon: LucideIcon };

type KpiTone = 'indigo' | 'emerald' | 'violet' | 'amber' | 'rose' | 'sky';

export function SuperAdminShell({ children }: { children: React.ReactNode }) {
  return <div className="sa-portal">{children}</div>;
}

export function SuperAdminContainer({ children }: { children: React.ReactNode }) {
  return <div className="sa-portal__container">{children}</div>;
}

export function SuperAdminHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle: string;
  actions?: React.ReactNode;
}) {
  return (
    <header className="sa-portal__header">
      <div className="sa-portal__header-brand">
        <div className="sa-portal__header-icon" aria-hidden>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          </svg>
        </div>
        <div className="min-w-0">
          <h1 className="sa-portal__title">{title}</h1>
          <p className="sa-portal__subtitle">{subtitle}</p>
        </div>
      </div>
      {actions ? <div className="sa-portal__header-actions">{actions}</div> : null}
    </header>
  );
}

export function SuperAdminStatusPill({ label = 'System Healthy' }: { label?: string }) {
  return (
    <div className="sa-portal__status-pill">
      <span className="sa-portal__status-dot" aria-hidden />
      <span>{label}</span>
    </div>
  );
}

export function SuperAdminButton({
  children,
  onClick,
  disabled,
  variant = 'default',
  className = '',
  type = 'button',
  title,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  variant?: 'default' | 'primary' | 'success' | 'ghost';
  className?: string;
  type?: 'button' | 'submit';
  title?: string;
}) {
  const variantClass =
    variant === 'primary'
      ? 'sa-portal__btn--primary'
      : variant === 'success'
        ? 'sa-portal__btn--success'
        : variant === 'ghost'
          ? 'sa-portal__btn--ghost'
          : '';
  return (
    <button
      type={type}
      title={title}
      disabled={disabled}
      onClick={onClick}
      className={`sa-portal__btn ${variantClass} ${className}`.trim()}
    >
      {children}
    </button>
  );
}

export function SuperAdminTabs({
  tabs,
  activeTab,
  onChange,
}: {
  tabs: TabItem[];
  activeTab: string;
  onChange: (id: string) => void;
}) {
  return (
    <nav className="sa-portal__tabs-shell" aria-label="Super admin sections">
      <div className="sa-portal__tabs" role="tablist">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={active}
              className={`sa-portal__tab ${active ? 'sa-portal__tab--active' : ''}`}
              onClick={() => onChange(tab.id)}
            >
              <Icon className="sa-portal__tab-icon" aria-hidden />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

export function SuperAdminContent({ children }: { children: React.ReactNode }) {
  return <main className="sa-portal__content">{children}</main>;
}

export function SuperAdminKpiGrid({
  children,
  cols = 4,
}: {
  children: React.ReactNode;
  cols?: 3 | 4;
}) {
  return (
    <div className={`sa-kpi-grid ${cols === 3 ? 'sa-kpi-grid--3' : ''}`}>
      {children}
    </div>
  );
}

export function SuperAdminKpiCard({
  label,
  value,
  icon: Icon,
  tone = 'indigo',
}: {
  label: string;
  value: string | number;
  icon: LucideIcon;
  tone?: KpiTone;
}) {
  return (
    <article className={`sa-kpi-card sa-kpi-card--${tone}`}>
      <div className="sa-kpi-card__row">
        <div>
          <p className="sa-kpi-card__label">{label}</p>
          <p className="sa-kpi-card__value">{value}</p>
        </div>
        <div className="sa-kpi-card__icon" aria-hidden>
          <Icon className="h-4 w-4" />
        </div>
      </div>
    </article>
  );
}

export function SuperAdminPanel({
  title,
  subtitle,
  headerExtra,
  children,
  flush = false,
  headerStack = false,
}: {
  title?: string;
  subtitle?: string;
  headerExtra?: React.ReactNode;
  children: React.ReactNode;
  flush?: boolean;
  headerStack?: boolean;
}) {
  return (
    <section className="sa-panel">
      {title || headerExtra ? (
        <div className={`sa-panel__header ${headerStack ? 'sa-panel__header--stack' : ''}`}>
          <div className="min-w-0">
            {title ? <h2 className="sa-panel__title">{title}</h2> : null}
            {subtitle ? <p className="sa-panel__subtitle">{subtitle}</p> : null}
          </div>
          {headerExtra}
        </div>
      ) : null}
      <div className={flush ? 'sa-panel__body sa-panel__body--flush' : 'sa-panel__body'}>
        {children}
      </div>
    </section>
  );
}

export function SuperAdminSectionHead({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="sa-portal__section-head">
      <div>
        <h2 className="sa-portal__section-title">{title}</h2>
        {description ? <p className="sa-portal__section-desc">{description}</p> : null}
      </div>
      {actions}
    </div>
  );
}

export function SuperAdminSearch({
  value,
  onChange,
  placeholder,
  className = '',
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
}) {
  return (
    <div className={`sa-search ${className}`.trim()}>
      <Search className="sa-search__icon" aria-hidden />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="sa-search__input"
      />
    </div>
  );
}

export function SuperAdminFilterChips({
  options,
  value,
  onChange,
}: {
  options: string[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="sa-filters" role="group" aria-label="Filters">
      {options.map((opt) => (
        <button
          key={opt}
          type="button"
          className={`sa-filter-chip ${value === opt ? 'sa-filter-chip--active' : ''}`}
          onClick={() => onChange(opt)}
        >
          {opt}
        </button>
      ))}
    </div>
  );
}

export function SuperAdminToolbar({ children }: { children: React.ReactNode }) {
  return <div className="sa-toolbar">{children}</div>;
}

export function SuperAdminBadge({
  children,
  variant = 'neutral',
}: {
  children: React.ReactNode;
  variant?: 'success' | 'warning' | 'danger' | 'neutral' | 'plan';
}) {
  return <span className={`sa-badge sa-badge--${variant}`}>{children}</span>;
}

export function SuperAdminAlert({
  children,
  variant = 'error',
}: {
  children: React.ReactNode;
  variant?: 'error' | 'success' | 'loading';
}) {
  return <div className={`sa-alert sa-alert--${variant}`}>{children}</div>;
}

export function SuperAdminTableWrap({ children }: { children: React.ReactNode }) {
  return <div className="sa-table-wrap">{children}</div>;
}

export function SuperAdminEmpty({ children }: { children: React.ReactNode }) {
  return <p className="sa-empty">{children}</p>;
}

export function statusToBadgeVariant(status: string): 'success' | 'warning' | 'danger' | 'neutral' {
  if (status === 'Active') return 'success';
  if (status === 'Pending' || status === 'Trial') return 'warning';
  if (status === 'Suspended' || status === 'Expired' || status === 'Inactive') return 'danger';
  return 'neutral';
}

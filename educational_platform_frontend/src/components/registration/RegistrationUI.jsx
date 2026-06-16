import React, { useRef, useState, Children, isValidElement } from 'react';
import * as SelectPrimitive from '@radix-ui/react-select';
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronDown,
  Loader2,
  Upload,
  X,
} from 'lucide-react';

export function RegField({
  label,
  required,
  optional,
  hint,
  error,
  children,
  htmlFor,
}) {
  return (
    <label className="reg-field" htmlFor={htmlFor}>
      {label ? (
        <div className="reg-field__label-row">
          <span className="reg-field__label">
            {label}
            {required ? <span className="reg-field__required" aria-hidden> *</span> : null}
          </span>
          {optional ? <span className="reg-field__optional">Optional</span> : null}
        </div>
      ) : null}
      {children}
      {error ? (
        <span className="reg-field__error" role="alert">
          <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
          {error}
        </span>
      ) : null}
      {hint && !error ? <span className="reg-field__hint">{hint}</span> : null}
    </label>
  );
}

export function RegInput({
  id,
  className = '',
  error,
  icon: Icon,
  rightAction,
  readOnly,
  ...props
}) {
  const input = (
    <input
      id={id}
      className={`reg-input ${readOnly ? 'reg-input--readonly' : ''} ${error ? 'reg-input--error' : ''} ${rightAction ? 'reg-input--has-right' : ''} ${className}`.trim()}
      readOnly={readOnly}
      {...props}
    />
  );
  if (!Icon && !rightAction) return input;
  return (
    <div className="reg-input-wrap">
      {Icon ? <Icon className="reg-input-wrap__icon h-4 w-4" aria-hidden /> : null}
      {input}
      {rightAction ? <div className="reg-input-wrap__action">{rightAction}</div> : null}
    </div>
  );
}

function parseSelectOptions(children) {
  const options = [];
  Children.forEach(children, (child) => {
    if (!isValidElement(child) || child.type !== 'option') return;
    options.push({
      value: child.props.value ?? '',
      label: child.props.children,
      disabled: Boolean(child.props.disabled),
    });
  });
  return options;
}

export function RegSelect({
  id,
  className = '',
  error,
  children,
  value,
  onChange,
  disabled,
  name,
  placeholder,
  ...props
}) {
  const options = parseSelectOptions(children);
  const emptyOption = options.find((o) => o.value === '');
  const placeholderText =
    placeholder ||
    (typeof emptyOption?.label === 'string' ? emptyOption.label : 'Select an option');
  const items = options.filter((o) => o.value !== '');
  const stringValue = value === '' || value == null ? undefined : String(value);
  const hasValue = stringValue && items.some((o) => String(o.value) === stringValue);
  const selectValue = hasValue ? stringValue : undefined;

  const handleValueChange = (next) => {
    onChange?.({ target: { value: next, name } });
  };

  return (
    <SelectPrimitive.Root
      value={selectValue}
      onValueChange={handleValueChange}
      disabled={disabled}
      name={name}
      {...props}
    >
      <SelectPrimitive.Trigger
        id={id}
        className={`reg-select-trigger ${error ? 'reg-select-trigger--error' : ''} ${disabled ? 'reg-select-trigger--disabled' : ''} ${className}`.trim()}
        aria-invalid={error ? true : undefined}
      >
        <SelectPrimitive.Value placeholder={placeholderText} />
        <SelectPrimitive.Icon asChild>
          <ChevronDown className="reg-select-trigger__chevron h-4 w-4" aria-hidden />
        </SelectPrimitive.Icon>
      </SelectPrimitive.Trigger>
      <SelectPrimitive.Portal>
        <SelectPrimitive.Content
          className="reg-select-content"
          position="popper"
          sideOffset={6}
          align="start"
          collisionPadding={12}
        >
          <SelectPrimitive.Viewport className="reg-select-viewport">
            {items.map((option) => (
              <SelectPrimitive.Item
                key={String(option.value)}
                value={String(option.value)}
                disabled={option.disabled}
                className="reg-select-item"
              >
                <SelectPrimitive.ItemIndicator className="reg-select-item__check">
                  <Check className="h-4 w-4" aria-hidden />
                </SelectPrimitive.ItemIndicator>
                <SelectPrimitive.ItemText className="reg-select-item__text">
                  {option.label}
                </SelectPrimitive.ItemText>
              </SelectPrimitive.Item>
            ))}
          </SelectPrimitive.Viewport>
        </SelectPrimitive.Content>
      </SelectPrimitive.Portal>
    </SelectPrimitive.Root>
  );
}

export function RegTextarea({ id, className = '', error, ...props }) {
  return (
    <textarea
      id={id}
      className={`reg-textarea ${error ? 'reg-input--error' : ''} ${className}`.trim()}
      {...props}
    />
  );
}

export function RegSection({ icon: Icon, title, description, children, divider }) {
  return (
    <div className={`reg-section ${divider ? 'reg-section--divider' : ''}`.trim()}>
      {title ? (
        <div className="reg-section__head">
          {Icon ? (
            <div className="reg-section__icon">
              <Icon className="h-4 w-4" />
            </div>
          ) : null}
          <div>
            <h3 className="reg-section__title">{title}</h3>
            {description ? <p className="reg-section__desc">{description}</p> : null}
          </div>
        </div>
      ) : null}
      <div className="reg-section__body">{children}</div>
    </div>
  );
}

export function RegSectionLabel({ children }) {
  return <p className="reg-section__divider-label">{children}</p>;
}

export function RegGrid({ cols = 2, children }) {
  return <div className={`reg-grid reg-grid--${cols}`}>{children}</div>;
}

export function RegFileUpload({
  label,
  name,
  value,
  onChange,
  accept = 'image/*,application/pdf',
  required,
  optional,
  hint,
}) {
  const inputRef = useRef(null);
  const [dragging, setDragging] = useState(false);

  const setFile = (file) => onChange?.(name, file || null);

  const onDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) setFile(file);
  };

  return (
    <RegField label={label} required={required} optional={optional || !required} hint={hint}>
      <div className="reg-upload">
        <div
          className={`reg-upload__zone ${dragging ? 'reg-upload__zone--drag' : ''} ${value ? 'reg-upload__zone--has-file' : ''}`.trim()}
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          onClick={() => inputRef.current?.click()}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') inputRef.current?.click(); }}
          role="button"
          tabIndex={0}
        >
          {value ? (
            <>
              <div className="reg-upload__icon">
                <Check className="h-4 w-4" />
              </div>
              <span className="reg-upload__file-name">{value.name}</span>
            </>
          ) : (
            <>
              <div className="reg-upload__icon">
                <Upload className="h-4 w-4" />
              </div>
              <div>
                <p className="reg-upload__title">Choose file</p>
                <p className="reg-upload__sub">PDF or image</p>
              </div>
            </>
          )}
          <input
            ref={inputRef}
            type="file"
            accept={accept}
            className="reg-upload__input"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            tabIndex={-1}
          />
        </div>
        {value ? (
          <button
            type="button"
            className="reg-upload__clear"
            onClick={(e) => { e.stopPropagation(); setFile(null); if (inputRef.current) inputRef.current.value = ''; }}
          >
            Remove file
          </button>
        ) : null}
      </div>
    </RegField>
  );
}

export function RegInfoBanner({ icon: Icon, title, children }) {
  return (
    <div className="reg-info-banner">
      {Icon ? (
        <div className="reg-info-banner__icon">
          <Icon className="h-4 w-4" />
        </div>
      ) : null}
      <div>
        {title ? <p className="reg-info-banner__title">{title}</p> : null}
        <div className="reg-info-banner__text">{children}</div>
      </div>
    </div>
  );
}

export function RegStepProgress({ steps, currentStep, progress }) {
  const currentLabel = steps[currentStep] || '';
  return (
    <div className="reg-steps">
      <div className="reg-steps__meta">
        <span className="reg-steps__current">{currentLabel}</span>
        <span className="reg-steps__count">Step {currentStep + 1} of {steps.length}</span>
      </div>
      <div className="reg-steps__bar">
        <div className="reg-steps__bar-fill" style={{ width: `${progress}%` }} />
      </div>
    </div>
  );
}

export function RegRoleSelector({ options, value, onChange }) {
  return (
    <div className="reg-role-wrap">
      <span className="reg-role-label">I am registering as</span>
      <div className="reg-role-segment" role="tablist">
        {options.map(({ value: v, label, icon: Icon }) => (
          <button
            key={v}
            type="button"
            role="tab"
            aria-selected={value === v}
            onClick={() => onChange(v)}
            className={`reg-role-segment__btn ${value === v ? 'reg-role-segment__btn--active' : ''}`.trim()}
          >
            <Icon aria-hidden />
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}

export function RegAlert({ variant = 'error', children }) {
  return (
    <div className={`reg-alert reg-alert--${variant}`} role="alert">
      <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
      <span>{children}</span>
    </div>
  );
}

export function RegActions({
  onBack,
  onContinue,
  onSubmit,
  backDisabled,
  continueLabel = 'Continue',
  submitLabel = 'Submit application',
  loading,
  isLastStep,
}) {
  return (
    <div className="reg-actions">
      <button
        type="button"
        className="reg-btn reg-btn--secondary"
        disabled={backDisabled || loading}
        onClick={onBack}
      >
        <ArrowLeft className="h-4 w-4" />
        Back
      </button>
      {isLastStep ? (
        <button
          type="button"
          className="reg-btn reg-btn--primary"
          disabled={loading}
          onClick={onSubmit}
        >
          {loading ? (
            <>
              <Loader2 className="reg-btn__spinner h-4 w-4" />
              Submitting…
            </>
          ) : submitLabel}
        </button>
      ) : (
        <button type="button" className="reg-btn reg-btn--primary" onClick={onContinue}>
          {continueLabel}
          <ArrowRight className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}

export function RegReviewCard({ title, subtitle, rows, footer }) {
  return (
    <div className="reg-review">
      <div className="reg-review__head">
        <p className="reg-review__head-title">{title || 'Review your application'}</p>
        {subtitle ? <p className="reg-review__head-sub">{subtitle}</p> : null}
      </div>
      <div className="reg-review__grid">
        {rows.map(({ key, value }) => (
          value != null && value !== '' && value !== '—' ? (
            <div key={key} className="reg-review__row">
              <span className="reg-review__key">{key}</span>
              <span className="reg-review__val">{value}</span>
            </div>
          ) : null
        ))}
      </div>
      {footer ? <div className="reg-review__footer">{footer}</div> : null}
    </div>
  );
}

export function RegSuccessCard({ title, message, status, trackHref, trackLabel = 'Track approval status' }) {
  return (
    <div className="reg-success">
      <div className="reg-success__icon">
        <Check className="h-6 w-6" />
      </div>
      <h3 className="reg-success__title">{title || 'Registration submitted'}</h3>
      {message ? <p className="reg-success__text">{message}</p> : null}
      {status ? <p className="reg-success__text"><strong>Status:</strong> {status}</p> : null}
      {trackHref ? (
        <a href={trackHref} className="reg-success__link">
          {trackLabel}
          <ArrowRight className="h-4 w-4" />
        </a>
      ) : null}
    </div>
  );
}

export function RegCheck({ name, checked, onChange, children }) {
  return (
    <label className="reg-check">
      <input type="checkbox" name={name} checked={checked} onChange={onChange} />
      {children}
    </label>
  );
}

export function RegPageHeader({ eyebrow, title, description }) {
  return (
    <div className="reg-page-header">
      {eyebrow ? <p className="reg-page-header__eyebrow">{eyebrow}</p> : null}
      <h2 className="reg-page-header__title">{title}</h2>
      {description ? <p className="reg-page-header__desc">{description}</p> : null}
    </div>
  );
}

export function RegWizardCard({ children, className = '' }) {
  return <div className={`reg-wizard-card ${className}`.trim()}>{children}</div>;
}

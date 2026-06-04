import { cn } from '@/lib/utils';
import {
  EDUCATION_MONTHS,
  getEducationYearOptions,
} from '@/components/profile/educationDates';

const selectClass =
  'w-full appearance-none rounded-xl border border-border/80 bg-background/80 px-3 py-2.5 text-sm text-foreground transition-all duration-150 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-50';

export default function EducationDateFields({
  value,
  onChange,
  disabled = false,
  errors = {},
}) {
  const years = getEducationYearOptions();
  const endDisabled = disabled || value.is_current_studying;

  const update = (patch) => {
    const next = { ...value, ...patch };
    if (patch.is_current_studying === true) {
      next.end_month = '';
      next.end_year = '';
    }
    onChange?.(next);
  };

  return (
    <div className="experience-date-fields space-y-4">
      <div>
        <p className="experience-date-fields__label mb-2 text-xs font-semibold text-muted-foreground">
          Start date <span className="text-destructive">*</span>
        </p>
        <div className="experience-date-fields__row grid grid-cols-1 gap-2 sm:grid-cols-2">
          <div>
            <label className="sr-only" htmlFor="edu-start-month">Start month</label>
            <select
              id="edu-start-month"
              className={cn(selectClass, errors.start_month && 'border-destructive/60')}
              value={value.start_month}
              disabled={disabled}
              onChange={(e) => update({ start_month: e.target.value })}
            >
              <option value="">Month</option>
              {EDUCATION_MONTHS.map((m) => (
                <option key={m.value} value={String(m.value)}>{m.label}</option>
              ))}
            </select>
            {errors.start_month ? <p className="mt-1 text-xs text-destructive">{errors.start_month}</p> : null}
          </div>
          <div>
            <label className="sr-only" htmlFor="edu-start-year">Start year</label>
            <select
              id="edu-start-year"
              className={cn(selectClass, errors.start_year && 'border-destructive/60')}
              value={value.start_year}
              disabled={disabled}
              onChange={(e) => update({ start_year: e.target.value })}
            >
              <option value="">Year</option>
              {years.map((y) => (
                <option key={y.value} value={y.value}>{y.label}</option>
              ))}
            </select>
            {errors.start_year ? <p className="mt-1 text-xs text-destructive">{errors.start_year}</p> : null}
          </div>
        </div>
      </div>

      <label className="experience-date-fields__current flex cursor-pointer items-start gap-3 rounded-xl border border-border/60 bg-muted/20 px-3.5 py-3">
        <input
          type="checkbox"
          className="mt-0.5 h-4 w-4 shrink-0 rounded border-border text-primary focus:ring-primary/30"
          checked={!!value.is_current_studying}
          disabled={disabled}
          onChange={(e) => update({ is_current_studying: e.target.checked })}
        />
        <span className="text-sm font-medium leading-snug text-foreground">
          I am currently studying here
        </span>
      </label>

      <div className={cn(endDisabled && 'experience-date-fields__end--disabled opacity-60')}>
        <p className="experience-date-fields__label mb-2 text-xs font-semibold text-muted-foreground">
          End date (or expected) {!value.is_current_studying ? <span className="text-destructive">*</span> : null}
        </p>
        <div className="experience-date-fields__row grid grid-cols-1 gap-2 sm:grid-cols-2">
          <div>
            <select
              className={cn(selectClass, errors.end_month && 'border-destructive/60')}
              value={value.end_month}
              disabled={endDisabled}
              onChange={(e) => update({ end_month: e.target.value })}
            >
              <option value="">Month</option>
              {EDUCATION_MONTHS.map((m) => (
                <option key={m.value} value={String(m.value)}>{m.label}</option>
              ))}
            </select>
            {errors.end_month ? <p className="mt-1 text-xs text-destructive">{errors.end_month}</p> : null}
          </div>
          <div>
            <select
              className={cn(selectClass, errors.end_year && 'border-destructive/60')}
              value={value.end_year}
              disabled={endDisabled}
              onChange={(e) => update({ end_year: e.target.value })}
            >
              <option value="">Year</option>
              {years.map((y) => (
                <option key={y.value} value={y.value}>{y.label}</option>
              ))}
            </select>
            {errors.end_year ? <p className="mt-1 text-xs text-destructive">{errors.end_year}</p> : null}
          </div>
        </div>
        {errors.end_date ? <p className="mt-1.5 text-xs text-destructive">{errors.end_date}</p> : null}
        {value.is_current_studying ? (
          <p className="mt-1.5 text-xs text-muted-foreground">Profile will show &ldquo;Present&rdquo; as the end date.</p>
        ) : null}
      </div>
    </div>
  );
}

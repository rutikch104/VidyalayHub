// @ts-nocheck
import {
  Search,
  MapPin,
  Briefcase,
  Layers,
  GraduationCap,
  ArrowUpDown,
  Wifi,
  X,
  SlidersHorizontal,
} from 'lucide-react';
import { JOB_TYPES, JOB_CATEGORIES } from './jobUtils';
import PlatformSelect from '@/components/ui/PlatformSelect';

const LOCATIONS = ['Remote', 'Bangalore', 'Mumbai', 'Delhi', 'Hyderabad', 'Pune', 'Chennai'];

function FilterField({ label, icon: Icon, children, className = '' }) {
  return (
    <div className={`jobs-filter-field ${className}`}>
      <span className="jobs-filter-field__label">
        {Icon ? <Icon className="h-3.5 w-3.5 shrink-0 opacity-70" aria-hidden /> : null}
        {label}
      </span>
      {children}
    </div>
  );
}

export default function JobsFilterBar({
  searchTerm,
  onSearchChange,
  category,
  onCategoryChange,
  jobType,
  onJobTypeChange,
  location,
  onLocationChange,
  experience,
  onExperienceChange,
  sort,
  onSortChange,
  remoteOnly,
  onRemoteOnlyChange,
  popularSkills = [],
  selectedSkill = '',
  onSkillClick,
  onClearAll,
  activeFilterCount = 0,
  resultsCount = 0,
}) {
  return (
    <section className="jobs-filter-panel" aria-label="Job search and filters">
      <div className="jobs-filter-panel__header">
        <div className="flex items-center gap-2 text-sm font-bold text-foreground">
          <SlidersHorizontal className="h-4 w-4 text-sky-600" aria-hidden />
          Find your next role
        </div>
        {typeof resultsCount === 'number' && !Number.isNaN(resultsCount) ? (
          <span className="text-xs font-semibold text-muted-foreground tabular-nums">
            {resultsCount} {resultsCount === 1 ? 'opening' : 'openings'}
          </span>
        ) : null}
      </div>

      <div className="relative mt-4">
        <Search
          className="pointer-events-none absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-sky-600/70"
          aria-hidden
        />
        <input
          type="search"
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search by role, company, or skill…"
          className="jobs-filter-search"
        />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <FilterField label="Category" icon={Layers} className="xl:col-span-1">
          <PlatformSelect
            value={category}
            onChange={(e) => onCategoryChange(e.target.value)}
            className="jobs-filter-select"
          >
            <option value="all">All categories</option>
            {JOB_CATEGORIES.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </PlatformSelect>
        </FilterField>

        <FilterField label="Job type" icon={Briefcase}>
          <PlatformSelect
            value={jobType}
            onChange={(e) => onJobTypeChange(e.target.value)}
            className="jobs-filter-select"
          >
            <option value="all">All types</option>
            {JOB_TYPES.map((t) => (
              <option key={t.id} value={t.id}>
                {t.label}
              </option>
            ))}
          </PlatformSelect>
        </FilterField>

        <FilterField label="Location" icon={MapPin}>
          <PlatformSelect
            value={location}
            onChange={(e) => onLocationChange(e.target.value)}
            className="jobs-filter-select"
          >
            <option value="all">Anywhere</option>
            {LOCATIONS.map((loc) => (
              <option key={loc} value={loc}>
                {loc}
              </option>
            ))}
          </PlatformSelect>
        </FilterField>

        <FilterField label="Experience" icon={GraduationCap}>
          <PlatformSelect
            value={experience}
            onChange={(e) => onExperienceChange(e.target.value)}
            className="jobs-filter-select"
          >
            <option value="all">Any level</option>
            <option value="entry">Entry</option>
            <option value="mid">Mid</option>
            <option value="senior">Senior</option>
          </PlatformSelect>
        </FilterField>

        <FilterField label="Sort by" icon={ArrowUpDown}>
          <PlatformSelect value={sort} onChange={(e) => onSortChange(e.target.value)} className="jobs-filter-select">
            <option value="latest">Latest</option>
            <option value="deadline">Deadline</option>
            <option value="salary_high">Salary (high)</option>
          </PlatformSelect>
        </FilterField>

        <FilterField label="Work mode" icon={Wifi} className="flex flex-col justify-end">
          <button
            type="button"
            onClick={() => onRemoteOnlyChange(!remoteOnly)}
            className={`jobs-filter-remote ${remoteOnly ? 'jobs-filter-remote--active' : ''}`}
            aria-pressed={remoteOnly}
          >
            <Wifi className="h-4 w-4 shrink-0" />
            Remote only
          </button>
        </FilterField>
      </div>

      {activeFilterCount > 0 && (
        <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-border/50 pt-4">
          <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
            Active filters
          </span>
          {searchTerm?.trim() ? (
            <ActiveChip label={`“${searchTerm.trim()}”`} onRemove={() => onSearchChange('')} />
          ) : null}
          {category !== 'all' && (
            <ActiveChip label={JOB_CATEGORIES.find((c) => c.id === category)?.label || category} onRemove={() => onCategoryChange('all')} />
          )}
          {jobType !== 'all' && (
            <ActiveChip label={JOB_TYPES.find((t) => t.id === jobType)?.label || jobType} onRemove={() => onJobTypeChange('all')} />
          )}
          {location !== 'all' && (
            <ActiveChip label={location} onRemove={() => onLocationChange('all')} />
          )}
          {experience !== 'all' && (
            <ActiveChip label={experience} onRemove={() => onExperienceChange('all')} />
          )}
          {remoteOnly && (
            <ActiveChip label="Remote" onRemove={() => onRemoteOnlyChange(false)} />
          )}
          {selectedSkill ? (
            <ActiveChip label={selectedSkill} onRemove={() => onSkillClick(selectedSkill)} />
          ) : null}
          {sort !== 'latest' && (
            <ActiveChip
              label={sort === 'deadline' ? 'By deadline' : 'Salary ↑'}
              onRemove={() => onSortChange('latest')}
            />
          )}
          <button type="button" onClick={onClearAll} className="ml-auto text-xs font-bold text-sky-700 hover:underline">
            Clear all
          </button>
        </div>
      )}

      {popularSkills.length > 0 && (
        <div className="mt-4 border-t border-border/40 pt-4">
          <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
            Trending skills
          </p>
          <div className="flex flex-wrap gap-2">
            {popularSkills.slice(0, 10).map((skill) => (
              <button
                key={skill}
                type="button"
                onClick={() => onSkillClick(skill)}
                className={`jobs-skill-chip${selectedSkill === skill ? ' jobs-skill-chip--active' : ''}`}
                aria-pressed={selectedSkill === skill}
              >
                {skill}
              </button>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

function ActiveChip({ label, onRemove }) {
  return (
    <span className="jobs-active-chip">
      {label}
      <button type="button" onClick={onRemove} className="jobs-active-chip__remove" aria-label={`Remove ${label} filter`}>
        <X className="h-3 w-3" />
      </button>
    </span>
  );
}

// @ts-nocheck
import { useState } from 'react';
import { X } from 'lucide-react';
import SkillAutocomplete from '@/components/profile/SkillAutocomplete';
import { JOB_SKILLS_MAX, JOB_SKILLS_RECOMMENDED } from './jobUtils';

function normalizeSkillName(name) {
  return String(name || '')
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase();
}

export default function JobSkillsPicker({ skills = [], onChange, disabled = false }) {
  const [query, setQuery] = useState('');
  const atLimit = skills.length >= JOB_SKILLS_MAX;
  const existingSkillNames = skills.map((s) => s.skill_name);

  const addSkill = (payload) => {
    const name = String(payload?.skill_name || '').trim();
    if (!name || atLimit) return;
    const norm = normalizeSkillName(name);
    if (skills.some((s) => normalizeSkillName(s.skill_name) === norm)) return;
    onChange([
      ...skills,
      {
        skill_id: payload.skill_id || null,
        skill_name: name,
      },
    ]);
    setQuery('');
  };

  const removeSkill = (name) => {
    const norm = normalizeSkillName(name);
    onChange(skills.filter((s) => normalizeSkillName(s.skill_name) !== norm));
  };

  return (
    <div className="job-skills-picker">
      <div className="job-skills-picker__header">
        <p className="job-skills-picker__hint">
          Add technologies and skills required for this role. Recommended {JOB_SKILLS_RECOMMENDED} skills.
        </p>
        <span className={`job-skills-picker__count${atLimit ? ' job-skills-picker__count--limit' : ''}`}>
          {skills.length}/{JOB_SKILLS_MAX}
        </span>
      </div>

      {skills.length > 0 ? (
        <div className="job-skills-picker__chips">
          {skills.map((skill) => (
            <span key={skill.skill_name} className="jobs-card__skill jobs-card__skill--editable">
              {skill.skill_name}
              <button
                type="button"
                className="job-skills-picker__remove"
                onClick={() => removeSkill(skill.skill_name)}
                disabled={disabled}
                aria-label={`Remove ${skill.skill_name}`}
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      ) : (
        <p className="job-skills-picker__empty">No skills added yet. Search below to add required skills.</p>
      )}

      {atLimit ? (
        <p className="job-skills-picker__limit-msg">
          Maximum {JOB_SKILLS_MAX} skills reached. Remove a skill to add another.
        </p>
      ) : (
        <SkillAutocomplete
          value={query}
          onChange={setQuery}
          onSelect={addSkill}
          disabled={disabled}
          existingSkillNames={existingSkillNames}
          maxSkills={JOB_SKILLS_MAX}
          scope="job"
          placeholder="Search skills e.g. ReactJS, NodeJS, Python…"
          hintText={`Up to ${JOB_SKILLS_MAX} skills · search catalog or create a new skill`}
          inputClassName="w-full rounded-xl border border-border/60 bg-card px-3.5 py-2.5 text-sm"
        />
      )}
    </div>
  );
}

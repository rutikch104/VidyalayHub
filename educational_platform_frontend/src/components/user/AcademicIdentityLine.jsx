import {
  resolveAcademicIdentity,
  resolveAcademicIdentityFromProfile,
  resolveProfessionalIdentity,
  resolveProfessionalIdentityFromProfile,
} from '@/lib/academicIdentity';

function resolveVariantClass(className, variantPrefix) {
  if (!className) return '';
  const match = className
    .split(/\s+/)
    .find((token) => token.startsWith(`${variantPrefix}--`));
  return match ? match.replace(`${variantPrefix}--`, 'professional-identity-line--') : '';
}

export default function AcademicIdentityLine({
  user,
  profile,
  className = '',
  professionalClassName = '',
  showAcademic = true,
  showProfessional = true,
  as: Wrapper = 'div',
}) {
  const academic =
    resolveAcademicIdentity(user) ||
    resolveAcademicIdentityFromProfile(profile);
  const professional =
    resolveProfessionalIdentity(user) ||
    resolveProfessionalIdentityFromProfile(profile);

  const showAcademicLine = showAcademic && academic;
  const showProfessionalLine = showProfessional && professional;

  if (!showAcademicLine && !showProfessionalLine) return null;

  const profVariant = resolveVariantClass(className, 'academic-identity-line');
  const professionalClasses = [
    'professional-identity-line',
    profVariant,
    professionalClassName,
  ]
    .filter(Boolean)
    .join(' ');

  const academicClasses = ['academic-identity-line', className].filter(Boolean).join(' ');

  return (
    <Wrapper className="user-identity-block">
      {showAcademicLine ? <p className={academicClasses}>{academic}</p> : null}
      {showProfessionalLine ? <p className={professionalClasses}>{professional}</p> : null}
    </Wrapper>
  );
}

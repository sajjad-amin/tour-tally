/**
 * StatCard — reusable metric card matching reference dashboard pattern.
 *
 * @param {{ label: string, value: any, variant?: string, badge?: string, badgeVariant?: string, subtext?: string, icon?: string }} props
 */
export default function StatCard({
  label,
  value,
  variant = 'secondary',
  badge,
  badgeVariant = 'primary',
  subtext,
  icon,
}) {
  const borderClass =
    variant !== 'secondary' ? `border-${variant}-subtle` : 'border-secondary-subtle';
  const iconColor = variant !== 'secondary' ? `text-${variant}` : 'text-body-secondary';
  const valueColor =
    variant !== 'secondary' ? `text-${variant}-emphasis` : 'text-body';

  return (
    <div
      className={`card bg-body-tertiary border ${borderClass} p-3 rounded-3 h-100 d-flex flex-column justify-content-center text-center position-relative shadow-sm`}
    >
      {badge && (
        <span
          className={`position-absolute top-0 end-0 m-2 badge rounded-pill bg-${badgeVariant}`}
        >
          {badge}
        </span>
      )}
      <div className="text-body-secondary small text-uppercase fw-bold mb-1 d-flex align-items-center justify-content-center gap-1">
        {icon && <i className={`bi ${icon} ${iconColor}`}></i>}
        <span>{label}</span>
      </div>
      <div className={`h3 fw-bold mb-0 font-monospace ${valueColor}`}>
        {value ?? '—'}
      </div>
      {subtext && <small className="text-body-secondary mt-1">{subtext}</small>}
    </div>
  );
}

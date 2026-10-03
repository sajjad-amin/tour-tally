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
  const bgClass =
    variant !== 'secondary'
      ? `bg-${variant}-subtle text-${variant}-emphasis`
      : 'bg-body-tertiary';
  const labelClass = variant !== 'secondary' ? `text-${variant}` : 'text-secondary';

  return (
    <div
      className={`p-3 border rounded-3 ${bgClass} h-100 d-flex flex-column justify-content-center text-center position-relative shadow-sm`}
    >
      {badge && (
        <span className={`position-absolute top-0 end-0 m-2 badge rounded-pill bg-${badgeVariant}`}>
          {badge}
        </span>
      )}
      <div className={`${labelClass} small text-uppercase fw-bold mb-1`}>
        {icon && <i className={`bi ${icon} me-1`}></i>}
        {label}
      </div>
      <div className="h3 fw-bold mb-0">{value ?? '—'}</div>
      {subtext && <small className="text-muted mt-1">{subtext}</small>}
    </div>
  );
}

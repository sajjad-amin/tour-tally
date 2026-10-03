/**
 * PageHeader — section header shown at the top of each page.
 *
 * @param {{ title: string, subtitle?: string, children?: ReactNode }} props
 */
export default function PageHeader({ title, subtitle, children }) {
  return (
    <div className="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-4">
      <div>
        <h2 className="h4 fw-bold mb-0">{title}</h2>
        {subtitle && <p className="text-muted mb-0 small mt-1">{subtitle}</p>}
      </div>
      {children && <div className="d-flex align-items-center gap-2">{children}</div>}
    </div>
  );
}

import { useTheme } from '@/hooks/useTheme.js';

/**
 * ThemeToggle — Bootstrap form-switch matching reference project design.
 * Checked = dark mode, unchecked = light mode.
 */
export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="form-check form-switch mb-0 d-flex align-items-center gap-2">
      <input
        className="form-check-input"
        type="checkbox"
        role="switch"
        id="theme-toggle"
        style={{ cursor: 'pointer' }}
        checked={theme === 'dark'}
        onChange={toggleTheme}
        aria-label="Toggle dark/light theme"
      />
      <label className="form-check-label mb-0" htmlFor="theme-toggle" style={{ cursor: 'pointer' }}>
        <i className={`bi ${theme === 'dark' ? 'bi-moon-stars-fill text-info' : 'bi-sun-fill text-warning'}`}></i>
      </label>
    </div>
  );
}

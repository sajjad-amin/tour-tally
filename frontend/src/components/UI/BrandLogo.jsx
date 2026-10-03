import { useTheme } from '@/hooks/useTheme.js';

/**
 * BrandLogo — Theme-aware TourTally brand icon.
 *
 * Automatically selects the appropriate SVG asset to complement the current theme.
 *
 * @param {Object} props
 * @param {number} [props.size=32] - Width and height in pixels.
 * @param {string} [props.className=''] - Additional CSS classes.
 * @param {'dark'|'light'|null} [props.themeOverride=null] - Force a specific theme.
 * @param {'icon'|'favicon'} [props.variant='icon'] - 'icon' or 'favicon'.
 * @param {Object} [props.style={}] - Additional inline styles.
 */
export default function BrandLogo({
  size = 32,
  className = '',
  themeOverride = null,
  variant = 'icon',
  style = {},
  ...rest
}) {
  const { theme } = useTheme();
  const currentTheme = themeOverride || theme || 'dark';

  const src =
    variant === 'favicon'
      ? currentTheme === 'dark'
        ? '/icons/dark/svg/favicon-dark.svg'
        : '/icons/light/svg/favicon-light.svg'
      : currentTheme === 'dark'
      ? '/icons/dark/svg/tourtally-icon-dark.svg'
      : '/icons/light/svg/tourtally-icon-light.svg';

  return (
    <img
      src={src}
      alt="TourTally"
      width={size}
      height={size}
      className={`rounded-2 ${className}`.trim()}
      style={{
        width: `${size}px`,
        height: `${size}px`,
        objectFit: 'contain',
        display: 'inline-block',
        verticalAlign: 'middle',
        ...style,
      }}
      {...rest}
    />
  );
}

// src/components/ui/Button.jsx
import { Loader2 } from 'lucide-react';

const variants = {
  primary:   'bg-purple-600 hover:bg-purple-700 text-white border-transparent shadow-lg shadow-purple-500/20',
  secondary: 'bg-transparent border border-purple-500/40 text-purple-300 hover:bg-purple-500/10',
  danger:    'bg-transparent border border-red-500/40 text-red-400 hover:bg-red-500/10',
  success:   'bg-transparent border border-green-500/40 text-green-400 hover:bg-green-500/10',
  warning:   'bg-transparent border border-yellow-400 text-yellow-400 hover:bg-yellow-400 hover:text-gray-900',
  ghost:     'bg-transparent border-transparent text-gray-400 hover:text-white hover:bg-white/5',
  info:      'bg-blue-600 hover:bg-blue-700 text-white border-transparent',
  // Filled/solid counterparts to the outline success/danger variants above.
  // Used for large CTA-style buttons (Accept/Reject/Approve actions) that
  // are filled rather than outlined — this exact treatment was previously
  // duplicated across TaskDetail.jsx and GroupApprovals.jsx.
  successSolid: 'bg-green-600 hover:bg-green-700 text-white border-transparent',
  dangerSolid:  'bg-red-600 hover:bg-red-700 text-white border-transparent',
  // Solid yellow "caution" action (e.g. resetting a password) — distinct
  // from `warning`'s outline-then-fill hover treatment above; this one is
  // filled at rest, with dark text for contrast against the bright yellow.
  warningSolid: 'bg-yellow-500 hover:bg-yellow-600 text-black border-transparent',
  // 'bare' -> completely unstyled (no bg/border/text color at all). Pair with
  // size="none" and className for color, so bare icon-only buttons (password
  // toggles, modal close buttons, etc.) can use Button instead of a raw
  // <button>, without inheriting any of the "boxed" variants' background/border.
  bare:      '',
  // Translucent "tinted" accept/decline treatment (background already
  // tinted at rest, darkens further on hover) — distinct from the
  // outline success/danger variants above, which are transparent at rest.
  successTint: 'bg-green-500/10 border border-green-500/40 text-green-400 hover:bg-green-500/20',
  dangerTint:  'bg-red-500/10 border border-red-500/40 text-red-400 hover:bg-red-500/20',
  primaryTint: 'bg-purple-500/10 border border-purple-500/40 text-purple-300 hover:bg-purple-500/20',
  // Primary CTA with a hover-lift + soft tinted shadow, for standalone
  // "create new" actions (e.g. "+ New Group").
  primaryLift: 'bg-purple-600 hover:bg-purple-700 hover:-translate-y-0.5 text-white border-transparent shadow-sm shadow-purple-200',
  // Pill-shaped notification/count badge that's still clickable.
  warningPill: 'bg-yellow-500/10 border border-yellow-500/30 hover:bg-yellow-500/20',
  // Plain colored text, no background or border at all — for inline
  // "back" / "cancel" actions that aren't real navigation links.
  linkPurple:  'bg-transparent border-transparent text-purple-400 hover:text-purple-300',
  // Orange "paused/caution" family — mirrors the purple secondary/tint/
  // solid pattern above, but for the project-pause workflow specifically
  // (Resume, Pause, and the pause-confirmation modal each use a different
  // one of these three treatments).
  orangeTint:    'bg-orange-500/20 border border-orange-500/40 text-orange-300 hover:bg-orange-500/30',
  orangeOutline: 'bg-transparent border border-orange-500/40 text-orange-400 hover:bg-orange-500/10',
  orangeSolid:   'bg-orange-500/90 hover:bg-orange-500 text-white border-transparent',
  // Two-tone gradient CTA, for standalone "create new" actions that want
  // more visual weight than the flat `primary` (e.g. "+ New Task").
  primaryGradient: 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white border-transparent shadow-lg shadow-purple-500/20',
};

const sizes = {
  sm:    'px-3 py-1.5 text-xs',
  md:    'px-4 py-2 text-sm',
  lg:    'px-6 py-2.5 text-sm',
  nav:   'px-5 py-1.5 text-sm',
  block: 'px-4 py-3 text-base',
  // No padding at all — for bare icon-only buttons.
  none:  '',
};

const roundedStyles = {
  xl:   'rounded-xl',
  lg:   'rounded-lg',
  full: 'rounded-full',
  // No rounding — irrelevant once there's no visible box (variant="bare"),
  // but included so `rounded="none"` doesn't render "undefined" as a class.
  none: '',
};

const Button = ({
  children,
  variant = 'primary',
  size = 'md',
  rounded = 'xl',
  loading = false,
  disabled = false,
  icon: Icon,
  iconSize = 14,
  weight = 'font-bold',
  className = '',
  ...props
}) => {
  return (
    <button
      disabled={disabled || loading}
      className={`
        inline-flex items-center justify-center gap-2 ${weight}
        transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed
        ${roundedStyles[rounded]} ${variants[variant]} ${sizes[size]} ${className}
      `}
      {...props}
    >
      {loading ? (
        <Loader2 size={iconSize} className="animate-spin" />
      ) : Icon ? (
        <Icon size={iconSize} />
      ) : null}
      {children}
    </button>
  );
};

export default Button;
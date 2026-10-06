const base = { fill: 'none', stroke: 'currentColor', strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true };

export const BagIcon = ({ size = 18, w = 1.6 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" {...base} strokeWidth={w}><path d="M6 7h12l-1 13H7z" /><path d="M9 7a3 3 0 0 1 6 0" /></svg>
);
export const CloseIcon = ({ size = 20, w = 1.8 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" {...base} strokeWidth={w}><path d="M6 6l12 12M18 6 6 18" /></svg>
);
export const CheckIcon = ({ size = 20, w = 2.2 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" {...base} strokeWidth={w}><path d="M20 6 9 17l-5-5" /></svg>
);
export const AlertIcon = ({ size = 18, w = 2 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" {...base} strokeWidth={w}><circle cx="12" cy="12" r="9" /><path d="M12 8v5M12 16v.01" /></svg>
);
export const BackIcon = ({ size = 20, w = 1.8 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" {...base} strokeWidth={w}><path d="M15 18l-6-6 6-6" /></svg>
);
export const SearchIcon = ({ size = 18, w = 1.8 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" {...base} strokeWidth={w}><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
);
export const RefreshIcon = ({ size = 16, w = 1.8 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" {...base} strokeWidth={w}><path d="M20 11a8 8 0 1 0-2.3 5.7M20 4v7h-7" /></svg>
);
export const TrashIcon = ({ size = 16, w = 1.8 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" {...base} strokeWidth={w}><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" /></svg>
);

import React from 'react';

/**
 * Standardized Component Layout for cards, banners, panels, and content containers.
 * Solves inaccurate margins and paddings on mobile devices by enforcing
 * responsive mobile padding (p-4 / 16px on mobile, p-6 on tablet/desktop) and consistent border radii.
 */
export function ComponentLayout({
  as: Component = 'div',
  variant = 'card',
  padding = 'normal',
  className = '',
  children,
  ...props
}) {
  const paddingMap = {
    none: 'p-0',
    compact: 'p-3 sm:p-4',
    normal: 'p-4 sm:p-6',
    relaxed: 'p-5 sm:p-7 md:p-8',
  };

  const variantMap = {
    card: 'bg-[#FDFBF7] dark:bg-[#1E1A17] border border-[#E8DEC8] dark:border-[#3A322B] rounded-2xl sm:rounded-3xl shadow-sm transition-colors',
    subtle: 'bg-[#F4EBDD]/60 dark:bg-[#141210]/60 border border-[#E8DEC8]/80 dark:border-[#3A322B] rounded-2xl transition-colors',
    banner: 'bg-[#FDFBF7] dark:bg-[#1E1A17] rounded-2xl sm:rounded-3xl border border-[#E8DEC8] dark:border-[#3A322B] shadow-sm transition-colors',
    dark: 'bg-[#1E1A17] text-white rounded-2xl sm:rounded-3xl border border-[#3A322B] shadow-xl',
    plain: '',
  };

  const resolvedPadding = paddingMap[padding] || padding;
  const resolvedVariant = variantMap[variant] ?? variantMap.card;

  return (
    <Component
      className={`${resolvedVariant} ${resolvedPadding} ${className}`.trim()}
      {...props}
    >
      {children}
    </Component>
  );
}

export { ComponentLayout as CardLayout };
export default ComponentLayout;

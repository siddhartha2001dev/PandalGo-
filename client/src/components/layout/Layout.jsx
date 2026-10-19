import React from 'react';

/**
 * Standardized Page Layout applied across all PandalGo pages.
 * Ensures consistent mobile margins (px-4 / 16px standard), responsive desktop gutters (sm:px-6 lg:px-8),
 * balanced vertical spacing, and safe clearance (pb-28 md:pb-10) above the mobile bottom navigation bar.
 */
export function Layout({
  children,
  maxWidth = '7xl',
  centered = false,
  className = '',
  containerClassName = '',
}) {
  const maxWidthMap = {
    '7xl': 'max-w-7xl',
    '6xl': 'max-w-6xl',
    '5xl': 'max-w-5xl',
    '4xl': 'max-w-4xl',
    '3xl': 'max-w-3xl',
    '2xl': 'max-w-2xl',
    xl: 'max-w-xl',
    lg: 'max-w-lg',
    md: 'max-w-md',
    full: 'max-w-full',
  };

  const resolvedMaxWidth = maxWidthMap[maxWidth] || maxWidth;

  if (centered) {
    return (
      <div
        className={`min-h-[75vh] flex items-center justify-center px-4 sm:px-6 py-8 sm:py-12 pb-28 md:pb-12 ${containerClassName}`}
      >
        <div className={`w-full ${resolvedMaxWidth} ${className}`}>
          {children}
        </div>
      </div>
    );
  }

  return (
    <div
      className={`w-full ${resolvedMaxWidth} mx-auto px-4 sm:px-6 lg:px-8 py-5 sm:py-7 pb-28 md:pb-10 ${className}`}
    >
      {children}
    </div>
  );
}

export { Layout as PageLayout };
export default Layout;

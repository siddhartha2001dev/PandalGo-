import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

/**
 * Standardized, accessible, unified modal dialog adhering to PandalGo design system.
 * Uses React Portal to mount to document.body, ensuring it always layers above page headers,
 * bottom navigation, and floating widgets without stacking context collision.
 * Pinned header, independently scrollable content body (min-h-0), and pinned footer.
 */
export function Modal({
  isOpen,
  onClose,
  title,
  description,
  header,
  children,
  footer,
  maxWidth,
  size = 'md',
  variant = 'default', // 'default' | 'image'
  hideHeader = false,
  hideCloseButton = false,
  ariaLabel,
  className = '',
  bodyClassName = '',
  headerClassName = '',
}) {
  const contentRef = useRef(null);

  // Size token mappings
  const sizeClasses = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
    full: 'max-w-5xl',
  };

  const resolvedMaxWidth = maxWidth || sizeClasses[size] || 'max-w-lg';

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    // Lock background scroll strictly without layout shift
    const originalOverflow = document.body.style.overflow;
    const originalPaddingRight = document.body.style.paddingRight;

    // Compensate for scrollbar width to prevent desktop shift
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    }
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      document.body.style.paddingRight = originalPaddingRight;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Image lightbox preview variant
  if (variant === 'image') {
    const lightboxNode = (
      <div
        className="fixed inset-0 z-[200] flex items-center justify-center p-3.5 sm:p-6 bg-black/90 backdrop-blur-md animate-in fade-in duration-200"
        onClick={onClose}
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel || 'Image preview'}
        style={{
          paddingTop: 'max(1rem, env(safe-area-inset-top, 16px))',
          paddingBottom: 'max(1rem, env(safe-area-inset-bottom, 16px))',
          paddingLeft: 'max(1rem, env(safe-area-inset-left, 16px))',
          paddingRight: 'max(1rem, env(safe-area-inset-right, 16px))',
        }}
      >
        <div
          className={`relative max-w-4xl max-h-[90dvh] flex items-center justify-center ${className}`}
          onClick={(e) => e.stopPropagation()}
        >
          {children}
          <button
            type="button"
            onClick={onClose}
            aria-label="Close image preview"
            className="absolute -top-3 -right-3 sm:top-3 sm:right-3 p-2 bg-stone-900/95 text-stone-200 hover:text-white rounded-full shadow-xl border border-white/15 hover:bg-stone-800 transition-colors focus:outline-none focus:ring-2 focus:ring-white/40 z-10"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>
    );

    return typeof document !== 'undefined'
      ? createPortal(lightboxNode, document.body)
      : lightboxNode;
  }

  // Standard modal variant
  const showHeader = !hideHeader && (title || description);

  const standardModalNode = (
    <div
      className="fixed inset-0 z-[200] flex flex-col items-center justify-center p-2.5 sm:p-4 md:p-6 bg-stone-950/75 backdrop-blur-sm animate-in fade-in duration-200 overflow-hidden"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? 'modal-title' : undefined}
      aria-label={!title ? ariaLabel || 'Dialog' : undefined}
      aria-describedby={description ? 'modal-description' : undefined}
      style={{
        paddingTop: 'max(0.75rem, env(safe-area-inset-top, 12px))',
        paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom, 12px))',
        paddingLeft: 'max(0.75rem, env(safe-area-inset-left, 12px))',
        paddingRight: 'max(0.75rem, env(safe-area-inset-right, 12px))',
      }}
    >
      <div
        className={`bg-[#FDFBF7] dark:bg-[#1E1A17] rounded-2xl sm:rounded-3xl shadow-2xl border border-[#E8DEC8] dark:border-[#3A322B] w-full ${resolvedMaxWidth} max-h-[calc(100dvh-1.5rem)] sm:max-h-[calc(100dvh-3rem)] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200 ${className}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Pinned Header */}
        {header ? (
          header
        ) : showHeader ? (
          <div
            className={`flex items-start justify-between px-3.5 py-3 sm:px-6 sm:py-4 border-b border-[#E8DEC8]/80 dark:border-[#3A322B] bg-[#F4EBDD]/70 dark:bg-[#141210]/70 shrink-0 ${headerClassName}`}
          >
            <div className="pr-3 min-w-0 flex-1">
              {title && (
                <h2
                  id="modal-title"
                  className="text-base sm:text-lg font-serif font-bold text-stone-900 dark:text-stone-100 tracking-tight leading-snug break-words"
                >
                  {title}
                </h2>
              )}
              {description && (
                <p
                  id="modal-description"
                  className="text-xs text-stone-600 dark:text-stone-400 mt-0.5 leading-normal break-words"
                >
                  {description}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 -mr-1 text-stone-500 hover:text-stone-800 dark:hover:text-stone-200 hover:bg-[#EAE0D0] dark:hover:bg-[#2A2420] rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-[#C74732] shrink-0 min-w-[32px] min-h-[32px] sm:min-w-[36px] sm:min-h-[36px] flex items-center justify-center"
              aria-label="Close dialog"
            >
              <X className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          </div>
        ) : !hideCloseButton ? (
          /* Subtle close button if header is omitted */
          <div className="absolute top-3 right-3 z-10">
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-stone-500 hover:text-stone-800 dark:hover:text-stone-200 hover:bg-[#EAE0D0] dark:hover:bg-[#2A2420] rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-[#C74732]"
              aria-label="Close dialog"
            >
              <X className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          </div>
        ) : null}

        {/* Modal Scrollable Body (Independent scrolling with min-h-0) */}
        <div
          ref={contentRef}
          className={`flex-1 min-h-0 overflow-y-auto overscroll-contain p-3.5 sm:p-5 md:p-6 text-stone-800 dark:text-stone-200 text-sm space-y-4 [webkit-overflow-scrolling:touch] ${bodyClassName}`}
        >
          {children}
        </div>

        {/* Modal Pinned Footer */}
        {footer && (
          <div className="px-3.5 py-2.5 sm:px-6 sm:py-3.5 border-t border-[#E8DEC8]/80 dark:border-[#3A322B] bg-[#F4EBDD]/50 dark:bg-[#141210]/50 flex items-center justify-end gap-2.5 shrink-0">
            {footer}
          </div>
        )}
      </div>
    </div>
  );

  return typeof document !== 'undefined'
    ? createPortal(standardModalNode, document.body)
    : standardModalNode;
}

export default Modal;

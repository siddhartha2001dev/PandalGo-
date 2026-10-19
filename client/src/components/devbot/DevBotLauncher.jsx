import React from 'react';
import { X } from 'lucide-react';
import { IndianBotIcon } from './IndianBotIcon.jsx';

/**
 * DevBotLauncher
 * Floating circular trigger button for Dev Bot assistant.
 * - Circular shape for both mobile and PC
 * - Small on mobile (44px) so it doesn't obstruct map/content
 * - Same signature terracotta gradient colour
 * - Indian bot symbol with auspicious tilak and mukut finial
 */
export function DevBotLauncher({ isOpen, onToggle, unread = false }) {
  return (
    <div className="mobile-floating-devbot">
      <button
        type="button"
        onClick={onToggle}
        aria-label={isOpen ? 'Close Dev Bot' : 'Open Dev Bot'}
        aria-expanded={isOpen}
        className={`relative flex items-center justify-center rounded-full aspect-square transition-all duration-300 transform active:scale-95 shadow-lg ${
          'w-11 h-11 sm:w-14 sm:h-14'
        } ${
          isOpen
            ? 'bg-stone-800 dark:bg-stone-700 text-white hover:bg-stone-900 shadow-stone-800/30'
            : 'bg-gradient-to-r from-[#C74732] to-[#B33925] hover:from-[#B33925] hover:to-[#962A19] text-white shadow-[#C74732]/35 hover:shadow-xl hover:shadow-[#C74732]/45 hover:scale-105'
        }`}
      >
        {/* Indian Bot Icon or Close icon */}
        {isOpen ? (
          <X className="w-5 h-5 sm:w-6 sm:h-6 text-white transition-transform duration-200" />
        ) : (
          <IndianBotIcon className="w-6 h-6 sm:w-7 sm:h-7 drop-shadow-sm transition-transform duration-200" />
        )}

        {/* Unread gold notification indicator */}
        {unread && !isOpen && (
          <span className="w-2.5 h-2.5 rounded-full bg-[#D4AF37] border-2 border-white dark:border-stone-900 absolute top-0.5 right-0.5 shadow-sm" />
        )}
      </button>
    </div>
  );
}

export default DevBotLauncher;

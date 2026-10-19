import React from 'react';

/**
 * Accessible, production-standard ToggleSwitch component.
 * Follows WAI-ARIA switch pattern with no decorative text/emoji inside the track.
 */
export function ToggleSwitch({
  id,
  label,
  description,
  checked,
  onChange,
  disabled = false,
  statusLabel = true,
  statusActiveText = 'Active',
  statusInactiveText = 'Disabled',
  size = 'md',
  className = '',
}) {
  const switchId = id || `toggle-switch-${Math.random().toString(36).substring(2, 9)}`;

  const handleToggle = () => {
    if (!disabled && onChange) {
      onChange(!checked);
    }
  };

  const handleKeyDown = (e) => {
    if (disabled) return;
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      handleToggle();
    }
  };

  const trackSizes = {
    sm: 'w-9 h-5',
    md: 'w-11 h-6',
  };

  const thumbSizes = {
    sm: 'w-3.5 h-3.5',
    md: 'w-4.5 h-4.5',
  };

  const thumbTranslate = {
    sm: checked ? 'translate-x-4' : 'translate-x-0.5',
    md: checked ? 'translate-x-5' : 'translate-x-0.5',
  };

  return (
    <div
      className={`flex items-start justify-between gap-3 ${disabled ? 'opacity-60 cursor-not-allowed' : ''} ${className}`}
    >
      <div className="flex-1 min-w-0 pr-1">
        <label
          htmlFor={switchId}
          className={`block text-xs font-semibold text-stone-900 dark:text-stone-100 ${
            disabled ? 'cursor-not-allowed' : 'cursor-pointer'
          }`}
        >
          {label}
        </label>
        {description && (
          <p className="text-[11px] text-stone-500 dark:text-stone-400 mt-0.5 leading-relaxed">
            {description}
          </p>
        )}
      </div>

      <div className="flex items-center gap-2 shrink-0 pt-0.5">
        {statusLabel && (
          <span
            className={`text-[10px] font-medium tracking-wide uppercase ${
              checked
                ? 'text-festival-700 dark:text-festival-400'
                : 'text-stone-400 dark:text-stone-500'
            }`}
          >
            {checked ? statusActiveText : statusInactiveText}
          </span>
        )}

        <button
          type="button"
          role="switch"
          id={switchId}
          aria-checked={checked}
          aria-label={label}
          disabled={disabled}
          onClick={handleToggle}
          onKeyDown={handleKeyDown}
          className={`relative inline-flex items-center rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-festival-600 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-stone-900 ${
            trackSizes[size]
          } ${
            checked
              ? 'bg-festival-700 dark:bg-festival-600'
              : 'bg-stone-200 dark:bg-stone-700'
          } ${disabled ? 'cursor-not-allowed' : 'cursor-pointer'}`}
        >
          <span
            className={`inline-block rounded-full bg-white shadow-sm ring-0 transition-transform duration-200 ease-in-out ${
              thumbSizes[size]
            } ${thumbTranslate[size]}`}
          />
        </button>
      </div>
    </div>
  );
}

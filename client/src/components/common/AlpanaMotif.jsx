import React from 'react';

/**
 * Authentic Bengali Alpana (আল্পনা) Decorative SVG Motifs.
 * Handcrafted vector artwork inspired by Bengal folk heritage, temple terracotta, and shola craft.
 * Lightweight, accessible, scalable, and non-intrusive (pointer-events-none).
 */

/**
 * AlpanaCorner: Ornamental corner motif with traditional Bengali kalka (paisley) and lotus curls.
 */
export function AlpanaCorner({ className = 'text-bengal-gold/30', size = 56 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`pointer-events-none select-none transition-colors ${className}`}
      aria-hidden="true"
    >
      {/* Outer corner frame lines */}
      <path
        d="M2 32V6C2 3.79086 3.79086 2 6 2H32"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <circle cx="6" cy="6" r="2" fill="currentColor" />

      {/* Primary Kalka (Paisley) petal curve */}
      <path
        d="M10 24C10 16.268 16.268 10 24 10C27.5 10 32 12.5 32 17C32 22 24 24 20 28C16 32 14 38 14 42"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
      />

      {/* Inner floral spiral flourish */}
      <path
        d="M18 18C18 14 21 13 23 13C26 13 27 15 26 17C25 19 21 19 20 21"
        stroke="currentColor"
        strokeWidth="1"
        strokeLinecap="round"
      />

      {/* Decorative accent dots (chandan phoota) */}
      <circle cx="28" cy="8" r="1.2" fill="currentColor" />
      <circle cx="8" cy="28" r="1.2" fill="currentColor" />
      <circle cx="36" cy="14" r="1" fill="currentColor" />
      <circle cx="14" cy="36" r="1" fill="currentColor" />
      <circle cx="20" cy="20" r="1.5" fill="currentColor" />

      {/* Tapered leaf flourish */}
      <path
        d="M4 14C8 14 12 11 14 8"
        stroke="currentColor"
        strokeWidth="1"
        strokeLinecap="round"
      />
      <path
        d="M14 4C14 8 11 12 8 14"
        stroke="currentColor"
        strokeWidth="1"
        strokeLinecap="round"
      />
    </svg>
  );
}

/**
 * AlpanaDivider: Centered horizontal divider with lotus medallion and symmetrical floral tendrils.
 */
export function AlpanaDivider({ className = 'text-bengal-gold/40', width = 240, height = 24 }) {
  return (
    <div className="flex items-center justify-center my-3 pointer-events-none select-none">
      <svg
        width={width}
        height={height}
        viewBox="0 0 240 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={`max-w-full transition-colors ${className}`}
        aria-hidden="true"
      >
        {/* Left flourish line */}
        <path
          d="M10 12H70C80 12 86 7 92 7C98 7 101 12 108 12"
          stroke="currentColor"
          strokeWidth="1.2"
          strokeLinecap="round"
        />
        <circle cx="6" cy="12" r="1.5" fill="currentColor" />
        <circle cx="60" cy="12" r="1" fill="currentColor" />
        <path d="M82 12C85 10 88 10 90 12" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />

        {/* Center Lotus Medallion (Padma) */}
        <circle cx="120" cy="12" r="3.5" fill="none" stroke="currentColor" strokeWidth="1.2" />
        <circle cx="120" cy="12" r="1.5" fill="currentColor" />
        {/* Top/Bottom lotus petals */}
        <path
          d="M120 4C122 7 122 8 120 8.5C118 8 118 7 120 4Z"
          fill="currentColor"
        />
        <path
          d="M120 20C122 17 122 16 120 15.5C118 16 118 17 120 20Z"
          fill="currentColor"
        />
        {/* Left/Right lotus petals */}
        <path
          d="M112 12C115 10 116 10 116.5 12C116 14 115 14 112 12Z"
          fill="currentColor"
        />
        <path
          d="M128 12C125 10 124 10 123.5 12C124 14 125 14 128 12Z"
          fill="currentColor"
        />

        {/* Right flourish line */}
        <path
          d="M230 12H170C160 12 154 7 148 7C142 7 139 12 132 12"
          stroke="currentColor"
          strokeWidth="1.2"
          strokeLinecap="round"
        />
        <circle cx="234" cy="12" r="1.5" fill="currentColor" />
        <circle cx="180" cy="12" r="1" fill="currentColor" />
        <path d="M158 12C155 10 152 10 150 12" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
      </svg>
    </div>
  );
}

/**
 * AlpanaMandala: Symmetrical 8-petal alpana rosette, ideal for subtle background watermarks.
 */
export function AlpanaMandala({ className = 'text-bengal-gold/10', size = 180 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`pointer-events-none select-none transition-colors ${className}`}
      aria-hidden="true"
    >
      <circle cx="60" cy="60" r="10" stroke="currentColor" strokeWidth="1" />
      <circle cx="60" cy="60" r="3" fill="currentColor" />

      {/* 8 Petal geometry */}
      {[0, 45, 90, 135, 180, 225, 270, 315].map((angle) => (
        <g key={angle} transform={`rotate(${angle} 60 60)`}>
          <path
            d="M60 48C56 38 52 30 60 22C68 30 64 38 60 48Z"
            stroke="currentColor"
            strokeWidth="1.1"
            fill="none"
          />
          <circle cx="60" cy="18" r="1.5" fill="currentColor" />
          <path
            d="M57 36C58.5 33 61.5 33 63 36"
            stroke="currentColor"
            strokeWidth="0.8"
            strokeLinecap="round"
          />
        </g>
      ))}

      {/* Outer concentric beaded circle */}
      <circle cx="60" cy="60" r="46" stroke="currentColor" strokeWidth="0.8" strokeDasharray="2 3" />
    </svg>
  );
}

/**
 * TerracottaBorderPattern: Micro border detail reminiscent of Bishnupur terracotta temple plaques.
 */
export function TerracottaBorderPattern({ className = 'text-bengal-terracotta/20', height = 8 }) {
  return (
    <div
      className={`w-full h-2 overflow-hidden pointer-events-none select-none ${className}`}
      aria-hidden="true"
    >
      <svg width="100%" height={height} fill="none" xmlns="http://www.w3.org/2000/svg">
        <pattern id="terracotta-repeat" width="24" height="8" patternUnits="userSpaceOnUse">
          <path
            d="M0 4L6 0L12 4L18 0L24 4L18 8L12 4L6 8L0 4Z"
            fill="currentColor"
            opacity="0.3"
          />
          <circle cx="12" cy="4" r="1" fill="currentColor" />
        </pattern>
        <rect width="100%" height={height} fill="url(#terracotta-repeat)" />
      </svg>
    </div>
  );
}

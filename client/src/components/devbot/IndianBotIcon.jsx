import React from 'react';

/**
 * IndianBotIcon
 * A distinct, culturally crafted Indian AI Bot symbol:
 * - Auspicious Golden Mukut / Kalash Crown finial
 * - Sacred Chandan Tilak with vermilion Kumkum Bindi on the forehead
 * - Traditional Indian Kundal (golden ear stud modules)
 * - Friendly glowing teal cyber eyes and warm welcoming festive smile
 * - Seamless vector iconography that natively integrates with circular buttons
 */
export function IndianBotIcon({ className = 'w-6 h-6', ...props }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      {...props}
    >
      {/* 1. Auspicious Golden Mukut / Kalash Crown Finial */}
      <path
        d="M9.5 5.5C10.2 3.5 12 2.2 12 2.2C12 2.2 13.8 3.5 14.5 5.5"
        stroke="#FFD700"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="2.2" r="0.9" fill="#FFD700" />

      {/* 2. Traditional Indian Kundal (Golden Ear Stud Modules) */}
      <path
        d="M4 10.5C2.8 10.5 2 11.4 2 12.5C2 13.6 2.8 14.5 4 14.5"
        stroke="#FFD700"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M20 10.5C21.2 10.5 22 11.4 22 12.5C22 13.6 21.2 14.5 20 14.5"
        stroke="#FFD700"
        strokeWidth="1.5"
        strokeLinecap="round"
      />

      {/* 3. Outer Head Shell (Soft Curved Friendly Bot with Translucent Glass Fill) */}
      <rect
        x="4"
        y="5.5"
        width="16"
        height="13.5"
        rx="4.2"
        stroke="currentColor"
        strokeWidth="1.75"
        fill="white"
        fillOpacity="0.12"
      />

      {/* 4. Sacred Chandan Tilak & Red Kumkum Bindi */}
      <path
        d="M10.8 7.4C10.8 8.8 11.3 9.5 12 9.5C12.7 9.5 13.2 8.8 13.2 7.4"
        stroke="#FFD700"
        strokeWidth="1.2"
        strokeLinecap="round"
      />
      <circle cx="12" cy="8.5" r="0.75" fill="#EF4444" />

      {/* 5. Expressive Glowing Eyes */}
      <circle cx="8.8" cy="12.8" r="1.3" fill="#2DD4BF" />
      <circle cx="9.2" cy="12.4" r="0.45" fill="white" />
      <circle cx="15.2" cy="12.8" r="1.3" fill="#2DD4BF" />
      <circle cx="15.6" cy="12.4" r="0.45" fill="white" />

      {/* 6. Warm Friendly Smile */}
      <path
        d="M9.8 15.6C10.8 16.8 13.2 16.8 14.2 15.6"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </svg>
  );
}

export default IndianBotIcon;


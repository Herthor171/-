import React from 'react';

interface LogoProps {
  className?: string;
}

export const ClinicLogo: React.FC<LogoProps> = ({ className = 'w-10 h-10' }) => {
  return (
    <svg
      viewBox="0 0 200 200"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="LK Smile Dental Clinic Logo"
    >
      {/* Outer Gold Crescent Ring */}
      <path
        d="M104 12C50 18 10 64 12 118C14 168 58 196 108 194C154 192 188 158 194 112C184 152 148 182 104 182C56 182 22 146 24 98C26 54 60 22 104 12Z"
        fill="#CEA045"
      />
      <path
        d="M94 20C50 28 20 68 22 114C24 158 60 188 104 188C144 188 178 160 188 122C176 156 142 178 104 178C64 178 32 146 32 104C32 62 60 30 94 20Z"
        fill="#CEA045"
        opacity="0.85"
      />

      {/* Lotus Crown Petals (Deep Teal with Gold Border) */}
      <path
        d="M104 20L120 48L104 82L88 48L104 20Z"
        fill="#1E6B65"
        stroke="#CEA045"
        strokeWidth="5"
        strokeLinejoin="round"
      />
      <path
        d="M74 32L94 56L96 84L68 62L74 32Z"
        fill="#1E6B65"
        stroke="#CEA045"
        strokeWidth="5"
        strokeLinejoin="round"
      />
      <path
        d="M134 32L114 56L112 84L140 62L134 32Z"
        fill="#1E6B65"
        stroke="#CEA045"
        strokeWidth="5"
        strokeLinejoin="round"
      />
      <path
        d="M54 52L86 64L94 88L62 82L54 52Z"
        fill="#1E6B65"
        stroke="#CEA045"
        strokeWidth="5"
        strokeLinejoin="round"
      />
      <path
        d="M154 52L122 64L114 88L146 82L154 52Z"
        fill="#1E6B65"
        stroke="#CEA045"
        strokeWidth="5"
        strokeLinejoin="round"
      />

      {/* Tooth Contour & Root Structure (Gold) */}
      <path
        d="M66 78C56 90 58 114 64 134C68 148 74 172 84 172C92 172 94 134 104 134C114 134 116 174 126 174C136 174 142 146 146 124C150 102 154 86 144 76C134 86 120 92 104 92C88 92 74 86 66 78Z"
        stroke="#CEA045"
        strokeWidth="7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Botanical Leaves Inside & Along Tooth */}
      <path
        d="M70 92C86 96 94 110 88 124C74 120 68 106 70 92Z"
        fill="#1E6B65"
        stroke="#CEA045"
        strokeWidth="4.5"
      />
      <path
        d="M138 92C122 96 110 112 114 126C130 122 138 108 138 92Z"
        fill="#1E6B65"
        stroke="#CEA045"
        strokeWidth="4.5"
      />
      <path
        d="M44 116C58 120 68 134 64 148C50 144 42 130 44 116Z"
        fill="#1E6B65"
        stroke="#CEA045"
        strokeWidth="4.5"
      />

      {/* Central Gold Stem Flowing from Root to Lotus */}
      <path
        d="M80 176C76 140 96 114 104 82"
        stroke="#CEA045"
        strokeWidth="6"
        strokeLinecap="round"
      />
    </svg>
  );
};

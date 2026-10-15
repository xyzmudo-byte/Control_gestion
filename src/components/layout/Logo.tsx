import React from 'react';

interface LogoProps {
  size?: number;
  className?: string;
}

export const ProcessFlowLogo: React.FC<LogoProps> = ({ size = 28, className }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={{ display: 'block' }}
    >
      <defs>
        <linearGradient id="logoGrad1" x1="2" y1="2" x2="30" y2="30" gradientUnits="userSpaceOnUse">
          <stop stopColor="#38bdf8" />
          <stop offset="0.5" stopColor="#3b82f6" />
          <stop offset="1" stopColor="#6366f1" />
        </linearGradient>
        <linearGradient id="glowGrad" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
          <stop stopColor="#0ea5e9" stopOpacity="0.4" />
          <stop offset="1" stopColor="#8b5cf6" stopOpacity="0.1" />
        </linearGradient>
      </defs>

      {/* Fondo sutil redondeado */}
      <rect width="32" height="32" rx="8" fill="url(#glowGrad)" />

      {/* Líneas de conexión de procesos / flujo de datos */}
      <path
        d="M8 8 L24 8 L24 24 L8 24 Z"
        stroke="rgba(255, 255, 255, 0.15)"
        strokeWidth="1.5"
        strokeDasharray="2 2"
      />
      <path
        d="M8 8 L24 16 L8 24 L16 8 L24 24"
        stroke="url(#logoGrad1)"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.85"
      />

      {/* Nodos de datos / etapas de gestión */}
      <circle cx="8" cy="8" r="3" fill="#38bdf8" />
      <circle cx="24" cy="8" r="2.5" fill="#3b82f6" />
      <circle cx="24" cy="24" r="3" fill="#6366f1" />
      <circle cx="8" cy="24" r="2.5" fill="#0ea5e9" />
      <circle cx="16" cy="16" r="3.5" fill="#ffffff" stroke="#3b82f6" strokeWidth="1.5" />
    </svg>
  );
};

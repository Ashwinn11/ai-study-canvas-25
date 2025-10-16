import React from 'react';

interface BlobBackgroundProps {
  position: 'top' | 'bottom';
  color?: string;
  animate?: boolean;
}

export const BlobBackground: React.FC<BlobBackgroundProps> = ({
  position,
  color = '#ff7664',
  animate = true,
}) => {
  return (
    <div 
      className={`absolute inset-0 pointer-events-none ${
        position === 'top' ? 'z-0' : 'z-0'
      }`}
      style={{
        opacity: 0,
        animation: animate ? 'blobFadeIn 0.8s ease-out forwards, blobBreathing 8s ease-in-out 0.8s infinite' : 'blobFadeIn 0.8s ease-out forwards',
      }}
    >
      <svg
        className="absolute inset-0 w-full h-full"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
      >
        <defs>
          <radialGradient id={`blobGradient${position}`} cx="50%" cy="50%">
            <stop offset="0%" stopColor={color} stopOpacity="1" />
            <stop offset="100%" stopColor={color} stopOpacity="0.8" />
          </radialGradient>
        </defs>
        
        {position === 'top' ? (
          <path
            d="M 0 0 L 100 0 L 100 35 Q 75 38 50 33 Q 25 28 0 32 Z"
            fill={`url(#blobGradient${position})`}
          />
        ) : (
          <path
            d="M 0 100 L 100 100 L 100 85 Q 75 82 50 87 Q 25 92 0 88 Z"
            fill={`url(#blobGradient${position})`}
          />
        )}
        
        {/* Decorative dots */}
        {position === 'top' && (
          <>
            <circle cx="20" cy="15" r="2" fill="rgba(255,255,255,0.15)" />
            <circle cx="40" cy="22" r="1.5" fill="rgba(255,255,255,0.15)" />
            <circle cx="70" cy="18" r="1.8" fill="rgba(255,255,255,0.15)" />
            <circle cx="85" cy="25" r="1.2" fill="rgba(255,255,255,0.15)" />
          </>
        )}
      </svg>
    </div>
  );
};
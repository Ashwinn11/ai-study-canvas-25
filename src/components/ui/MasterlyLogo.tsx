import React from 'react';

interface MasterlyLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  white?: boolean;
}

export const MasterlyLogo: React.FC<MasterlyLogoProps> = ({ 
  className = "", 
  size = 'md',
  white = false 
}) => {
  const sizes = {
    sm: { width: 120, height: 24 },
    md: { width: 160, height: 32 },
    lg: { width: 200, height: 40 },
    xl: { width: 240, height: 48 }
  };

  const { width, height } = sizes[size];
  const textColor = white ? "#ffffff" : "#1f1f1f";

  return (
    <svg 
      width={width} 
      height={height} 
      viewBox="0 0 240 48" 
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <clipPath id="topHalf">
          <rect x="0" y="0" width="240" height="24" />
        </clipPath>
        <clipPath id="bottomHalf">
          <rect x="0" y="24" width="240" height="24" />
        </clipPath>
      </defs>
      
      {/* Top half of MASTERLY */}
      <g clipPath="url(#topHalf)">
        <text 
          x="120" 
          y="20" 
          fontFamily="Poppins" 
          fontSize="32" 
          fontWeight="700" 
          fill={textColor}
          textAnchor="middle"
        >
          MASTERLY
        </text>
      </g>
      
      {/* Bottom half of MASTERLY with slight offset for cut effect */}
      <g clipPath="url(#bottomHalf)" transform="translate(2, 0)">
        <text 
          x="120" 
          y="20" 
          fontFamily="Poppins" 
          fontSize="32" 
          fontWeight="700" 
          fill={textColor}
          textAnchor="middle"
        >
          MASTERLY
        </text>
      </g>
    </svg>
  );
};
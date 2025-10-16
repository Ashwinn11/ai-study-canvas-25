import React, { useMemo } from 'react';

interface WaveBackgroundProps {
  position: 'top' | 'bottom';
  color?: string;
  showDots?: boolean;
  animate?: boolean;
}

/**
 * WaveBackground - Web version of Masterly's organic wave shapes
 * 
 * Creates decorative wave backgrounds with optional dot patterns
 * and subtle breathing animations, matching the mobile app exactly.
 */
export const WaveBackground: React.FC<WaveBackgroundProps> = ({
  position,
  color = '#ff7664',
  showDots = true,
  animate = true,
}) => {
  // Generate deterministic IDs for multiple instances to avoid hydration mismatch
  const gradientId = useMemo(() => {
    // Create a simple hash from position and color to ensure consistency
    const hash = `${position}-${color}`.split('').reduce((acc, char) => {
      return acc + char.charCodeAt(0);
    }, 0);
    return `waveGradient${position}${hash.toString(36)}`;
  }, [position, color]);

  // Top wave path - large organic shape matching mobile app
  const topWavePath = `
    M 0 0
    L 100 0
    L 100 35
    Q 75 38 50 33
    Q 25 28 0 32
    Z
  `;

  // Bottom wave path - smaller decorative wave
  const bottomWavePath = `
    M 0 100
    L 100 100
    L 100 85
    Q 75 82 50 87
    Q 25 92 0 88
    Z
  `;

  // Dot positions for decoration (matching mobile app layout)
  const dots = position === 'top'
    ? [
        { cx: 20, cy: 15, r: 2 },
        { cx: 40, cy: 22, r: 1.5 },
        { cx: 70, cy: 18, r: 1.8 },
        { cx: 85, cy: 25, r: 1.2 },
        { cx: 15, cy: 28, r: 1.6 },
      ]
    : [
        { cx: 30, cy: 90, r: 1.8 },
        { cx: 60, cy: 88, r: 1.4 },
        { cx: 80, cy: 92, r: 1.6 },
      ];

  return (
    <div 
      className={`absolute inset-0 pointer-events-none z-10`}
      style={{
        opacity: 0,
        animation: animate ? 'waveFadeIn 0.8s ease-out forwards, waveBreathing 8s ease-in-out 0.8s infinite' : 'waveFadeIn 0.8s ease-out forwards',
      }}
    >
      <svg
        className="absolute inset-0 w-full h-full"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
      >
        <defs>
          <radialGradient id={gradientId} cx="50%" cy="50%">
            <stop offset="0%" stopColor={color} stopOpacity="1" />
            <stop offset="100%" stopColor={color} stopOpacity="0.8" />
          </radialGradient>
        </defs>
        
        {/* Wave shape */}
        <path
          d={position === 'top' ? topWavePath : bottomWavePath}
          fill={`url(#${gradientId})`}
        />

        {/* Decorative dots */}
        {showDots &&
          dots.map((dot, index) => (
            <circle
              key={index}
              cx={dot.cx}
              cy={dot.cy}
              r={dot.r}
              fill="rgba(255, 255, 255, 0.15)"
            />
          ))}
      </svg>
    </div>
  );
};
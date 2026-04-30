import React from 'react';

interface PixelTextProps {
  text: string;
  color?: string;
  scale?: number;
  gap?: number;
  noShift?: boolean;
  shiftY?: number;
  forceUppercase?: boolean;
}

/**
 * PixelText Component
 * Renders text using the 'NotCake' font.
 * The font is rendered at a small size and upscaled by the game container.
 */
export const PixelText: React.FC<PixelTextProps> = ({ 
  text, 
  color = 'currentColor', 
  scale = 1, 
  gap = 0, 
  noShift = false,
  shiftY = 1,
  forceUppercase = true 
}) => {
  const transform = [
    scale !== 1 ? `scale(${scale})` : '',
    noShift ? '' : `translateY(${shiftY}px)`
  ].filter(Boolean).join(' ');

  return (
    <span style={{ 
      display: 'inline-block',
      color: color,
      fontSize: '5px',
      lineHeight: 1.2,
      fontFamily: "'NotCake', sans-serif",
      letterSpacing: gap ? `${gap}px` : 'normal',
      transform: transform || undefined,
      transformOrigin: 'top left',
      whiteSpace: 'nowrap',
      textTransform: forceUppercase ? 'uppercase' : 'none',
      imageRendering: 'pixelated',
      WebkitFontSmoothing: 'none',
      fontSmooth: 'never'
    }}>
      {text}
    </span>
  );
};

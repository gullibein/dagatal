import React from 'react';

export interface PixelTextProps {
  text: string;
  color?: string;
  scale?: number;
  gap?: number;
  noShift?: boolean;
  shiftY?: number;
  forceUppercase?: boolean;
  block?: boolean;
  align?: 'left' | 'center' | 'right';
}

/**
 * PixelText Component
 * Renders text using the 'NotCake' font.
 */
export const PixelText: React.FC<PixelTextProps> = ({ 
  text, 
  color = 'currentColor', 
  scale = 1, 
  gap = 0, 
  noShift = false, 
  shiftY = 1,
  forceUppercase = true,
  block = false,
  align = 'left'
}) => {
  const transform = [
    scale !== 1 ? `scale(${scale})` : '',
    noShift ? '' : `translateY(${shiftY}px)`
  ].filter(Boolean).join(' ');

  return (
    <span style={{ 
      display: block ? 'block' : 'inline-block',
      textAlign: align,
      color: color,
      fontSize: '5px',
      lineHeight: 1.2,
      fontFamily: "'NotCake', sans-serif",
      letterSpacing: gap ? `${gap}px` : 'normal',
      transform: transform || undefined,
      transformOrigin: 'top left',
      whiteSpace: block ? 'normal' : 'nowrap',
      textTransform: forceUppercase ? 'uppercase' : 'none',
      imageRendering: 'pixelated',
      WebkitFontSmoothing: 'none',
      fontSmooth: 'never'
    }}>
      {text}
    </span>
  );
};

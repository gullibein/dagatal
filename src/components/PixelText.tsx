import React from 'react';

interface PixelTextProps {
  text: string;
  color?: string;
  scale?: number;
  gap?: number;
  noShift?: boolean;
}

/**
 * PixelText Component
 * Renders text using the 'TinyAndChunkyRegular' font.
 * The font is rendered at a small size and upscaled by the game container.
 */
export const PixelText: React.FC<PixelTextProps> = ({ text, color = 'currentColor', scale = 1, gap = 0, noShift = false }) => {
  const transform = [
    scale !== 1 ? `scale(${scale})` : '',
    !noShift ? 'translateY(-1px)' : ''
  ].filter(Boolean).join(' ');

  return (
    <span style={{ 
      display: 'inline-block',
      color: color,
      fontSize: '5px',
      lineHeight: 1.2,
      fontFamily: "'TinyAndChunkyRegular', sans-serif",
      letterSpacing: gap ? `${gap}px` : 'normal',
      transform: transform || undefined,
      transformOrigin: 'top left',
      whiteSpace: 'nowrap',
      imageRendering: 'pixelated',
      WebkitFontSmoothing: 'none',
      fontSmooth: 'never'
    }}>
      {text}
    </span>
  );
};

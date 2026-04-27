import React from 'react';

interface PixelTextProps {
  text: string;
  color?: string;
  scale?: number;
  gap?: number;
}

/**
 * PixelText Component
 * Renders text using the 'axones_6p.png' sprite sheet.
 * Image Size: 208x160 pixels.
 * Sprite Grid: 8x16 cells.
 * Mapping provided by USER.
 */
export const PixelText: React.FC<PixelTextProps> = ({ text, color = 'currentColor', scale = 1, gap = 1 }) => {
  // Using yOffset=3 and height=12 to ensure accents (dots, ticks) at pixel 4 are visible.
  const renderWidth = 5;
  const renderHeight = 12; 
  const gridWidth = 8;
  const gridHeight = 16;
  const xOffset = 0;
  const yOffset = 3; 

  const getCharCoords = (char: string) => {
    const rows = [
      "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
      "abcdefghijklmnopqrstuvwxyz",
      "0123456789.,;:?!\"'+-=*%_()",
      "[]{}~#&@©®™°^`|/\\<>…€$£¢¿¡",
      "“”‘’«»‹›„‚·•ÀÁÂÄÃÅÆÇÐÈÉÊËÌ",
      "ÍÎÏÑÒÓÔÖÕØŒÙÚÛÜÝŸÞẞàáâäãåæ",
      "çðèéêëìíîïñòóôöõøœùúûüýÿþß",
      "АБВГДЕЁЖЗИЙКЛМНОПРСТУФХЦЧШ",
      "ЩЪЫЬЭЮЯабвгдеёжзийклмнопрс",
      "туфхцчшщъыьэюя"
    ];

    for (let r = 0; r < rows.length; r++) {
      const col = rows[r].indexOf(char);
      if (col !== -1) {
        return { col, row: r };
      }
    }

    return null;
  };

  return (
    <div style={{ 
      display: 'inline-flex', 
      height: `${renderHeight * scale}px`,
      alignItems: 'flex-start',
      gap: `${gap * scale}px`
    }}>
      {text.split('').map((char, i) => {
        const coords = getCharCoords(char);
        if (!coords) {
          return <span key={i} style={{ width: `${renderWidth * scale}px` }} />;
        }

        const x = (coords.col * gridWidth) + xOffset;
        const y = (coords.row * gridHeight) + yOffset;

        return (
          <span 
            key={i}
            style={{
              display: 'inline-block',
              width: `${renderWidth}px`,
              height: `${renderHeight}px`,
              backgroundColor: color,
              WebkitMaskImage: 'url("/axones_6p.png")',
              WebkitMaskPosition: `-${x}px -${y}px`,
              maskImage: 'url("/axones_6p.png")',
              maskPosition: `-${x}px -${y}px`,
              imageRendering: 'pixelated',
              transform: `scale(${scale})`,
              transformOrigin: 'top left',
              flexShrink: 0,
              marginRight: `${(scale - 1) * renderWidth}px`,
              marginBottom: `${(scale - 1) * renderHeight}px`
            }}
          />
        );
      })}
    </div>
  );
};

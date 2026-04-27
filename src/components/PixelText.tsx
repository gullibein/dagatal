import React from 'react';

interface PixelTextProps {
  text: string;
  color?: string; // Optional: filter to apply color
  scale?: number;
}

/**
 * PixelText Component
 * Renders text using the 'dinowyde_wip_characters.png' sprite sheet.
 * Mapping: ASCII 32 (' ') starts at (0, 17) in a 16x16 grid of 6x8 cells.
 */
export const PixelText: React.FC<PixelTextProps> = ({ text, color, scale = 1 }) => {
  const charWidth = 6;
  const charHeight = 8;
  const startY = 17;
  const cols = 16;

  const renderChar = (char: string, index: number) => {
    const code = char.charCodeAt(0);
    let col = 0;
    let row = 0;

    if (code >= 32 && code <= 126) {
      // Standard ASCII
      const spriteIndex = code - 32;
      col = spriteIndex % cols;
      row = Math.floor(spriteIndex / cols);
    } else if (code >= 192 && code <= 223) {
      // Latin-1 Uppercase (À-ß)
      const spriteIndex = code - 192;
      col = spriteIndex % cols;
      row = 6 + Math.floor(spriteIndex / cols);
    } else if (code >= 224 && code <= 255) {
      // Latin-1 Lowercase (à-ÿ)
      const spriteIndex = code - 224;
      col = spriteIndex % cols;
      row = 8 + Math.floor(spriteIndex / cols);
    } else {
      // Unsupported: render a placeholder or empty
      return <span key={index} style={{ display: 'inline-block', width: `${charWidth * scale}px`, height: `${charHeight * scale}px` }} />;
    }

    const x = col * charWidth;
    const y = startY + (row * charHeight);

    return (
      <span 
        key={index}
        style={{
          display: 'inline-block',
          width: `${charWidth}px`,
          height: `${charHeight}px`,
          backgroundImage: 'url("/dinowyde_wip_characters.png")',
          backgroundPosition: `-${x}px -${y}px`,
          imageRendering: 'pixelated',
          transform: `scale(${scale})`,
          transformOrigin: 'top left',
          marginRight: `${(scale - 1) * charWidth}px`,
          flexShrink: 0
        }}
      />
    );
  };

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', height: `${charHeight * scale}px` }}>
      {text.split('').map((char, i) => renderChar(char, i))}
    </div>
  );
};

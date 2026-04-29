import React, { useState, useRef } from 'react';
import { PixelText } from './PixelText';

interface PixelInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
  className?: string;
  block?: boolean;
}

export const PixelInput: React.FC<PixelInputProps> = ({ 
  value, 
  onChange, 
  placeholder = '', 
  autoFocus = false,
  className = '',
  block = false
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleClick = () => {
    inputRef.current?.focus();
  };

  return (
    <div 
      className={`pixel-input-wrapper ${block ? 'block' : ''} ${className}`}
      onClick={handleClick}
    >
      {/* Hidden real input for focus and typing */}
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        autoFocus={autoFocus}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          opacity: 0,
          cursor: 'none',
          border: 'none',
          outline: 'none',
          padding: 0,
          margin: 0,
          zIndex: 1
        }}
      />
      
      {/* Visual overlay with PNG font */}
      <div style={{ position: 'relative', pointerEvents: 'none', display: 'flex', alignItems: 'center' }}>
        {isFocused && value === '' && (
          <div className="pixel-caret" style={{
            width: '1px',
            height: '7px',
            backgroundColor: 'black',
            marginRight: '1px'
          }} />
        )}

        {value === '' ? (
          <PixelText text={placeholder} color="#aaa" />
        ) : (
          <>
            <PixelText text={value} color="black" />
            {isFocused && (
              <div className="pixel-caret" style={{
                width: '1px',
                height: '7px',
                backgroundColor: 'black',
                marginLeft: '1px'
              }} />
            )}
          </>
        )}
      </div>
    </div>
  );
};

import React, { useState, useRef, useEffect } from 'react';
import { PixelText } from './PixelText';

interface PixelInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
  className?: string;
  block?: boolean;
  onEnter?: () => void;
}

export const PixelInput: React.FC<PixelInputProps> = ({ 
  value, 
  onChange, 
  placeholder = '', 
  autoFocus = false,
  className = '',
  block = false,
  onEnter
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const [selection, setSelection] = useState({ start: 0, end: 0 });
  const inputRef = useRef<HTMLInputElement>(null);

  const updateSelection = () => {
    if (inputRef.current) {
      setSelection({
        start: inputRef.current.selectionStart || 0,
        end: inputRef.current.selectionEnd || 0
      });
    }
  };

  const handleClick = () => {
    inputRef.current?.focus();
    updateSelection();
  };

  // Keep selection state in sync
  useEffect(() => {
    if (isFocused) {
      const interval = setInterval(updateSelection, 50); // Fallback for various input methods
      return () => clearInterval(interval);
    }
  }, [isFocused]);

  const beforeText = value.slice(0, selection.start);
  const selectedText = value.slice(selection.start, selection.end);
  const afterText = value.slice(selection.end);
  const hasSelection = selection.start !== selection.end;

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
        onChange={(e) => {
          onChange(e.target.value);
          setTimeout(updateSelection, 0);
        }}
        onFocus={() => {
          setIsFocused(true);
          updateSelection();
        }}
        onBlur={() => setIsFocused(false)}
        onSelect={updateSelection}
        onKeyUp={(e) => {
          updateSelection();
          if (e.key === 'Enter' && onEnter) {
            onEnter();
          }
        }}
        onMouseDown={updateSelection}
        onMouseMove={(e) => e.buttons === 1 && updateSelection()}
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
        {value === '' ? (
          <>
            {isFocused && (
              <div className="pixel-caret" style={{
                width: '1px',
                height: '7px',
                backgroundColor: 'black',
                marginRight: '1px'
              }} />
            )}
            <PixelText text={placeholder} color="#aaa" forceUppercase={false} />
          </>
        ) : (
          <>
            <PixelText text={beforeText} color="black" forceUppercase={false} />
            
            {isFocused && !hasSelection && (
              <div className="pixel-caret" style={{
                width: '1px',
                height: '7px',
                backgroundColor: 'black'
              }} />
            )}

            {hasSelection && (
              isFocused ? (
                <div className="pixel-selection-bg">
                  <PixelText text={selectedText} color="white" forceUppercase={false} />
                </div>
              ) : (
                <PixelText text={selectedText} color="black" forceUppercase={false} />
              )
            )}

            <PixelText text={afterText} color="black" forceUppercase={false} />

            {isFocused && hasSelection && selection.end === value.length && (
              /* If selection ends at the very end, we might want a caret there too? 
                 Actually, standard behavior shows caret at the end of selection. */
              <div className="pixel-caret" style={{
                width: '1px',
                height: '7px',
                backgroundColor: 'black'
              }} />
            )}
          </>
        )}
      </div>
    </div>
  );
};

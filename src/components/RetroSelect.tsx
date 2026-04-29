import { useState, useEffect, useRef } from 'react';
import { PixelText } from './PixelText';

export function RetroSelect({ 
  value, 
  options, 
  onChange,
  className = ''
}: { 
  value: string; 
  options: { label: string; value: string }[] | string[]; 
  onChange: (v: string) => void;
  className?: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      window.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      window.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);
  
  const displayValue = typeof options[0] === 'string' 
    ? value 
    : (options as {label: string, value: string}[]).find(o => o.value === value)?.label || value;
  
  return (
    <div className={`retro-select-container ${className}`} ref={containerRef}>
      <div className="retro-select-value" onClick={() => setIsOpen(!isOpen)}>
        <PixelText text={displayValue} />
      </div>
      {isOpen && (
        <div className="retro-select-dropdown">
          {options.map(opt => {
            const optVal = typeof opt === 'string' ? opt : opt.value;
            const optLabel = typeof opt === 'string' ? opt : opt.label;
            return (
              <div 
                key={optVal} 
                className="retro-select-option"
                onClick={() => {
                  onChange(optVal);
                  setIsOpen(false);
                }}
              >
                <PixelText text={optLabel} />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

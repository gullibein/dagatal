import { useState } from 'react';
import { PixelText } from './PixelText';

export function RetroSelect({ 
  value, 
  options, 
  onChange 
}: { 
  value: string; 
  options: { label: string; value: string }[] | string[]; 
  onChange: (v: string) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  
  const displayValue = typeof options[0] === 'string' 
    ? value 
    : (options as {label: string, value: string}[]).find(o => o.value === value)?.label || value;
  
  return (
    <div className="retro-select-container">
      <div className="retro-select-value" onClick={() => setIsOpen(!isOpen)}>
        <PixelText text={displayValue} />
        <div className="retro-select-arrow">
          <PixelText text="v" />
        </div>
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

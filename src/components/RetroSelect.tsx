import { useState } from 'react';

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
        <span>{displayValue}</span>
        <span className="retro-select-arrow">v</span>
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
                {optLabel}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

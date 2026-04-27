import { useState, useEffect } from 'react';

import { RetroSelect } from './RetroSelect';
interface EventModalProps {
  initialDate: Date;
  onSave: (title: string, date: Date, color: string) => void;
  onClose: () => void;
  onEdit?: () => void;
}

const COLORS = ['#ff9292', '#83b8f4', '#afe5ad', '#f2ee97', '#ecb3d2'];

export function EventModal({ initialDate, onSave, onClose, onEdit }: EventModalProps) {
  const [title, setTitle] = useState('');
  const [hour, setHour] = useState(initialDate.getHours().toString().padStart(2, '0'));
  const [minute, setMinute] = useState(Math.round(initialDate.getMinutes() / 5 * 5).toString().padStart(2, '0'));
  const [color, setColor] = useState(COLORS[0]);

  // Listen for Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handleSave = () => {
    if (!title.trim()) return;
    
    const eventDate = new Date(initialDate);
    eventDate.setHours(parseInt(hour, 10));
    eventDate.setMinutes(parseInt(minute, 10));
    
    onSave(title, eventDate, color);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">New Event</div>
        
        <div className="modal-body">
          <input 
            className="retro-input" 
            placeholder="Event Title" 
            value={title}
            onChange={e => setTitle(e.target.value)}
            autoFocus
          />
          
          <div className="time-picker" style={{ justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
              <div className="narrow-select">
                <RetroSelect 
                  value={hour} 
                  options={Array.from({ length: 24 }).map((_, i) => i.toString().padStart(2, '0'))} 
                  onChange={setHour} 
                />
              </div>
              <div className="retro-colon" />
              <div className="narrow-select">
                <RetroSelect 
                  value={minute} 
                  options={['00', '05', '10', '15', '20', '25', '30', '35', '40', '45', '50', '55']} 
                  onChange={setMinute} 
                />
              </div>
            </div>
            
            <div className="color-picker-row" style={{ display: 'flex', gap: '1px', alignItems: 'center' }}>
              {COLORS.map(c => (
                <div 
                  key={c}
                  className={`color-swatch ${color === c ? 'selected' : ''}`}
                  style={{ backgroundColor: c }}
                  onClick={() => setColor(c)}
                />
              ))}
            </div>
          </div>
        </div>

        <div className="modal-footer" style={{ justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', gap: '4px' }}>
            <button onClick={onClose}>Cancel</button>
            {onEdit && <button onClick={onEdit}>Show More</button>}
          </div>
          <button className="primary" onClick={handleSave}>Save</button>
        </div>
      </div>
    </div>
  );
}

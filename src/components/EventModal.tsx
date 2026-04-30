import { useState, useEffect, useRef } from 'react';
import { format, addMinutes, differenceInMinutes, setHours, setMinutes } from 'date-fns';
import { PixelText } from './PixelText';
import { PixelInput } from './PixelInput';
import { RetroSelect } from './RetroSelect';
interface EventModalProps {
  initialDate: Date;
  initialTitle?: string;
  onSave: (title: string, date: Date, color: string, duration?: number) => void;
  onClose: () => void;
  onEdit?: (currentTitle: string) => void;
  initialDuration?: number;
}

const COLORS = ['#ff9292', '#83b8f4', '#afe5ad', '#f2ee97', '#ecb3d2', '#ffd1a9'];

export function EventModal({ initialDate, initialTitle = '', initialDuration, onSave, onClose, onEdit }: EventModalProps) {
  const [title, setTitle] = useState(initialTitle);
  
  // Draggable State
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartPos = useRef({ x: 0, y: 0 });
  const modalStartPos = useRef({ x: 0, y: 0 });

  const [hour, setHour] = useState(initialDate.getHours().toString().padStart(2, '0'));
  const [minute, setMinute] = useState(Math.round(initialDate.getMinutes() / 5 * 5).toString().padStart(2, '0'));
  
  const actualDuration = initialDuration || 60;
  const initialToDate = addMinutes(initialDate, actualDuration);
  const [toHour, setToHour] = useState(initialToDate.getHours().toString().padStart(2, '0'));
  const [toMinute, setToMinute] = useState(Math.round(initialToDate.getMinutes() / 5 * 5).toString().padStart(2, '0'));
  const [toDate, setToDate] = useState(initialToDate);
  
  const [color, setColor] = useState(COLORS[0]);

  // When FROM time changes, move TO time by the same duration
  const handleFromChange = (newH: string, newM: string) => {
    const oldFrom = setMinutes(setHours(new Date(initialDate), parseInt(hour)), parseInt(minute));
    const newFrom = setMinutes(setHours(new Date(initialDate), parseInt(newH)), parseInt(newM));
    const diff = differenceInMinutes(toDate, oldFrom);
    
    setHour(newH);
    setMinute(newM);
    
    const newTo = addMinutes(newFrom, diff);
    setToHour(newTo.getHours().toString().padStart(2, '0'));
    setToMinute(newTo.getMinutes().toString().padStart(2, '0'));
    setToDate(newTo);
  };

  const handleToChange = (newH: string, newM: string) => {
    const newTo = setMinutes(setHours(new Date(toDate), parseInt(newH)), parseInt(newM));
    setToHour(newH);
    setToMinute(newM);
    setToDate(newTo);
  };

  // Listen for Escape key and Dragging
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        // We need to account for scale if we're in the scaled container, 
        // but here we just need relative movement.
        // Actually, let's just use the mouse movement delta.
        const dx = e.clientX - dragStartPos.current.x;
        const dy = e.clientY - dragStartPos.current.y;
        
        // App scale is handled by CSS, so we need to divide by scale to get 320x200 pixels
        const scale = Number(document.documentElement.style.getPropertyValue('--app-scale') || 1);
        
        setPos({
          x: modalStartPos.current.x + dx / scale,
          y: modalStartPos.current.y + dy / scale
        });
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    window.addEventListener('keydown', handleKeyDown);
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [onClose, isDragging]);

  const handleHeaderMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    dragStartPos.current = { x: e.clientX, y: e.clientY };
    modalStartPos.current = { x: pos.x, y: pos.y };
  };

  const handleSave = () => {
    if (!title.trim()) return;
    
    const eventDate = setMinutes(setHours(new Date(initialDate), parseInt(hour, 10)), parseInt(minute, 10));
    const endEventDate = setMinutes(setHours(new Date(toDate), parseInt(toHour, 10)), parseInt(toMinute, 10));
    const dur = differenceInMinutes(endEventDate, eventDate);
    
    onSave(title, eventDate, color, Math.max(0, dur));
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div 
        className="modal-content" 
        onClick={e => e.stopPropagation()}
        style={{ 
          width: '210px',
          transform: `translate(${pos.x}px, ${pos.y}px)`,
          cursor: isDragging ? 'grabbing' : 'default'
        }}
      >
        <div className="modal-header" onMouseDown={handleHeaderMouseDown} style={{ cursor: 'grab' }}>
          <PixelText text={`New Event - ${format(initialDate, 'dd. MMM yyyy')}`} color="var(--bg-color)" />
        </div>
        
        <div className="modal-body">
          <PixelInput 
            placeholder="Event Title" 
            value={title}
            onChange={setTitle}
            autoFocus
            block
          />
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '4px' }}>
            {/* FROM row */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
              <div style={{ width: '24px' }}>
                <PixelText text="FROM" color="#555" />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0px' }}>
                <div className="narrow-select">
                  <RetroSelect 
                    value={hour} 
                    options={Array.from({ length: 24 }).map((_, i) => i.toString().padStart(2, '0'))} 
                    onChange={(h) => handleFromChange(h, minute)} 
                    style={{ width: '15px', height: '9px' }}
                  />
                </div>
                <div className="retro-colon" />
                <div className="narrow-select">
                  <RetroSelect 
                    value={minute} 
                    options={['00', '05', '10', '15', '20', '25', '30', '35', '40', '45', '50', '55']} 
                    onChange={(m) => handleFromChange(hour, m)} 
                    style={{ width: '15px', height: '9px' }}
                  />
                </div>
              </div>
              <div style={{ marginLeft: '2px', flex: 1 }}>
                <PixelText text={format(initialDate, 'dd. MMM yyyy')} color="#777" />
              </div>

              {/* Color Picker integrated here */}
              <div className="color-picker-row" style={{ display: 'flex', gap: '1px', alignItems: 'center', marginLeft: '4px' }}>
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

            {/* TO row */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
              <div style={{ width: '24px' }}>
                <PixelText text="TO" color="#555" />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0px' }}>
                <div className="narrow-select">
                  <RetroSelect 
                    value={toHour} 
                    options={Array.from({ length: 24 }).map((_, i) => i.toString().padStart(2, '0'))} 
                    onChange={(h) => handleToChange(h, toMinute)} 
                    style={{ width: '15px', height: '9px' }}
                  />
                </div>
                <div className="retro-colon" />
                <div className="narrow-select">
                  <RetroSelect 
                    value={toMinute} 
                    options={['00', '05', '10', '15', '20', '25', '30', '35', '40', '45', '50', '55']} 
                    onChange={(m) => handleToChange(toHour, m)} 
                    style={{ width: '15px', height: '9px' }}
                  />
                </div>
              </div>
              <div style={{ marginLeft: '2px' }}>
                <PixelText text={format(toDate, 'dd. MMM yyyy')} color="#777" />
              </div>
            </div>

          </div>
        </div>

        <div className="modal-footer" style={{ justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', gap: '4px' }}>
            <button onClick={onClose}>
              <PixelText text="Cancel" />
            </button>
            {onEdit && (
              <button onClick={() => onEdit(title)}>
                <PixelText text="More" />
              </button>
            )}
          </div>
          <button className="primary" onClick={handleSave}>
            <PixelText text="Save" />
          </button>
        </div>
      </div>
    </div>
  );
}

import { useState, useEffect, useRef } from 'react';
import { 
  format, addMinutes, differenceInMinutes, 
  getDate, getMonth, getYear, 
  setDate, setMonth, setYear, 
  setHours, setMinutes, startOfDay,
  getDaysInMonth
} from 'date-fns';
import { PixelText } from './PixelText';
import { PixelInput } from './PixelInput';
import { CalendarEvent, EventReminder } from '../types';
import { RetroSelect } from './RetroSelect';

interface EditEventModalProps {
  initialDate: Date;
  eventToEdit?: CalendarEvent;
  initialTitle?: string;
  initialDuration?: number;
  onSave: (eventData: Partial<CalendarEvent>) => void;
  onClose: () => void;
  onShowLess?: (currentTitle: string) => void;
}

const COLORS = ['#ff9292', '#83b8f4', '#afe5ad', '#f2ee97', '#ecb3d2', '#ffd1a9'];

export function EditEventModal({ initialDate, eventToEdit, initialTitle, initialDuration, onSave, onClose, onShowLess }: EditEventModalProps) {
  const [title, setTitle] = useState(initialTitle || eventToEdit?.title || '');
  
  // Draggable State
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartPos = useRef({ x: 0, y: 0 });
  const modalStartPos = useRef({ x: 0, y: 0 });
  
  const startD = eventToEdit ? eventToEdit.date : initialDate;
  const [hour, setHour] = useState(startD.getHours().toString().padStart(2, '0'));
  const [minute, setMinute] = useState(Math.round(startD.getMinutes() / 5 * 5).toString().padStart(2, '0'));
  
  const startDuration = eventToEdit ? eventToEdit.durationMinutes || 60 : initialDuration || 60;
  const [durDays, setDurDays] = useState(Math.floor(startDuration / 1440).toString());
  const [durHours, setDurHours] = useState(Math.floor((startDuration % 1440) / 60).toString());
  const [durMins, setDurMins] = useState((startDuration % 60).toString());

  const [repeatPattern, setRepeatPattern] = useState(eventToEdit?.repeatPattern || 'none');
  const [location, setLocation] = useState(eventToEdit?.location || '');
  
  // Convert minutesBefore to complex reminder objects
  const [reminders, setReminders] = useState(() => (eventToEdit?.reminders || []).map(r => {
    const total = r.minutesBefore;
    const isAfter = total < 0;
    const absTotal = Math.abs(total);
    return {
      id: r.id,
      days: Math.floor(absTotal / 1440).toString(),
      hours: Math.floor((absTotal % 1440) / 60).toString(),
      mins: (absTotal % 60).toString(),
      direction: isAfter ? 'after' : 'before'
    };
  }));

  const [color, setColor] = useState(eventToEdit?.color || COLORS[0]);
  
  const [isDurationMode, setIsDurationMode] = useState(true);
  const [untilDay, setUntilDay] = useState('');
  const [untilMonth, setUntilMonth] = useState('');
  const [untilYear, setUntilYear] = useState('');
  const [untilHour, setUntilHour] = useState('');
  const [untilMinute, setUntilMinute] = useState('');

  // Auto-clamp day if month changes
  useEffect(() => {
    if (untilDay && untilMonth && untilYear) {
      const maxDays = getDaysInMonth(new Date(parseInt(untilYear), parseInt(untilMonth) - 1));
      if (parseInt(untilDay) > maxDays) {
        setUntilDay(maxDays.toString());
      }
    }
  }, [untilMonth, untilYear, untilDay]);

  useEffect(() => {
    const start = new Date(startD);
    start.setHours(parseInt(hour, 10));
    start.setMinutes(parseInt(minute, 10));
    const end = addMinutes(start, initialDuration);
    setUntilDay(getDate(end).toString());
    setUntilMonth((getMonth(end) + 1).toString());
    setUntilYear(getYear(end).toString());
    setUntilHour(end.getHours().toString().padStart(2, '0'));
    setUntilMinute(Math.round(end.getMinutes() / 5 * 5).toString().padStart(2, '0'));
  }, []);

  const toggleMode = () => {
    const start = new Date(startD);
    start.setHours(parseInt(hour, 10) || 0);
    start.setMinutes(parseInt(minute, 10) || 0);

    if (isDurationMode) {
      const d = parseInt(durDays, 10) || 0;
      const h = parseInt(durHours, 10) || 0;
      const m = parseInt(durMins, 10) || 0;
      const totalDuration = (d * 1440) + (h * 60) + m;
      const end = addMinutes(start, totalDuration);
      setUntilDay(getDate(end).toString());
      setUntilMonth((getMonth(end) + 1).toString());
      setUntilYear(getYear(end).toString());
      setUntilHour(end.getHours().toString().padStart(2, '0'));
      setUntilMinute(Math.round(end.getMinutes() / 5 * 5).toString().padStart(2, '0'));
    } else {
      let end = new Date(start);
      end = setYear(end, parseInt(untilYear, 10) || getYear(start));
      end = setMonth(end, (parseInt(untilMonth, 10) || 1) - 1);
      end = setDate(end, parseInt(untilDay, 10) || getDate(start));
      end = setHours(end, parseInt(untilHour, 10) || 0);
      end = setMinutes(end, parseInt(untilMinute, 10) || 0);
      const duration = Math.max(0, differenceInMinutes(end, start));
      setDurDays(Math.floor(duration / 1440).toString());
      setDurHours(Math.floor((duration % 1440) / 60).toString());
      setDurMins((duration % 60).toString());
    }
    setIsDurationMode(!isDurationMode);
  };

  // Listen for Escape key and Dragging
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        const dx = e.clientX - dragStartPos.current.x;
        const dy = e.clientY - dragStartPos.current.y;
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
    
    const start = new Date(startD);
    start.setHours(parseInt(hour, 10));
    start.setMinutes(parseInt(minute, 10));
    
    let totalDuration = 0;
    if (isDurationMode) {
      totalDuration = (parseInt(durDays) * 1440) + (parseInt(durHours) * 60) + parseInt(durMins);
    } else {
      let end = new Date(start);
      end = setYear(end, parseInt(untilYear, 10));
      end = setMonth(end, parseInt(untilMonth, 10) - 1);
      end = setDate(end, parseInt(untilDay, 10));
      end = setHours(end, parseInt(untilHour, 10));
      end = setMinutes(end, parseInt(untilMinute, 10));
      totalDuration = Math.max(0, differenceInMinutes(end, start));
    }

    const processedReminders: EventReminder[] = reminders.map(r => {
      const total = (parseInt(r.days) * 1440) + (parseInt(r.hours) * 60) + parseInt(r.mins);
      return {
        id: r.id,
        minutesBefore: r.direction === 'after' ? -total : total
      };
    });
    
    onSave({
      title,
      date: start,
      durationMinutes: totalDuration,
      repeatPattern: repeatPattern as CalendarEvent['repeatPattern'],
      location,
      reminders: processedReminders,
      color
    });
  };

  const addReminder = () => {
    if (reminders.length >= 5) return;
    setReminders([...reminders, { 
      id: Math.random().toString(36).substring(7), 
      days: '0', hours: '0', mins: '15', direction: 'before' 
    }]);
  };

  const updateReminder = (id: string, updates: any) => {
    setReminders(reminders.map(r => r.id === id ? { ...r, ...updates } : r));
  };

  const removeReminder = (id: string) => {
    setReminders(reminders.filter(r => r.id !== id));
  };

  const durDayOptions = Array.from({ length: 31 }).map((_, i) => i.toString());
  const maxDaysUntil = getDaysInMonth(new Date(parseInt(untilYear) || 2024, (parseInt(untilMonth) || 1) - 1));
  const untilDayOptions = Array.from({ length: maxDaysUntil }).map((_, i) => (i + 1).toString());
  
  const hourOptions = Array.from({ length: 24 }).map((_, i) => i.toString());
  const minOptions = ['0', '5', '10', '15', '20', '25', '30', '35', '40', '45', '50', '55'];

  const repeatOptions = [
    { label: 'None', value: 'none' },
    { label: 'Daily', value: 'daily' },
    { label: 'Weekly', value: 'weekly' },
    { label: 'Monthly', value: 'monthly' },
    { label: 'Yearly', value: 'yearly' }
  ];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div 
        className="modal-content" 
        style={{ 
          width: '202px',
          transform: `translate(${pos.x}px, ${pos.y}px)`,
          cursor: isDragging ? 'grabbing' : 'default'
        }} 
        onClick={e => e.stopPropagation()}
      >
        <div className="modal-header" onMouseDown={handleHeaderMouseDown} style={{ cursor: 'grab' }}>
          <PixelText text="Edit Event" color="var(--bg-color)" />
        </div>        
        <div className="modal-body scrollable-body">
          <PixelInput 
            placeholder="Event Title" 
            value={title}
            onChange={setTitle}
            autoFocus
            block
          />
          
          <div className="form-row">
            <label>
              <PixelText text="Time" />
            </label>
            <div className="time-picker" style={{ flex: 1, justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                <div className="narrow-select">
                  <RetroSelect 
                    value={hour} 
                    options={Array.from({ length: 24 }).map((_, i) => i.toString().padStart(2, '0'))} 
                    onChange={setHour} 
                    style={{ width: '15px' }}
                  />
                </div>
                <div className="retro-colon" />
                <div className="narrow-select">
                  <RetroSelect 
                    value={minute} 
                    options={['00', '05', '10', '15', '20', '25', '30', '35', '40', '45', '50', '55']} 
                    onChange={setMinute} 
                    style={{ width: '15px' }}
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

          <div className="form-row">
            <button type="button" className="toggle-btn mode-btn" onClick={toggleMode} style={{ width: '42px' }}>
              <PixelText text={isDurationMode ? "LENGTH" : "UNTIL"} />
            </button>
            {isDurationMode ? (
              <div className="multi-select-row until-row" style={{ marginTop: '-4px', gap: '1px', flex: 1, justifyContent: 'flex-end' }}>
                <div className="unit-select">
                  <PixelText text="D" shiftY={0} />
                  <RetroSelect value={durDays} options={durDayOptions} onChange={setDurDays} style={{ width: '15px' }} />
                </div>
                <div className="unit-select">
                  <PixelText text="H" shiftY={0} />
                  <RetroSelect value={durHours} options={hourOptions} onChange={setDurHours} style={{ width: '15px' }} />
                </div>
                <div className="unit-select">
                  <PixelText text="M" shiftY={0} />
                  <RetroSelect value={durMins} options={minOptions} onChange={setDurMins} style={{ width: '16px' }} />
                </div>
              </div>
            ) : (
              <div className="multi-select-row until-row" style={{ marginTop: '-4px', gap: '1px', flex: 1, justifyContent: 'flex-end' }}>
                <div className="unit-select">
                  <PixelText text="D" shiftY={0} />
                  <RetroSelect value={untilDay} options={untilDayOptions} onChange={setUntilDay} style={{ width: '15px' }} />
                </div>
                <div className="unit-select">
                  <PixelText text="M" shiftY={0} />
                  <RetroSelect value={untilMonth} options={Array.from({ length: 12 }, (_, i) => (i + 1).toString())} onChange={setUntilMonth} style={{ width: '15px' }} />
                </div>
                <div className="unit-select">
                  <PixelText text="Y" shiftY={0} />
                  <RetroSelect 
                    value={untilYear} 
                    options={Array.from({ length: 10 }, (_, i) => ({ label: (24 + i).toString(), value: (2024 + i).toString() }))} 
                    onChange={setUntilYear} 
                    style={{ width: '16px' }} 
                  />
                </div>
                <div style={{ width: '1px' }} />
                <div className="unit-select">
                  <PixelText text="T" shiftY={0} />
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0' }}>
                    <RetroSelect value={untilHour} options={Array.from({ length: 24 }).map((_, i) => i.toString().padStart(2, '0'))} onChange={setUntilHour} style={{ width: '15px' }} />
                    <div className="retro-colon" />
                    <RetroSelect value={untilMinute} options={minOptions.map(m => m.padStart(2, '0'))} onChange={setUntilMinute} style={{ width: '15px' }} />
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="form-row">
            <label>
              <PixelText text="Repeat" />
            </label>
            <RetroSelect value={repeatPattern} options={repeatOptions} onChange={setRepeatPattern} className="wide-select" />
          </div>

          <div className="form-row">
            <label>
              <PixelText text="Place" />
            </label>
            <PixelInput 
              placeholder="Location..." 
              value={location}
              onChange={setLocation}
              className="flex-1"
            />
          </div>

          <div className="form-row reminders-section">
            <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', marginBottom: '2px' }}>
              <label>
                <PixelText text="Reminders" />
              </label>
              {reminders.length < 5 && (
                <button className="reminder-btn add-reminder-btn" onClick={addReminder}>
                  <PixelText text="+" />
                </button>
              )}
            </div>
            {reminders.map(r => (
              <div key={r.id} className="reminder-complex-item">
                <div className="reminder-inputs">
                  <div className="unit-select">
                    <PixelText text="D" shiftY={2} />
                    <RetroSelect value={r.days} options={durDayOptions} onChange={(v) => updateReminder(r.id, { days: v })} />
                  </div>
                  <div className="unit-select">
                    <PixelText text="H" shiftY={2} />
                    <RetroSelect value={r.hours} options={hourOptions} onChange={(v) => updateReminder(r.id, { hours: v })} />
                  </div>
                  <div className="unit-select">
                    <PixelText text="M" shiftY={2} />
                    <RetroSelect value={r.mins} options={minOptions} onChange={(v) => updateReminder(r.id, { mins: v })} />
                  </div>
                  <div className="unit-select">
                    <button 
                      className="toggle-btn" 
                      onClick={() => updateReminder(r.id, { direction: r.direction === 'before' ? 'after' : 'before' })}
                      style={{ width: '42px', height: '9px', padding: 0 }}
                    >
                      <PixelText text={r.direction.toUpperCase()} />
                    </button>
                  </div>
                </div>
                <button className="reminder-btn danger" onClick={() => removeReminder(r.id)}>
                  <PixelText text="X" />
                </button>
              </div>
            ))}
            {reminders.length === 0 && <PixelText text="No reminders" color="#888" />}
          </div>
        </div>

        <div className="modal-footer" style={{ display: 'flex', justifyContent: 'space-between', width: '100%', padding: '4px 6px 4px 2px' }}>
          <div style={{ display: 'flex', gap: '4px' }}>
            <button onClick={onClose}>
              <PixelText text="Cancel" />
            </button>
            {onShowLess && (
              <button onClick={() => onShowLess(title)}>
                <PixelText text="Less" />
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

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { PixelText } from './PixelText';
import { PixelInput } from './PixelInput';
import { CalendarEvent, EventReminder } from '../types';
import { RetroSelect } from './RetroSelect';

interface EditEventModalProps {
  initialDate: Date;
  eventToEdit?: CalendarEvent;
  onSave: (eventData: Partial<CalendarEvent>) => void;
  onClose: () => void;
  onShowLess?: () => void;
}

const COLORS = ['#ff9292', '#83b8f4', '#afe5ad', '#f2ee97', '#ecb3d2'];

export function EditEventModal({ initialDate, eventToEdit, onSave, onClose, onShowLess }: EditEventModalProps) {
  const [title, setTitle] = useState(eventToEdit?.title || '');
  
  const startD = eventToEdit ? eventToEdit.date : initialDate;
  const [hour, setHour] = useState(startD.getHours().toString().padStart(2, '0'));
  const [minute, setMinute] = useState(Math.round(startD.getMinutes() / 5 * 5).toString().padStart(2, '0'));
  
  const initialDuration = eventToEdit?.durationMinutes || 60;
  const [durDays, setDurDays] = useState(Math.floor(initialDuration / 1440).toString());
  const [durHours, setDurHours] = useState(Math.floor((initialDuration % 1440) / 60).toString());
  const [durMins, setDurMins] = useState((initialDuration % 60).toString());

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
    
    const eventDate = new Date(startD);
    eventDate.setHours(parseInt(hour, 10));
    eventDate.setMinutes(parseInt(minute, 10));
    
    const totalDuration = (parseInt(durDays) * 1440) + (parseInt(durHours) * 60) + parseInt(durMins);

    const processedReminders: EventReminder[] = reminders.map(r => {
      const total = (parseInt(r.days) * 1440) + (parseInt(r.hours) * 60) + parseInt(r.mins);
      return {
        id: r.id,
        minutesBefore: r.direction === 'after' ? -total : total
      };
    });
    
    onSave({
      title,
      date: eventDate,
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

  const dayOptions = Array.from({ length: 31 }).map((_, i) => i.toString());
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
      <div className="modal-content edit-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <PixelText text={`Edit Event - ${format(startD, 'dd. MMM yyyy')}`} color="var(--bg-color)" />
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

          <div className="form-row">
            <label>
              <PixelText text="Length" />
            </label>
            <div className="multi-select-row" style={{ marginTop: '-4px' }}>
              <div className="unit-select">
                <PixelText text="D" />
                <RetroSelect value={durDays} options={dayOptions} onChange={setDurDays} />
              </div>
              <div className="unit-select">
                <PixelText text="H" />
                <RetroSelect value={durHours} options={hourOptions} onChange={setDurHours} />
              </div>
              <div className="unit-select">
                <PixelText text="M" />
                <RetroSelect value={durMins} options={minOptions} onChange={setDurMins} />
              </div>
            </div>
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
                    <PixelText text="D" />
                    <RetroSelect value={r.days} options={dayOptions} onChange={(v) => updateReminder(r.id, { days: v })} />
                  </div>
                  <div className="unit-select">
                    <PixelText text="H" />
                    <RetroSelect value={r.hours} options={hourOptions} onChange={(v) => updateReminder(r.id, { hours: v })} />
                  </div>
                  <div className="unit-select">
                    <PixelText text="M" />
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
              <button onClick={onShowLess}>
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

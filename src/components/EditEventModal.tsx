import { useState, useEffect } from 'react';
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
  
  const [durationMinutes, setDurationMinutes] = useState((eventToEdit?.durationMinutes || 60).toString());
  const [repeatPattern, setRepeatPattern] = useState(eventToEdit?.repeatPattern || 'none');
  const [location, setLocation] = useState(eventToEdit?.location || '');
  const [reminders, setReminders] = useState<EventReminder[]>(eventToEdit?.reminders || []);
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
    
    onSave({
      title,
      date: eventDate,
      durationMinutes: parseInt(durationMinutes, 10),
      repeatPattern: repeatPattern as CalendarEvent['repeatPattern'],
      location,
      reminders,
      color
    });
  };

  const addReminder = () => {
    if (reminders.length >= 5) return;
    setReminders([...reminders, { id: Math.random().toString(36).substring(7), minutesBefore: 15 }]);
  };

  const updateReminder = (id: string, mins: number) => {
    setReminders(reminders.map(r => r.id === id ? { ...r, minutesBefore: mins } : r));
  };

  const removeReminder = (id: string) => {
    setReminders(reminders.filter(r => r.id !== id));
  };

  const durationOptions = [
    { label: '15m', value: '15' },
    { label: '30m', value: '30' },
    { label: '45m', value: '45' },
    { label: '1h', value: '60' },
    { label: '1.5h', value: '90' },
    { label: '2h', value: '120' },
    { label: '3h', value: '180' },
    { label: 'All Day', value: '1440' }
  ];

  const repeatOptions = [
    { label: 'None', value: 'none' },
    { label: 'Daily', value: 'daily' },
    { label: 'Weekly', value: 'weekly' },
    { label: 'Monthly', value: 'monthly' },
    { label: 'Yearly', value: 'yearly' }
  ];

  const reminderOptions = [
    { label: '5m before', value: '5' },
    { label: '10m before', value: '10' },
    { label: '15m before', value: '15' },
    { label: '30m before', value: '30' },
    { label: '1h before', value: '60' },
    { label: '2h before', value: '120' },
    { label: '1d before', value: '1440' }
  ];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content edit-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">Edit Event</div>
        
        <div className="modal-body scrollable-body">
          <input 
            className="retro-input block" 
            placeholder="Event Title" 
            value={title}
            onChange={e => setTitle(e.target.value)}
            autoFocus
          />
          
          <div className="form-row">
            <label>Time</label>
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
            <label>Length</label>
            <RetroSelect value={durationMinutes} options={durationOptions} onChange={setDurationMinutes} />
          </div>

          <div className="form-row">
            <label>Repeat</label>
            <RetroSelect value={repeatPattern} options={repeatOptions} onChange={setRepeatPattern} />
          </div>

          <div className="form-row">
            <label>Place</label>
            <input 
              className="retro-input flex-1" 
              placeholder="Location..." 
              value={location}
              onChange={e => setLocation(e.target.value)}
            />
          </div>

          <div className="form-row reminders-section">
            <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', marginBottom: '2px' }}>
              <label>Reminders</label>
              {reminders.length < 5 && <button className="reminder-btn" onClick={addReminder}>+</button>}
            </div>
            {reminders.map(r => (
              <div key={r.id} className="reminder-item" style={{ display: 'flex', gap: '4px', marginBottom: '4px' }}>
                <RetroSelect 
                  value={r.minutesBefore.toString()} 
                  options={reminderOptions} 
                  onChange={(v) => updateReminder(r.id, parseInt(v))} 
                />
                <button className="reminder-btn danger" onClick={() => removeReminder(r.id)}>X</button>
              </div>
            ))}
            {reminders.length === 0 && <span className="muted-text">No reminders</span>}
          </div>
        </div>

        <div className="modal-footer" style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
          <div style={{ display: 'flex', gap: '4px' }}>
            <button onClick={onClose}>Cancel</button>
            {onShowLess && <button onClick={onShowLess}>Show Less</button>}
          </div>
          <button className="primary" onClick={handleSave}>Save</button>
        </div>
      </div>
    </div>
  );
}

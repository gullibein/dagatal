import { useEffect, useState, useRef } from 'react';
import { PixelText } from './components/PixelText';
import { CalendarView } from './components/CalendarView';
import { EventModal } from './components/EventModal';
import { EditEventModal } from './components/EditEventModal';
import { CalendarEvent } from './types';
import './index.css';

function App() {
  const [scale, setScale] = useState(1);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Custom cursor state
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  // App State
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | undefined>(undefined);
  
  const [contextMenu, setContextMenu] = useState<{ x: number, y: number, date: Date, event?: CalendarEvent } | null>(null);
  const [isMouseInside, setIsMouseInside] = useState(false);

  const handleAddEventClick = (date: Date) => {
    setSelectedDate(date);
    setEditingEvent(undefined);
    setShowModal(true);
    setContextMenu(null);
  };

  const handleEventRightClick = (e: React.MouseEvent, event: CalendarEvent) => {
    setContextMenu({ x: mousePos.x, y: mousePos.y, date: event.date, event });
  };

  const handleSaveEvent = (title: string, date: Date, color: string) => {
    if (editingEvent) {
      setEvents(events.map(ev => ev.id === editingEvent.id ? { ...ev, title, date, color } : ev));
    } else {
      const newEvent: CalendarEvent = {
        id: Math.random().toString(36).substring(7),
        title,
        date,
        color,
        durationMinutes: 60
      };
      setEvents([...events, newEvent]);
    }
    setShowModal(false);
  };

  const handleSaveAdvancedEvent = (eventData: Partial<CalendarEvent>) => {
    if (editingEvent) {
      setEvents(events.map(ev => ev.id === editingEvent.id ? { ...ev, ...eventData } : ev));
    } else {
      const newEvent: CalendarEvent = {
        id: Math.random().toString(36).substring(7),
        title: eventData.title || 'Event',
        date: eventData.date || new Date(),
        durationMinutes: eventData.durationMinutes || 60,
        repeatPattern: eventData.repeatPattern || 'none',
        location: eventData.location,
        reminders: eventData.reminders,
        color: 'var(--accent-color)'
      };
      setEvents([...events, newEvent]);
    }
    setShowEditModal(false);
  };
  
  const [activeAlarms, setActiveAlarms] = useState<{ id: string; eventTitle: string; message: string }[]>([]);

  useEffect(() => {
    const checkAlarms = () => {
      const now = new Date();
      const triggered: { id: string; eventTitle: string; message: string }[] = [];
      
      events.forEach(e => {
        if (!e.reminders) return;
        e.reminders.forEach(r => {
          const alarmTime = new Date(e.date.getTime() - r.minutesBefore * 60000);
          // Check if alarm time is within the last minute (to avoid spamming or missing)
          const diffMs = now.getTime() - alarmTime.getTime();
          if (diffMs >= 0 && diffMs < 60000) {
            const min = r.minutesBefore;
            const msg = min >= 60 ? `${min / 60} hour(s)` : `${min} minute(s)`;
            triggered.push({
              id: `${e.id}-${r.id}`,
              eventTitle: e.title,
              message: msg
            });
          }
        });
      });

      if (triggered.length > 0) {
        setActiveAlarms(prev => [...prev, ...triggered]);
      }
    };

    const interval = setInterval(checkAlarms, 60000); // Check every minute
    checkAlarms(); // Check on mount
    return () => clearInterval(interval);
  }, [events]);

  const dismissAlarm = (id: string) => {
    setActiveAlarms(prev => prev.filter(a => a.id !== id));
  };

  useEffect(() => {
    const handleResize = () => {
      const dpr = window.devicePixelRatio || 1;
      const windowWidth = window.innerWidth;
      const windowHeight = window.innerHeight;
      
      const maxPhysicalScaleX = Math.floor((windowWidth * dpr) / 356);
      const maxPhysicalScaleY = Math.floor((windowHeight * dpr) / 200);
      let physicalScale = Math.min(maxPhysicalScaleX, maxPhysicalScaleY);
      
      if (physicalScale < 1) physicalScale = 1;

      // The exact CSS scale needed to achieve integer physical pixels
      const exactCssScale = physicalScale / dpr;

      setScale(exactCssScale);

      // Force strict integer PHYSICAL positioning to prevent sub-pixel blurring
      if (containerRef.current) {
        const scaledWidth = 356 * exactCssScale;
        const scaledHeight = 200 * exactCssScale;
        
        // Logical centering
        let left = (windowWidth - scaledWidth) / 2;
        let top = (windowHeight - scaledHeight) / 2;
        
        // Snap container to EXACT physical monitor pixels
        left = Math.round(left * dpr) / dpr;
        top = Math.round(top * dpr) / dpr;
        
        containerRef.current.style.position = 'absolute';
        containerRef.current.style.left = `${left}px`;
        containerRef.current.style.top = `${top}px`;
      }
    };

    window.addEventListener('resize', handleResize);
    handleResize(); // Initial call

    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const xRaw = (e.clientX - rect.left) / scale;
        const yRaw = (e.clientY - rect.top) / scale;
        
        const inside = xRaw >= 0 && xRaw < 356 && yRaw >= 0 && yRaw < 200;
        setIsMouseInside(inside);

        const x = Math.floor(xRaw);
        const y = Math.floor(yRaw);
        
        const clampedX = Math.max(0, Math.min(355, x));
        const clampedY = Math.max(0, Math.min(199, y));
        setMousePos({ x: clampedX, y: clampedY });
      } else {
        setIsMouseInside(false);
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [scale]);

  return (
    <div className="app-wrapper">
      <div 
        ref={containerRef}
        className="game-container" 
        style={{ transform: `scale(${scale})` }}
      >
        {isMouseInside && (
          <canvas 
            className="custom-cursor" 
            width={8} 
            height={8}
            style={{ 
              left: `${mousePos.x}px`, 
              top: `${mousePos.y}px`,
              position: 'absolute',
              zIndex: 1000,
              pointerEvents: 'none'
            }} 
            ref={canvas => {
              if (canvas) {
                const ctx = canvas.getContext('2d');
                if (ctx) {
                  const cursorData = [[1,1,1,1,0,0,0,0],[1,1,1,0,0,0,0,0],[1,1,1,1,0,0,0,0],[1,0,1,1,1,0,0,0],[0,0,0,1,0,0,0,0],[0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0]];
                  ctx.clearRect(0, 0, 8, 8);
                  ctx.fillStyle = 'black';
                  cursorData.forEach((row, r) => {
                    row.forEach((val, c) => {
                      if (val) ctx.fillRect(c, r, 1, 1);
                    });
                  });
                }
              }
            }}
          />
        )}
        
        <CalendarView
          events={events}
          onAddEventClick={handleAddEventClick}
          onRightClick={handleAddEventClick}
          onEventRightClick={handleEventRightClick}
          onUpdateEvent={(updatedEvent) => {
            setEvents(events.map(ev => ev.id === updatedEvent.id ? updatedEvent : ev));
          }}
          mousePos={mousePos}
          hideHoverLine={showModal || showEditModal}
        />

        {contextMenu && (
          <div className="context-menu-overlay" onClick={() => setContextMenu(null)}>
            <div 
              className="context-menu" 
              style={{ left: `${contextMenu.x}px`, top: `${contextMenu.y}px` }}
              onClick={e => e.stopPropagation()}
            >
              {contextMenu.event && (
                <div 
                  className="context-menu-item" 
                  onClick={() => {
                    setEditingEvent(contextMenu.event);
                    setSelectedDate(contextMenu.event!.date);
                    setShowEditModal(true);
                    setContextMenu(null);
                  }}
                >
                  <PixelText text="Edit" />
                </div>
              )}
              <div 
                className="context-menu-item" 
                onClick={() => {
                  handleAddEventClick(contextMenu.date);
                }}
              >
                <PixelText text="Add New" />
              </div>
            </div>
          </div>
        )}

        {showModal && (
          <EventModal 
            initialDate={selectedDate}
            onSave={handleSaveEvent}
            onClose={() => setShowModal(false)}
            onEdit={() => {
              setShowModal(false);
              setShowEditModal(true);
            }}
          />
        )}

        {showEditModal && (
          <EditEventModal 
            initialDate={selectedDate}
            eventToEdit={editingEvent}
            onSave={handleSaveAdvancedEvent}
            onClose={() => setShowEditModal(false)}
            onShowLess={() => {
              setShowEditModal(false);
              setShowModal(true);
            }}
          />
        )}

        {/* Alarms Overlay */}
        {activeAlarms.length > 0 && (
          <div className="alarms-overlay">
            {activeAlarms.map(alarm => (
              <div key={alarm.id} className="alarm-box">
                <div className="alarm-title">
                  <PixelText text="Reminder" color="var(--accent-color)" />
                </div>
                <div className="alarm-text">
                  <PixelText text={`${alarm.eventTitle.substring(0, 20)} in ${alarm.message}`} />
                </div>
                <button className="primary block" onClick={() => dismissAlarm(alarm.id)}>
                  <PixelText text="Dismiss" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default App;

import { useEffect, useState, useRef } from 'react';
import { PixelText } from './components/PixelText';
import { CalendarView } from './components/CalendarView';
import { EventModal } from './components/EventModal';
import { EditEventModal } from './components/EditEventModal';
import { Holiday, CalendarEvent, ViewMode } from './types';
import './index.css';
import { db } from './lib/instant';
import { id } from '@instantdb/react';
import { AuthModal } from './components/AuthModal';
import { SettingsModal } from './components/SettingsModal';
import { getIcelandicHolidays } from './lib/holidays';

export const COLORS = ['#ff9292', '#83b8f4', '#afe5ad', '#f2ee97', '#ecb3d2', '#ffd1a9'];

function App() {
  const [scale, setScale] = useState(1);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Custom cursor state
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  // App State
  const { isLoading, error, data } = db.useQuery({ events: {} });
  const events: CalendarEvent[] = (data?.events as any[])?.map(e => ({
    ...e,
    date: new Date(e.date) // Ensure date is a Date object
  })) || [];

  const [showModal, setShowModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showHolidays, setShowHolidays] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>('month');
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | undefined>(undefined);

  const holidays: Holiday[] = showHolidays ? getIcelandicHolidays(selectedDate.getFullYear()) : [];
  
  const [contextMenu, setContextMenu] = useState<{ 
    x: number, 
    y: number, 
    date: Date, 
    event?: CalendarEvent,
    selection?: { start: Date, end: Date }
  } | null>(null);
  const [isMouseInside, setIsMouseInside] = useState(false);
  const [draftTitle, setDraftTitle] = useState('');
  const [draftColor, setDraftColor] = useState<string>(COLORS[0]);
  const [settingsMenu, setSettingsMenu] = useState<{ x: number, y: number } | null>(null);
  const [holidayTooltip, setHolidayTooltip] = useState<string | null>(null);
  const tooltipTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleHolidayHover = (name: string | null) => {
    if (tooltipTimer.current) clearTimeout(tooltipTimer.current);
    
    if (name) {
      tooltipTimer.current = setTimeout(() => {
        setHolidayTooltip(name);
      }, 1400);
    } else {
      setHolidayTooltip(null);
    }
  };

  const { user: currentUser } = db.useAuth();

  const handleAddEventClick = (date: Date, duration?: number) => {
    setSelectedDate(date);
    setEditingEvent(undefined);
    setDraftTitle('');
    setDraftDuration(duration);
    // Pick a random color for new events
    const randomColor = COLORS[Math.floor(Math.random() * COLORS.length)];
    setDraftColor(randomColor);
    setShowModal(true);
    setContextMenu(null);
    setCurrentSelection(null); // Clear selection when modal opens
  };

  const [draftDuration, setDraftDuration] = useState<number | undefined>(undefined);
  const [currentSelection, setCurrentSelection] = useState<{ start: Date, end: Date } | null>(null);

  const handleSelectionComplete = (selection: { start: Date, end: Date }, x: number, y: number) => {
    // Show context menu with selection info
    setCurrentSelection(selection);
    setContextMenu({ x, y, date: selection.start, selection });
  };

  const handleEventRightClick = (_e: React.MouseEvent, event: CalendarEvent, hoveredDate: Date) => {
    setContextMenu({ x: mousePos.x, y: mousePos.y, date: hoveredDate, event });
  };

  const handleSaveEvent = (title: string, date: Date, color: string, duration?: number) => {
    if (editingEvent) {
      db.transact(db.tx.events[editingEvent.id].update({
        title,
        date: date.getTime(),
        color,
        durationMinutes: duration || editingEvent.durationMinutes
      }));
    } else {
      db.transact(db.tx.events[id()].update({
        title,
        date: date.getTime(),
        color,
        durationMinutes: duration !== undefined ? duration : (draftDuration || 60)
      }));
    }
    setShowModal(false);
    setDraftDuration(undefined);
    setCurrentSelection(null);
  };

  const handleSaveAdvancedEvent = (eventData: Partial<CalendarEvent>) => {
    if (editingEvent) {
      const updateData: any = { ...eventData };
      if (eventData.date) updateData.date = eventData.date.getTime();
      db.transact(db.tx.events[editingEvent.id].update(updateData));
    } else {
      db.transact(db.tx.events[id()].update({
        title: eventData.title || 'Event',
        date: (eventData.date || new Date()).getTime(),
        durationMinutes: eventData.durationMinutes || draftDuration || 60,
        repeatPattern: eventData.repeatPattern || 'none',
        location: eventData.location,
        reminders: eventData.reminders,
        color: eventData.color || COLORS[0]
      }));
    }
    setShowEditModal(false);
    setDraftDuration(undefined);
    setCurrentSelection(null);
  };

  const handleDeleteEvent = (eventId: string) => {
    db.transact(db.tx.events[eventId].delete());
    setContextMenu(null);
  };

  const handleSettingsClick = (x: number, y: number) => {
    setSettingsMenu({ x, y });
    setContextMenu(null);
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

    const interval = setInterval(checkAlarms, 60000);
    checkAlarms();
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
      const exactCssScale = physicalScale / dpr;

      setScale(exactCssScale);
      document.documentElement.style.setProperty('--app-scale', exactCssScale.toString());

      if (containerRef.current) {
        const scaledWidth = 356 * exactCssScale;
        const scaledHeight = 200 * exactCssScale;
        let left = (windowWidth - scaledWidth) / 2;
        let top = (windowHeight - scaledHeight) / 2;
        left = Math.round(left * dpr) / dpr;
        top = Math.round(top * dpr) / dpr;
        
        containerRef.current.style.position = 'absolute';
        containerRef.current.style.left = `${left}px`;
        containerRef.current.style.top = `${top}px`;
      }
    };

    window.addEventListener('resize', handleResize);
    handleResize();
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

  const tooltipRef = useRef<HTMLDivElement>(null);
  const [tooltipOffset, setTooltipOffset] = useState(0);

  useEffect(() => {
    if (holidayTooltip && tooltipRef.current) {
      const rect = tooltipRef.current.getBoundingClientRect();
      const currentScale = scale || 1;
      const normalizedWidth = rect.width / currentScale;
      const right = mousePos.x + normalizedWidth;
      if (right > 356) {
        setTooltipOffset(356 - right - 2); // 2px margin
      } else {
        setTooltipOffset(0);
      }
    }
  }, [holidayTooltip, mousePos.x, scale]);

  return (
    <div className="app-wrapper">
      <div 
        ref={containerRef}
        className="game-container" 
        style={{ transform: `scale(${scale})` }}
      >
        {isLoading ? (
          <div style={{ display: 'flex', flex: 1, height: '100%', alignItems: 'center', justifyContent: 'center', background: '#c0c0c0' }}>
            <PixelText text="Loading..." />
          </div>
        ) : error ? (
          <div style={{ padding: '10px', color: 'red', background: 'var(--bg-color)', height: '100%' }}>
            <PixelText text="Backend Error:" color="red" />
            <br />
            <PixelText text={error.message.substring(0, 50)} color="red" />
            <br />
            <br />
            <PixelText text="Check App ID in src/lib/instant.ts" color="black" />
          </div>
        ) : (
          <>
            {isMouseInside && (
              <canvas 
                className="custom-cursor" 
                width={8} 
                height={8}
                style={{ 
                  left: `${mousePos.x}px`, 
                  top: `${mousePos.y}px`,
                  position: 'absolute',
                  zIndex: 3000,
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
              currentDate={selectedDate}
              setCurrentDate={setSelectedDate}
              viewMode={viewMode}
              setViewMode={setViewMode}
              events={events}
              holidays={holidays}
              onAddEventClick={handleAddEventClick}
              onRightClick={handleAddEventClick}
              onEventRightClick={handleEventRightClick}
              onSelectionComplete={handleSelectionComplete}
              onUpdateEvent={(updatedEvent) => {
                db.transact(db.tx.events[updatedEvent.id].update({
                  ...updatedEvent,
                  date: updatedEvent.date.getTime()
                }));
              }}
              onSettingsClick={handleSettingsClick}
              onHolidayHover={handleHolidayHover}
              selection={currentSelection}
              mousePos={mousePos}
              hideHoverLine={showModal || showEditModal || showAuthModal || showSettingsModal}
            />
          </>
        )}

        {/* Settings Menu */}
        {settingsMenu && (
          <div 
            className="context-menu" 
            style={{ top: `${settingsMenu.y}px`, left: `${settingsMenu.x - 60}px` }}
            onMouseLeave={() => setSettingsMenu(null)}
          >
            <div 
              className={`menu-item ${currentUser ? 'disabled' : ''}`} 
              onClick={() => { if (!currentUser) { setShowAuthModal(true); setSettingsMenu(null); } }}
              style={currentUser ? { cursor: 'default', opacity: 0.5 } : {}}
            >
              <PixelText text="Log In" color={currentUser ? '#888' : 'black'} />
            </div>
            <div className="menu-item" onClick={() => { setShowSettingsModal(true); setSettingsMenu(null); }}>
              <PixelText text="Settings" />
            </div>
          </div>
        )}

        {/* Context Menu */}
        {contextMenu && (
          <div 
            className="context-menu-overlay" 
            onClick={() => {
              setContextMenu(null);
              setCurrentSelection(null);
            }}
          >
            <div 
              className="context-menu" 
              style={{ left: `${contextMenu.x}px`, top: `${contextMenu.y}px` }}
              onClick={e => e.stopPropagation()}
            >
            {/* Event Specific Actions */}
            {contextMenu.event && (
              <>
                <div className="menu-item" onClick={() => {
                  setEditingEvent(contextMenu.event);
                  setShowModal(true);
                  setContextMenu(null);
                }}>
                  <PixelText text="Edit" />
                </div>
                <div className="menu-item" onClick={() => handleDeleteEvent(contextMenu.event!.id)}>
                  <PixelText text="Delete" />
                </div>
                <div style={{ borderTop: '1px solid #999', margin: '1px 0' }} />
              </>
            )}

            {/* Creation Action (for Selection or Event Context) */}
            {contextMenu.selection ? (
              <div 
                className="menu-item" 
                onClick={() => {
                  const dur = Math.round((contextMenu.selection!.end.getTime() - contextMenu.selection!.start.getTime()) / 60000);
                  handleAddEventClick(contextMenu.selection!.start, Math.abs(dur));
                }}
              >
                <PixelText text="Create" />
              </div>
            ) : (
              <div className="menu-item" onClick={() => handleAddEventClick(contextMenu.date)}>
                <PixelText text="Add New" />
              </div>
            )}

            <div style={{ borderTop: '1px solid #999', margin: '1px 0' }} />
            
            <div className="menu-item" onClick={() => {
              setContextMenu(null);
              setCurrentSelection(null);
            }}>
              <PixelText text="Cancel" />
            </div>
            </div>
          </div>
        )}

        {showModal && (
          <EventModal 
            initialDate={selectedDate} 
            initialTitle={draftTitle}
            initialDuration={draftDuration}
            initialColor={draftColor}
            onSave={handleSaveEvent} 
            onClose={() => {
              setShowModal(false);
              setCurrentSelection(null);
            }}
            onEdit={(title, color) => {
              setDraftTitle(title);
              setDraftColor(color || draftColor);
              setShowModal(false);
              setShowEditModal(true);
            }}
          />
        )}

        {showEditModal && (
          <EditEventModal 
            initialDate={selectedDate}
            initialTitle={draftTitle}
            initialDuration={draftDuration}
            initialColor={draftColor}
            eventToEdit={editingEvent}
            onSave={handleSaveAdvancedEvent}
            onClose={() => {
              setShowEditModal(false);
              setCurrentSelection(null);
            }}
            onShowLess={(title, color) => {
              setDraftTitle(title);
              setDraftColor(color || draftColor);
              setShowEditModal(false);
              setShowModal(true);
            }}
          />
        )}

        {showAuthModal && (
          <AuthModal onClose={() => setShowAuthModal(false)} />
        )}

        {showSettingsModal && (
          <SettingsModal 
            onClose={() => setShowSettingsModal(false)} 
            showHolidays={showHolidays}
            setShowHolidays={setShowHolidays}
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
                  <PixelText text={`${alarm.eventTitle.substring(0, 20)} in ${alarm.message}`} forceUppercase={false} />
                </div>
                <button className="primary block" onClick={() => dismissAlarm(alarm.id)}>
                  <PixelText text="Dismiss" />
                </button>
              </div>
            ))}
          </div>
        )}
        {/* Holiday Tooltip */}
        {holidayTooltip && (
          <div 
            ref={tooltipRef}
            className="holiday-tooltip"
            style={{
              left: `${mousePos.x + tooltipOffset}px`,
              top: `${mousePos.y - 12}px`,
              position: 'absolute',
              zIndex: 4000
            }}
          >
            <PixelText text={holidayTooltip} forceUppercase={false} />
          </div>
        )}
      </div>
    </div>
  );
}

export default App;

import { useState, useRef, useEffect } from 'react';
import { PixelText } from './PixelText';
import { ViewMode, CalendarEvent } from '../types';
import { 
  format, addMonths, subMonths, addYears, subYears, 
  addWeeks, subWeeks, addDays, subDays, 
  startOfMonth, endOfMonth, startOfWeek, endOfWeek, 
  eachDayOfInterval, isSameMonth, isSameDay, getDaysInMonth,
  setHours, setMinutes, startOfDay, endOfDay, addMinutes
} from 'date-fns';

export function isEventOnDay(e: CalendarEvent, targetDate: Date) {
  const targetStart = startOfDay(targetDate);
  const targetEnd = endOfDay(targetDate);

  if (!e.repeatPattern || e.repeatPattern === 'none') {
    const eventStart = e.date;
    const eventEnd = addMinutes(e.date, e.durationMinutes || 0);
    // Check for overlap: event starts before day ends AND event ends after day starts
    return eventStart <= targetEnd && eventEnd >= targetStart;
  }
  
  const eventStart = startOfDay(e.date);
  if (targetStart < eventStart) return false;
  
  switch (e.repeatPattern) {
    case 'daily':
      return true;
    case 'weekly':
      return e.date.getDay() === targetDate.getDay();
    case 'monthly':
      return e.date.getDate() === targetDate.getDate();
    case 'yearly':
      return e.date.getMonth() === targetDate.getMonth() && e.date.getDate() === targetDate.getDate();
    default:
      return false;
  }
}

export interface EventLayout {
  event: CalendarEvent;
  leftPct: number;
  widthPct: number;
  zIndex: number;
  startMin: number; // Minutes from midnight
  endMin: number;   // Minutes from midnight
}

export function calculateEventLayouts(events: CalendarEvent[], targetDate: Date): EventLayout[] {
  if (events.length === 0) return [];
  
  const dayStart = startOfDay(targetDate);
  const dayEnd = endOfDay(targetDate);

  const segments = events.map(ev => {
    const eventStart = ev.date;
    const eventEnd = addMinutes(ev.date, ev.durationMinutes || 0);
    
    const displayStart = eventStart < dayStart ? dayStart : eventStart;
    const displayEnd = eventEnd > dayEnd ? dayEnd : eventEnd;
    
    return {
      event: ev,
      startMin: (displayStart.getTime() - dayStart.getTime()) / 60000,
      endMin: (displayEnd.getTime() - dayStart.getTime()) / 60000
    };
  }).filter(s => s.endMin > s.startMin);

  const sortedSegments = [...segments].sort((a, b) => {
    // 1. Primary sort: Absolute start time (ascending)
    // The event that starts later will have a higher index, putting it in a later column (and thus "in front")
    const aAbs = a.event.date.getTime();
    const bAbs = b.event.date.getTime();
    if (aAbs !== bAbs) return aAbs - bAbs;
    
    // 2. Secondary sort: Duration (descending)
    // For events starting at the same time, longer events go in earlier columns (behind)
    const aDur = a.event.durationMinutes || 0;
    const bDur = b.event.durationMinutes || 0;
    if (aDur !== bDur) return bDur - aDur;
    
    // 3. Tertiary sort: Title
    return a.event.title.localeCompare(b.event.title);
  });

  const layouts: EventLayout[] = [];
  let columns: typeof segments[] = [];
  let lastEventEnd = 0;

  const packEvents = () => {
    const numColumns = columns.length;
    columns.forEach((col, colIdx) => {
      col.forEach(s => {
        const widthPct = 100 / numColumns;
        const leftPct = colIdx * widthPct;
        layouts.push({
          event: s.event,
          leftPct: leftPct,
          widthPct: widthPct,
          zIndex: colIdx + 10,
          startMin: s.startMin,
          endMin: s.endMin
        });
      });
    });
    columns = [];
  };

  sortedSegments.forEach(s => {
    if (s.startMin >= lastEventEnd) {
      packEvents();
    }

    let placed = false;
    for (let i = 0; i < columns.length; i++) {
      const col = columns[i];
      const lastSegInCol = col[col.length - 1];
      if (s.startMin >= lastSegInCol.endMin) {
        col.push(s);
        placed = true;
        break;
      }
    }

    if (!placed) {
      columns.push([s]);
    }

    lastEventEnd = Math.max(lastEventEnd, s.endMin);
  });

  packEvents();
  return layouts;
}

interface CalendarViewProps {
  events: CalendarEvent[];
  onAddEventClick: (date: Date) => void;
  onRightClick: (date: Date) => void;
  onEventRightClick?: (e: React.MouseEvent, event: CalendarEvent, hoveredDate: Date) => void;
  onSelectionComplete?: (selection: { start: Date, end: Date }, x: number, y: number) => void;
  onUpdateEvent?: (e: CalendarEvent) => void;
  selection?: { start: Date, end: Date } | null;
  mousePos: { x: number; y: number };
  hideHoverLine?: boolean;
}

export function CalendarView({ events, onAddEventClick, onRightClick, onEventRightClick, onSelectionComplete, onUpdateEvent, selection, mousePos, hideHoverLine }: CalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>('month');
  
  // Selection Internal State (for drag performance)
  const [localSelectionStart, setLocalSelectionStart] = useState<Date | null>(null);
  const [localSelectionEnd, setLocalSelectionEnd] = useState<Date | null>(null);
  const [isSelecting, setIsSelecting] = useState(false);
  const selectionStartRef = useRef<Date | null>(null);
  const selectionEndRef = useRef<Date | null>(null);
  const isSelectingRef = useRef(false);

  // Sync prop selection back to internal if cleared
  useEffect(() => {
    if (!selection) {
      setLocalSelectionStart(null);
      setLocalSelectionEnd(null);
      selectionStartRef.current = null;
      selectionEndRef.current = null;
    }
  }, [selection]);

  const activeSelectionStart = isSelecting ? localSelectionStart : (selection?.start || null);
  const activeSelectionEnd = isSelecting ? localSelectionEnd : (selection?.end || null);
  
  // Day View Zoom State (Pixel-Locked)
  const [isDayZoomed, setIsDayZoomed] = useState(false);
  const [zoomHeight, setZoomHeight] = useState(163 / 48); // Reverted: 163px height for 24h
  const [zoomScroll, setZoomScroll] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  
  // Anchor points for the animation
  const anchorTime = useRef(0);
  const anchorY = useRef(0);
  const dayViewRef = useRef<HTMLDivElement>(null);

  // Drag and Drop State
  const draggingEventId = useRef<string | null>(null);
  const dragStartMouseY = useRef<number>(0);
  const dragStartEventHour = useRef<number>(0);
  const dayViewClickStartTime = useRef<number>(0);
  const dayViewClickStartPos = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Helper to calculate date from mouse pos
  const getDateAtPos = (x: number, y: number): Date | null => {
    // Adjust x, y for calendar-content padding (2px) and top bar (20px)
    const localX = x - 2;
    const localY = y - 22;

    if (viewMode === 'day') {
      const boxTop = 32;
      const boxBottom = 191;
      const clampedY = Math.max(boxTop, Math.min(boxBottom, y));
      const relativeY = clampedY - boxTop + zoomScroll + 3;
      
      let bestH = 0;
      let minDiff = 999;
      const localZoomHeight = zoomHeight;
      for (let step = 0; step <= 24 * 12; step++) {
        const h = step / 12;
        const py = Math.round(h * 2 * localZoomHeight);
        const diff = Math.abs(py - relativeY);
        if (diff < minDiff) { minDiff = diff; bestH = h; }
      }
      
      const h = Math.floor(bestH);
      const m = Math.round((bestH - h) * 60);
      return setMinutes(setHours(startOfDay(currentDate), h), m);
    } else if (viewMode === 'week') {
      const widths = [49, 49, 49, 50, 50, 50, 49];
      let currentLeft = 0;
      let colIndex = -1;
      for (let i = 0; i < widths.length; i++) {
        if (localX >= currentLeft && localX <= currentLeft + widths[i] + 1) { colIndex = i; break; }
        currentLeft += widths[i] + 1;
      }
      if (colIndex === -1) return null;
      
      const boxTop = 37;
      const boxBottom = 194;
      const clampedY = Math.max(boxTop, Math.min(boxBottom, y));
      const relativeY = clampedY - boxTop - 1;
      const localZoomHeight = (boxBottom - boxTop) / 48;
      
      let bestH = 0;
      let minDiff = 999;
      for (let step = 0; step <= 24 * 12; step++) {
        const h = step / 12;
        const py = Math.round(h * 2 * localZoomHeight);
        const diff = Math.abs(py - relativeY);
        if (diff < minDiff) { minDiff = diff; bestH = h; }
      }
      
      const h = Math.floor(bestH);
      const m = Math.round((bestH - h) * 60);
      return setMinutes(setHours(addDays(startOfWeek(currentDate), colIndex), h), m);
    } else if (viewMode === 'month') {
      const widths = [49, 49, 49, 50, 50, 50, 49];
      let currentLeft = 0;
      let col = -1;
      for (let i = 0; i < widths.length; i++) {
        if (localX >= currentLeft && localX <= currentLeft + widths[i] + 1) { col = i; break; }
        currentLeft += widths[i] + 1;
      }
      
      const rowHeight = 26;
      const headerHeight = 12;
      const row = Math.floor((localY - headerHeight) / (rowHeight + 1));
      
      if (col < 0 || col >= 7 || row < 0 || row >= 6) return null;
      
      const monthStart = startOfMonth(currentDate);
      const startDate = startOfWeek(monthStart);
      const day = addDays(startDate, row * 7 + col);
      return setHours(setMinutes(day, 0), 12);
    }
    return null;
  };

  // Drag Math
  useEffect(() => {
    if (draggingEventId.current && onUpdateEvent) {
      const deltaY = mousePos.y - dragStartMouseY.current;
      const localZoomHeight = isDayZoomed ? (163 * 8 / 48) : (163 / 48);
      
      const deltaHours = deltaY / (2 * localZoomHeight);
      const newHourRaw = dragStartEventHour.current + deltaHours;
      
      // Snap to 5-minute increments (1/12 of an hour)
      const snappedHour = Math.round(newHourRaw * 12) / 12;
      
      // Prevent dragging outside 0-24 bounds
      const finalHour = Math.max(0, Math.min(23.9, snappedHour));
      
      const eventToDrag = events.find(e => e.id === draggingEventId.current);
      if (eventToDrag) {
        const h = Math.floor(finalHour);
        const m = Math.round((finalHour - h) * 60);
        
        const newDate = new Date(eventToDrag.date);
        newDate.setHours(h, m);
        
        if (newDate.getTime() !== eventToDrag.date.getTime()) {
          onUpdateEvent({ ...eventToDrag, date: newDate });
        }
      }
    }
  }, [mousePos.y, events, isDayZoomed, onUpdateEvent]);

  // Global Mouse Up & Selection Logic
  useEffect(() => {
    const handleGlobalMouseUp = () => {
      if (isSelectingRef.current && onSelectionComplete && selectionStartRef.current && selectionEndRef.current) {
        const start = selectionStartRef.current < selectionEndRef.current ? selectionStartRef.current : selectionEndRef.current;
        const end = selectionStartRef.current < selectionEndRef.current ? selectionEndRef.current : selectionStartRef.current;
        
        // Only trigger if selection is meaningful
        const diff = Math.abs(end.getTime() - start.getTime());
        if (diff > 5 * 60000 || !isSameDay(start, end)) {
          // Use current mouse pos from ref for accurate menu placement
          onSelectionComplete({ start, end }, mousePosRef.current.x, mousePosRef.current.y);
        } else {
          setLocalSelectionStart(null);
          setLocalSelectionEnd(null);
        }
      }
      setIsSelecting(false);
      isSelectingRef.current = false;
      draggingEventId.current = null;
    };
    window.addEventListener('mouseup', handleGlobalMouseUp);
    return () => window.removeEventListener('mouseup', handleGlobalMouseUp);
  }, [onSelectionComplete]);

  const mousePosRef = useRef(mousePos);
  useEffect(() => { mousePosRef.current = mousePos; }, [mousePos]);

  useEffect(() => {
    if (isSelecting) {
      const currentDate = getDateAtPos(mousePos.x, mousePos.y);
      if (currentDate) {
        setLocalSelectionEnd(currentDate);
        selectionEndRef.current = currentDate;
      }
    }
  }, [mousePos, isSelecting]);

  // Navigation handlers
  const handlePrev = () => {
    switch (viewMode) {
      case 'year': setCurrentDate(subYears(currentDate, 1)); break;
      case 'month': setCurrentDate(subMonths(currentDate, 1)); break;
      case 'week': setCurrentDate(subWeeks(currentDate, 1)); break;
      case 'day': setCurrentDate(subDays(currentDate, 1)); break;
    }
  };

  const handleNext = () => {
    switch (viewMode) {
      case 'year': setCurrentDate(addYears(currentDate, 1)); break;
      case 'month': setCurrentDate(addMonths(currentDate, 1)); break;
      case 'week': setCurrentDate(addWeeks(currentDate, 1)); break;
      case 'day': setCurrentDate(addDays(currentDate, 1)); break;
    }
  };

  const getHeaderTitle = () => {
    switch (viewMode) {
      case 'year': return <PixelText text={format(currentDate, 'yyyy')} noShift />;
      case 'month': return <PixelText text={format(currentDate, 'MMM yyyy')} color="black" noShift />;
      case 'week': 
        return <PixelText text={`Week of ${format(startOfWeek(currentDate), 'MMM d')}`} color="black" noShift />;
      case 'day': 
        const isToday = isSameDay(currentDate, new Date());
        return <PixelText text={format(currentDate, 'MMM d, yyyy')} color={isToday ? '#ff0000' : 'black'} noShift />;
      default: return null;
    }
  };

  // Render different views
  const renderMonthView = () => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart);
    const endDate = endOfWeek(monthEnd);

    const days = eachDayOfInterval({ start: startDate, end: endDate });

    return (
      <div className="grid grid-7 month-grid">
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
          <div key={i} className="day-header">
            <PixelText text={d} />
          </div>
        ))}
        {days.map((day, i) => {
          const isCurrentMonth = isSameMonth(day, monthStart);
          const dayEvents = events.filter(e => isEventOnDay(e, day)).sort((a, b) => {
            const aAbs = a.date.getTime();
            const bAbs = b.date.getTime();
            if (aAbs !== bAbs) return aAbs - bAbs;
            return (b.durationMinutes || 0) - (a.durationMinutes || 0);
          });
                  const isToday = isSameDay(day, new Date()) && isCurrentMonth;
                  const isSelected = activeSelectionStart && activeSelectionEnd && (
                    (day >= startOfDay(activeSelectionStart) && day <= startOfDay(activeSelectionEnd)) ||
                    (day >= startOfDay(activeSelectionEnd) && day <= startOfDay(activeSelectionStart))
                  );

                  return (
                    <div 
                      key={i} 
                      className={`day-cell ${isCurrentMonth ? '' : 'other-month'} ${isSelected ? 'selected' : ''}`}
                      onClick={() => {
                        setCurrentDate(day);
                        setViewMode('day');
                      }}
                      onContextMenu={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        onRightClick(setHours(setMinutes(day, 0), 12));
                      }}
                    >
              <div className="day-number">
                <PixelText 
                  text={format(day, 'd')} 
                  color={isSameDay(day, new Date()) ? '#ff0000' : (isCurrentMonth ? 'black' : '#888')} 
                />
              </div>
              <div className="month-events-list">
                {dayEvents.slice(0, 4).map(e => (
                  <div 
                    key={e.id} 
                    className="month-event-item" 
                    style={{ backgroundColor: e.color || 'var(--accent-color)' }}
                    onContextMenu={(ev) => {
                      ev.preventDefault();
                      ev.stopPropagation();
                      if (onEventRightClick) onEventRightClick(ev, e, e.date);
                    }}
                  >
                    <PixelText text={e.title.substring(0, 7)} color="black" />
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const renderYearView = () => {
    const year = currentDate.getFullYear();
    const months = Array.from({ length: 12 }, (_, i) => new Date(year, i, 1));

    return (
      <div className="grid grid-year year-grid">
        {months.map((month, i) => {
          const monthStart = startOfMonth(month);
          const startDate = startOfWeek(monthStart);
          const days = Array.from({ length: 42 }, (_, di) => addDays(startDate, di));

          const row = Math.floor(i / 4);
          const col = i % 4;
          const gridCol = col * 2 + 1;
          const gridRow = row * 2 + 1;

          return (
            <div 
              key={i} 
              className="month-cell"
              style={{ gridColumn: gridCol, gridRow: gridRow }}
              onClick={() => {
                setCurrentDate(month);
                setViewMode('month');
              }}
            >
              <div className="month-name">
                <PixelText text={format(month, 'MMM')} />
              </div>
              <div className="mini-month-grid">
                {days.map((day, di) => {
                  const isCurrentMonth = isSameMonth(day, monthStart);
                  const dayEvents = isCurrentMonth 
                    ? events.filter(e => isEventOnDay(e, day)).sort((a, b) => {
                        const aAbs = a.date.getTime();
                        const bAbs = b.date.getTime();
                        if (aAbs !== bAbs) return aAbs - bAbs;
                        return (b.durationMinutes || 0) - (a.durationMinutes || 0);
                      }) 
                    : [];
                  const firstEvent = dayEvents[0];
                  
                  const isToday = isSameDay(day, new Date()) && isCurrentMonth;
                  const isSelected = activeSelectionStart && activeSelectionEnd && (
                    (day >= startOfDay(activeSelectionStart) && day <= startOfDay(activeSelectionEnd)) ||
                    (day >= startOfDay(activeSelectionEnd) && day <= startOfDay(activeSelectionStart))
                  );
                  
                  return (
                    <div 
                      key={di} 
                      className={`tiny-day ${isCurrentMonth ? '' : 'other-month'} ${firstEvent ? 'has-event' : ''} ${isToday ? 'is-today' : ''} ${isSelected ? 'selected' : ''}`} 
                      style={{
                        backgroundColor: firstEvent ? (firstEvent.color || 'var(--accent-color)') : undefined
                      }}
                      onContextMenu={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        onRightClick(setHours(setMinutes(day, 0), 12));
                      }}
                    />
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const renderWeekView = () => {
    const start = startOfWeek(currentDate);
    const end = endOfWeek(currentDate);
    const days = eachDayOfInterval({ start, end });

    return (
      <div className="grid grid-7 week-grid">
        {days.map((day, i) => {
          const dayEvents = events.filter(e => isEventOnDay(e, day));
          return (
            <div key={i} className="week-day-col">
              <div className="week-day-header">
                <PixelText 
                  text={format(day, 'EEE d')} 
                  color={isSameDay(day, new Date()) ? '#ff0000' : 'black'} 
                />
              </div>
              <div 
                className="week-day-body"
                onClick={() => {
                  setCurrentDate(day);
                  setViewMode('day');
                }}
              >
                {/* Selection Overlay in Week View */}
                {activeSelectionStart && activeSelectionEnd && (
                  (() => {
                    const start = activeSelectionStart < activeSelectionEnd ? activeSelectionStart : activeSelectionEnd;
                    const end = activeSelectionStart < activeSelectionEnd ? activeSelectionEnd : activeSelectionStart;
                    
                    if (day >= startOfDay(start) && day <= startOfDay(end)) {
                      const isFirstDay = isSameDay(day, start);
                      const isLastDay = isSameDay(day, end);
                      
                      const h1 = isFirstDay ? (start.getHours() + start.getMinutes() / 60) : 0;
                      const h2 = isLastDay ? (end.getHours() + end.getMinutes() / 60) : 24;
                      
                      const localZoomHeight = (194 - 37) / 48;
                      const y1 = Math.round(h1 * 2 * localZoomHeight);
                      const y2 = Math.round(h2 * 2 * localZoomHeight);
                      
                      return (
                        <div 
                          className="selection-overlay"
                          style={{
                            top: `${Math.min(y1, y2)}px`,
                            height: `${Math.max(2, Math.abs(y1 - y2))}px`,
                            left: 0,
                            right: 0
                          }}
                        />
                      );
                    }
                    return null;
                  })()
                )}

                {calculateEventLayouts(dayEvents, day).map(layout => {
                  const e = layout.event;
                  const top = Math.round((layout.startMin / 60) * (157 / 24));
                  const bottom = Math.round((layout.endMin / 60) * (157 / 24));
                  const height = Math.max(7, bottom - top);
                  return (
                    <div 
                      key={e.id} 
                      className="event-item" 
                      style={{ 
                        top: `${top}px`,
                        height: `${height}px`,
                        left: `calc(${layout.leftPct}% + 1px)`,
                        width: `calc(${layout.widthPct}% - 2px)`,
                        backgroundColor: e.color || 'var(--accent-color)'
                      }}
                      title={`${format(e.date, 'HH:mm')} - ${e.title}`}
                    >
                      <PixelText text={e.title.substring(0, 6)} color="black" />
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const renderDayView = () => {
    const dayEvents = events.filter(e => isEventOnDay(e, currentDate));
    
    // Always render 48 slots (30 mins each)
    const timeSlots = Array.from({ length: 48 }, (_, i) => i * 0.5);

    return (
      <div 
        ref={dayViewRef}
        className={`day-view day-view-timeline ${isDayZoomed ? 'is-zoomed' : ''}`} 
        style={{ height: '173px', marginTop: '2px', overflow: 'hidden', paddingTop: '6px' }}
      >
        <div 
          className="day-view-inner"
          style={{ 
            transform: `translateY(${-zoomScroll}px)`,
            position: 'relative'
          }}
        >
          {timeSlots.map(time => {
            // Use simple integer distribution for slots to keep it clean
            const slotIndex = time * 2;
            const slotH = Math.round((slotIndex + 1) * zoomHeight) - Math.round(slotIndex * zoomHeight);
            
            const isBoundary = slotIndex % 2 === 0;

            // Grid-aligned label position
            const getLabelOffset = (t: number) => 0; // No more manual smoothing

            return (
              <div 
                key={time} 
                className="timeline-slot" 
                style={{ height: `${slotH}px` }}
              >
                <div className="timeline-hour">
                  {(!isDayZoomed && (time % 2 === 1) && isBoundary) && (
                    <div className="hour-label-locked" style={{ transform: `translateY(calc(-50% + ${getLabelOffset(time)}px))` }}>
                      <PixelText text={`${Math.floor(time)}:00`} color="#555" />
                    </div>
                  )}
                  {(isDayZoomed && isBoundary) && (
                    <div className="hour-label-locked" style={{ transform: 'translateY(-50%)' }}>
                      <PixelText text={`${Math.floor(time)}:00`} color="#555" />
                    </div>
                  )}
                  {(isDayZoomed && !isBoundary && zoomHeight > 10) && (
                    <div className="hour-label-locked" style={{ transform: 'translateY(-50%)' }}>
                      <PixelText text={`${Math.floor(time)}:30`} color="#555" />
                    </div>
                  )}
                </div>
                <div className="timeline-events-placeholder" />
              </div>
            );
          })}

          {/* Selection Overlay */}
          {activeSelectionStart && activeSelectionEnd && isSameDay(activeSelectionStart, currentDate) && isSameDay(activeSelectionEnd, currentDate) && (
            (() => {
              const h1 = activeSelectionStart.getHours() + activeSelectionStart.getMinutes() / 60;
              const h2 = activeSelectionEnd.getHours() + activeSelectionEnd.getMinutes() / 60;
              const y1 = Math.round(h1 * 2 * zoomHeight);
              const y2 = Math.round(h2 * 2 * zoomHeight);
              return (
                <div 
                  className="selection-overlay"
                  style={{
                    top: `${Math.min(y1, y2)}px`,
                    height: `${Math.max(2, Math.abs(y1 - y2))}px`,
                    left: '32px',
                    width: '288px'
                  }}
                />
              );
            })()
          )}

          {/* Absolute Events Layer */}
          <div className="day-events-layer">
            {calculateEventLayouts(dayEvents, currentDate).map(layout => {
              const e = layout.event;
              const startH = layout.startMin / 60;
              const endH = layout.endMin / 60;
              // Precise top calculation matching slot boundaries, shifted 2px up to sync with labels
              const baseTop = Math.round(startH * 2 * zoomHeight);
              const top = baseTop - 2;
              const height = Math.round(endH * 2 * zoomHeight) - baseTop;

              return (
                <div 
                  key={e.id} 
                  className="day-event-item" 
                  style={{ 
                    top: `${top}px`,
                    height: `${Math.max(8, height)}px`,
                    left: `calc(${layout.leftPct}% + 2px)`,
                    width: `calc(${layout.widthPct}% - 6px)`,
                    zIndex: layout.zIndex,
                    backgroundColor: e.color || 'var(--accent-color)',
                    cursor: 'none'
                  }}
                >
                    <div className="event-time">
                      <PixelText text={format(e.date, 'HH:mm')} color="#444" />
                    </div>
                    <div className="event-title">
                      <PixelText text={e.title.substring(0, 20)} color="black" />
                    </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  // Hover line math (calculated at the container level)
  let showLine = false;
  let timeStr = "";
  let hoverLineY = 0;
  
  const handleDayMouseDown = (e: React.MouseEvent) => {
    if (isAnimating || e.button !== 0) return;
    
    // Ignore clicks in the top-bar (y < 20 approx)
    if (mousePos.y < 22) return;
    
    e.preventDefault(); // Prevent text selection and native drag
    dayViewClickStartPos.current = { x: mousePos.x, y: mousePos.y };
    dayViewClickStartTime.current = performance.now();
    
    // Clear selection
    setLocalSelectionStart(null);
    setLocalSelectionEnd(null);

    // Hit test for drag and drop
    let clickedEvent: CalendarEvent | undefined = undefined;
    if (viewMode === 'day') {
      const boxTop = 32;
      const boxBottom = 191;
      const clampedY = Math.max(boxTop - 3, Math.min(boxBottom + 3, mousePos.y));
      const mouseInnerY = clampedY - boxTop + zoomScroll + 3;
      
      const dayEvents = events.filter(ev => isEventOnDay(ev, currentDate));
      const layouts = calculateEventLayouts(dayEvents, currentDate);
      
      for (let i = layouts.length - 1; i >= 0; i--) {
        const layout = layouts[i];
        const ev = layout.event;
        
        const startH = layout.startMin / 60;
        const endH = layout.endMin / 60;
        const baseTop = Math.round(startH * 2 * zoomHeight);
        const top = baseTop - 2;
        const bottom = top + Math.max(8, Math.round(endH * 2 * zoomHeight) - baseTop);
        
        const layerWidth = 288; // 320 - 32 (hour column)
        const eventLeft = 32 + (layout.leftPct / 100) * layerWidth + 2;
        const eventRight = 32 + ((layout.leftPct + layout.widthPct) / 100) * layerWidth - 4; // -4 accounts for the 6px total gap (2px left, 4px right)
        
        if (mouseInnerY >= top && mouseInnerY <= bottom && mousePos.x >= eventLeft && mousePos.x <= eventRight) {
          clickedEvent = ev;
          break;
        }
      }
    } else if (viewMode === 'week') {
      // Logic for week view hit testing
      const widths = [49, 49, 49, 50, 50, 50, 49];
      let currentLeft = 0;
      let colIndex = -1;
      for (let i = 0; i < widths.length; i++) {
        if (mousePos.x >= currentLeft && mousePos.x <= currentLeft + widths[i] + 1) { colIndex = i; break; }
        currentLeft += widths[i] + 1;
      }
      if (colIndex !== -1) {
        const targetDate = addDays(startOfWeek(currentDate), colIndex);
        const dayEvents = events.filter(ev => isEventOnDay(ev, targetDate));
        const layouts = calculateEventLayouts(dayEvents, targetDate);
        
        const boxTop = 37;
        const mouseInnerY = mousePos.y - boxTop - 1;
        
        for (let i = layouts.length - 1; i >= 0; i--) {
          const layout = layouts[i];
          const top = Math.round((layout.startMin / 60) * (157 / 24));
          const bottom = Math.round((layout.endMin / 60) * (157 / 24));
          const actualTop = top;
          const actualBottom = Math.max(actualTop + 8, bottom);
          
          if (mouseInnerY >= actualTop && mouseInnerY <= actualBottom) {
            clickedEvent = layout.event;
            break;
          }
        }
      }
    }

    if (clickedEvent) {
      draggingEventId.current = clickedEvent.id;
      dragStartMouseY.current = mousePos.y;
      dragStartEventHour.current = clickedEvent.date.getHours() + clickedEvent.date.getMinutes() / 60;
    } else {
      // Start selection
      setIsSelecting(true);
      isSelectingRef.current = true;
      const start = getDateAtPos(mousePos.x, mousePos.y);
      setLocalSelectionStart(start);
      setLocalSelectionEnd(start);
      selectionStartRef.current = start;
      selectionEndRef.current = start;
    }
  };

  const handleDayMouseUp = (e: React.MouseEvent) => {
    if (isAnimating || e.button !== 0) return;
    
    const deltaX = Math.abs(mousePos.x - dayViewClickStartPos.current.x);
    const deltaY = Math.abs(mousePos.y - dayViewClickStartPos.current.y);
    const deltaTime = performance.now() - dayViewClickStartTime.current;
    
    // Distinguish click from drag/selection
    if (deltaX < 3 && deltaY < 3 && deltaTime < 500) {
      if (viewMode === 'week') {
        // Navigate to day view for the clicked column
        const widths = [49, 49, 49, 50, 50, 50, 49];
        let currentLeft = 0;
        let colIndex = -1;
        for (let i = 0; i < widths.length; i++) {
          const start = currentLeft;
          const end = currentLeft + widths[i];
          if (mousePos.x >= (start + 2) && mousePos.x <= (end + 3)) { // Adjusting for 2px offset
            colIndex = i;
            break;
          }
          currentLeft += widths[i] + 1;
        }

        if (colIndex !== -1) {
          const start = startOfWeek(currentDate);
          setCurrentDate(addDays(start, colIndex));
          setViewMode('day');
        }
        return;
      }

      if (viewMode === 'day') {
        // Day View Zoom Logic
        const toZoomed = !isDayZoomed;
        const startH = zoomHeight;
        const endH = toZoomed ? (163 * 8 / 48) : (163 / 48);
        
        if (!isDayZoomed) {
          // Capture anchor only when zooming IN
          const boxTop = 32;
          const boxBottom = 191;
          const clampedY = Math.max(boxTop, Math.min(boxBottom, mousePos.y));
          
          // Pin exactly to the time the user's cursor is currently displaying
          if (timeStr) {
            const [hStr, mStr] = timeStr.split(':');
            anchorTime.current = parseInt(hStr) + parseInt(mStr) / 60;
          } else {
            const hourValRaw = (clampedY - boxTop) / (zoomHeight * 2);
            let h = Math.floor(hourValRaw);
            let m = Math.floor((hourValRaw - h) * 60);
            m = Math.round(m / 5) * 5;
            if (m === 60) { h += 1; m = 0; }
            anchorTime.current = h + (m / 60); 
          }
          anchorY.current = clampedY - boxTop;
        }

        const startTime = performance.now();
        const duration = 400;
        const startScroll = zoomScroll;
        setIsAnimating(true);

        const step = (now: number) => {
          const elapsed = now - startTime;
          const progress = Math.min(1, elapsed / duration);
          const ease = progress < 0.5 ? 2 * progress * progress : 1 - Math.pow(-2 * progress + 2, 2) / 2;
          
          const currentH = startH + (endH - startH) * ease;
          const currentScroll = toZoomed 
            ? (Math.round(anchorTime.current * 2 * currentH) - 3 - anchorY.current)
            : startScroll * (1 - ease);

          setZoomHeight(currentH);
          setZoomScroll(Math.round(currentScroll));

          if (progress < 1) {
            requestAnimationFrame(step);
          } else {
            setIsAnimating(false);
            setIsDayZoomed(toZoomed);
          }
        };
        requestAnimationFrame(step);
      }
    }
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    
    let targetDate = new Date(currentDate);
    let targetHour = 12;
    let targetMinute = 0;
    
    let clickedEvent: CalendarEvent | undefined = undefined;

    if (viewMode === 'day' || viewMode === 'week') {
      const boxTop = viewMode === 'day' ? 32 : 37;
      const boxBottom = viewMode === 'day' ? 191 : 194;
      const clampedY = Math.max(boxTop - 3, Math.min(boxBottom + 3, mousePos.y));
      const localZoomScroll = viewMode === 'day' ? zoomScroll : 0;
      const localZoomHeight = viewMode === 'day' ? zoomHeight : (boxBottom - boxTop) / 48;
      
      const mouseInnerY = clampedY - boxTop + localZoomScroll + 3;

      if (viewMode === 'day') {
        const dayEvents = events.filter(ev => isEventOnDay(ev, targetDate));
        const layouts = calculateEventLayouts(dayEvents, targetDate);
        for (let i = layouts.length - 1; i >= 0; i--) {
          const layout = layouts[i];
          const ev = layout.event;
          const startH = layout.startMin / 60;
          const endH = layout.endMin / 60;
          const top = Math.round(startH * 2 * zoomHeight) - 2;
          const bottom = top + Math.max(8, Math.round(endH * 2 * zoomHeight) - Math.round(startH * 2 * zoomHeight));
          
          const layerWidth = 288;
          const eventLeft = 32 + (layout.leftPct / 100) * layerWidth + 2;
          const eventRight = 32 + ((layout.leftPct + layout.widthPct) / 100) * layerWidth - 4;
          
          if (mouseInnerY >= top && mouseInnerY <= bottom && mousePos.x >= eventLeft && mousePos.x <= eventRight) {
            clickedEvent = ev;
            break;
          }
        }
      }

      // Use the already calculated timeStr for the new event time
      if (timeStr) {
        const [hStr, mStr] = timeStr.split(':');
        targetHour = parseInt(hStr);
        targetMinute = parseInt(mStr);
      }
      
      if (viewMode === 'week') {
        const widths = [49, 49, 49, 50, 50, 50, 49];
        let currentLeft = 0;
        let colIndex = -1;
        for (let i = 0; i < widths.length; i++) {
          const start = currentLeft;
          const end = currentLeft + widths[i];
          if (mousePos.x >= (start + 2) && mousePos.x <= (end + 3)) {
            colIndex = i;
            break;
          }
          currentLeft += widths[i] + 1;
        }
        if (colIndex !== -1) {
          const start = startOfWeek(currentDate);
          targetDate = addDays(start, colIndex);
          
          // Also check for event click in week view
          const dayEvents = events.filter(ev => isEventOnDay(ev, targetDate));
          const weekLayouts = calculateEventLayouts(dayEvents, targetDate);
          clickedEvent = weekLayouts.reverse().find(layout => {
            const ev = layout.event;
            const top = Math.round((layout.startMin / 60) * (157 / 24));
            const bottom = Math.round((layout.endMin / 60) * (157 / 24));
            const actualTop = top;
            const actualBottom = Math.max(actualTop + 8, bottom);
            // In week view, mouseInnerY is relative to boxTop (37)
            return mouseInnerY >= actualTop && mouseInnerY <= actualBottom;
          })?.event;
        }
      }
    } else if (viewMode === 'month') {
      // Find month day from grid
      // This is simplified, usually we'd need more precise hit detection for month view
      // But we'll use 12:00 as requested
    }

    const finalDate = setMinutes(setHours(targetDate, targetHour), targetMinute);
    if (clickedEvent && onEventRightClick) {
      onEventRightClick(e, clickedEvent, finalDate);
    } else {
      onRightClick(finalDate);
    }
  };

  const handleWheel = (e: React.WheelEvent) => {
    if (!isDayZoomed || isAnimating) return;
    
    const maxScroll = Math.max(0, Math.round(24 * 2 * zoomHeight) - 163);
    setZoomScroll(prev => {
      const step = Math.sign(e.deltaY) * 40;
      let newScroll = prev + step;
      if (newScroll < 0) newScroll = 0;
      if (newScroll > maxScroll) newScroll = maxScroll;
      return newScroll;
    });
  };

  // Shared hover logic for Day and Week views
  if ((viewMode === 'day' || viewMode === 'week') && mousePos.x >= 2 && mousePos.x <= 354) {
    let boxTop = 32;
    let boxBottom = 191;
    let localZoomHeight = zoomHeight;
    let localZoomScroll = zoomScroll;
    
    if (viewMode === 'week') {
      // Week View Bounds: Header is 21-36, Body is 37-194
      boxTop = 37;
      boxBottom = 194;
      localZoomHeight = (boxBottom - boxTop) / 48; // Standard 24h scale
      localZoomScroll = 0; // No zoom in week view yet
    }

    if (mousePos.y >= (boxTop - 6) && mousePos.y <= (boxBottom + 6) && !draggingEventId.current && !hideHoverLine) {
      showLine = true;
      const clampedY = Math.max(boxTop - 3, Math.min(boxBottom + 3, mousePos.y));
      hoverLineY = clampedY;

      if (isAnimating) {
        // Freeze the time display to the anchor time during animation
        let h = Math.floor(anchorTime.current);
        let m = Math.floor((anchorTime.current - h) * 60 + 0.5);
        m = Math.round(m / 5) * 5;
        if (m === 60) { h += 1; m = 0; }
        timeStr = `${Math.max(0, h)}:${m.toString().padStart(2, '0')}`;
      } else {
        // Grid-aware time mapping
        // Offset of 3 compensates for boxTop=32 in day view, shifted to user preference.
        // Week view retains -1 offset for boxTop=37.
        const offset = viewMode === 'day' ? 3 : -1; 
        const relativeY = clampedY - boxTop + localZoomScroll + offset;
        let bestH = 0;
        let minDiff = 999;
        
        // Check every 5-minute step in the 24h day
        for (let step = 0; step <= 24 * 12; step++) {
          const h = step / 12;
          const y = Math.round(h * 2 * localZoomHeight);
          const diff = Math.abs(y - relativeY);
          if (diff < minDiff) {
            minDiff = diff;
            bestH = h;
          }
        }
        
        let h = Math.floor(bestH);
        let m = Math.round((bestH - h) * 60);
        if (m === 60) { h += 1; m = 0; }
        timeStr = `${Math.max(0, h)}:${m.toString().padStart(2, '0')}`;
      }
    }
  }

  return (
    <div 
      className="calendar-container" 
      style={{ position: 'relative' }} 
      onContextMenu={handleContextMenu}
      onMouseDown={handleDayMouseDown}
      onMouseUp={handleDayMouseUp}
    >
      {/* Global hover line and click overlay for Day and Week Views */}
      {showLine && (
        <div 
          onDoubleClick={handleContextMenu}
          onWheel={handleWheel}
          style={{ 
            position: 'absolute', 
            top: viewMode === 'day' ? '27px' : '35px', 
            left: '2px', 
            width: '352px', 
            height: viewMode === 'day' ? '168px' : '159px', 
            zIndex: 5,
            cursor: 'none',
            background: 'rgba(0,0,0,0)'
          }}
        >
          {(() => {
            if (viewMode === 'day') {
              const y = hoverLineY - 27;
              const clampedX = Math.max(34, mousePos.x);
              return (
                <>
                  <svg className="hover-line-svg">
                    <line 
                      x1={34} y1={y} x2={clampedX - 2} y2={y} 
                      stroke="#555" strokeWidth={1} shapeRendering="crispEdges" 
                    />
                    <line 
                      x1={clampedX + 36} y1={y} x2={352} y2={y} 
                      stroke="#555" strokeWidth={1} shapeRendering="crispEdges" 
                    />
                  </svg>
                  <div 
                    className="hover-time-label" 
                    style={{ 
                      transform: `translate(${clampedX + 4}px, ${y - 3}px)`,
                      top: 0, left: 0, position: 'absolute',
                      pointerEvents: 'none'
                    }}
                  >
                    <PixelText text={timeStr} />
                  </div>
                </>
              );
            } else {
              // Week View Logic
              const widths = [49, 49, 49, 50, 50, 50, 49];
              let currentLeft = 0;
              let colIndex = -1;
              let foundColLeft = 0;
              for (let i = 0; i < widths.length; i++) {
                const start = currentLeft;
                const end = currentLeft + widths[i];
                if (mousePos.x >= start && mousePos.x <= end + 1) {
                  colIndex = i;
                  foundColLeft = currentLeft;
                  break;
                }
                currentLeft += widths[i] + 1;
              }

              if (colIndex === -1) return null;

              const colLeft = foundColLeft;
              const colWidth = widths[colIndex];
              const labelWidth = 24;
              const yRaw = hoverLineY - 37;
              const y = yRaw;
              
              // Flip label to below the line if too close to top
              const isTooCloseToTop = yRaw < 8;
              const labelTop = isTooCloseToTop ? (y + 7) : (y - 7);

              return (
                <>
                  <svg className="hover-line-svg">
                    <line 
                      x1={colLeft} y1={y} x2={colLeft + colWidth} y2={y} 
                      stroke="#555" strokeWidth={1} shapeRendering="crispEdges" 
                    />
                  </svg>
                  <div 
                    className="hover-time-label" 
                    style={{ 
                      left: `${colLeft}px`,
                      width: `${colWidth}px`,
                      top: `${labelTop}px`,
                      position: 'absolute',
                      display: 'flex',
                      justifyContent: 'center',
                      pointerEvents: 'none'
                    }}
                  >
                    <PixelText text={timeStr} />
                  </div>
                </>
              );
            }
          })()}
        </div>
      )}

      {/* Top Bar */}
      <div className="top-bar">
        <div className="view-controls">
          <button className={viewMode === 'day' ? 'active' : ''} onClick={() => setViewMode('day')}><PixelText text="D" noShift /></button>
          <button className={viewMode === 'week' ? 'active' : ''} onClick={() => setViewMode('week')}><PixelText text="W" noShift /></button>
          <button className={viewMode === 'month' ? 'active' : ''} onClick={() => setViewMode('month')}><PixelText text="M" noShift /></button>
          <button className={viewMode === 'year' ? 'active' : ''} onClick={() => setViewMode('year')}><PixelText text="Y" noShift /></button>
        </div>
        
        <div className="nav-controls">
          <button onClick={handlePrev}><PixelText text="<" noShift /></button>
          <span className="current-date-title">{getHeaderTitle()}</span>
          <button onClick={handleNext}><PixelText text=">" noShift /></button>
        </div>
        
        <button className="add-btn" onClick={() => onAddEventClick(currentDate)}><PixelText text="+" color="black" noShift /></button>
      </div>

      {/* Main Content Area */}
      <div 
        className="calendar-content" 
      >
        {viewMode === 'year' && renderYearView()}
        {viewMode === 'month' && renderMonthView()}
        {viewMode === 'week' && renderWeekView()}
        {viewMode === 'day' && renderDayView()}
      </div>
    </div>
  );
}

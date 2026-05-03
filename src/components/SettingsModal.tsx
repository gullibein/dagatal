import React, { useState, useRef, useEffect } from 'react';
import { db } from '../lib/instant';
import { PixelText } from './PixelText';

interface SettingsModalProps {
  onClose: () => void;
  showHolidays: boolean;
  setShowHolidays: (show: boolean) => void;
}

export function SettingsModal({ onClose, showHolidays, setShowHolidays }: SettingsModalProps) {
  const { user } = db.useAuth();
  
  // Draggable State
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartPos = useRef({ x: 0, y: 0 });
  const modalStartPos = useRef({ x: 0, y: 0 });

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

    const handleMouseUp = () => setIsDragging(false);

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

  const handleClearData = () => {
    if (confirm("Are you sure you want to clear ALL calendar events? This cannot be undone.")) {
      // In a real app, we'd loop through events and delete them via db.transact
      // For now, we'll just alert that this requires a query.
      alert("Clear data triggered. (Feature implementation pending query access)");
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div 
        className="modal-content" 
        style={{ 
          width: '180px',
          transform: `translate(${pos.x}px, ${pos.y}px)`,
          cursor: isDragging ? 'grabbing' : 'default'
        }}
        onClick={e => e.stopPropagation()}
      >
        <div className="modal-header" onMouseDown={handleHeaderMouseDown} style={{ cursor: 'grab' }}>
          <PixelText text="Settings" color="var(--bg-color)" />
        </div>

        <div className="modal-body">
          <div style={{ marginBottom: '12px' }}>
            <div style={{ marginBottom: '4px' }}>
              <PixelText text="USER ACCOUNT" color="var(--accent-color)" />
            </div>
            {user ? (
              <>
                <div style={{ marginBottom: '4px' }}>
                  <PixelText text={user.email || ''} color="#555" />
                </div>
                <button onClick={() => { db.auth.signOut(); onClose(); }} style={{ width: '100%' }}>
                  <PixelText text="Log Out" />
                </button>
              </>
            ) : (
              <PixelText text="Not logged in (Offline mode)" color="#888" />
            )}
          </div>

          <div style={{ marginBottom: '12px' }}>
            <div style={{ marginBottom: '4px' }}>
              <PixelText text="CALENDAR PREFERENCES" color="var(--accent-color)" />
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
              <input 
                type="checkbox" 
                checked={showHolidays} 
                onChange={(e) => setShowHolidays(e.target.checked)}
                style={{ margin: 0, width: '10px', height: '10px' }}
              />
              <PixelText text="Show Icelandic Holidays" />
            </label>
          </div>

          <div style={{ marginBottom: '12px' }}>
            <div style={{ marginBottom: '4px' }}>
              <PixelText text="DATA MANAGEMENT" color="var(--accent-color)" />
            </div>
            <button onClick={handleClearData} style={{ width: '100%', color: 'red' }}>
              <PixelText text="Clear All Events" color="red" />
            </button>
          </div>

          <div style={{ borderTop: '1px solid #ddd', paddingTop: '8px' }}>
            <PixelText text="Dagatal v1.2" color="#aaa" block align="center" />
            <PixelText text="© 2026 Retro Systems" color="#aaa" block align="center" />
          </div>
        </div>

        <div className="modal-footer" style={{ padding: '8px' }}>
          <button onClick={onClose} className="primary" style={{ width: '100%' }}>
            <PixelText text="Close" />
          </button>
        </div>
      </div>
    </div>
  );
}

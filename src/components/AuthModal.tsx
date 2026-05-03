import React, { useState, useRef, useEffect } from 'react';
import { db } from '../lib/instant';
import { PixelText } from './PixelText';
import { PixelInput } from './PixelInput';

interface AuthModalProps {
  onClose: () => void;
}

export function AuthModal({ onClose }: AuthModalProps) {
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [sentEmail, setSentEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setIsLoading(true);
    setError(null);
    try {
      await db.auth.sendMagicCode({ email });
      setSentEmail(email);
    } catch (err: any) {
      setError(err.body?.message || 'Failed to send code');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code) return;
    setIsLoading(true);
    setError(null);
    try {
      await db.auth.signInWithMagicCode({ email: sentEmail, code });
      onClose();
    } catch (err: any) {
      setError(err.body?.message || 'Invalid code');
    } finally {
      setIsLoading(false);
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
          <PixelText text="Account Login" color="var(--bg-color)" />
        </div>

        <div className="modal-body">
          {!sentEmail ? (
            <form onSubmit={handleSendCode}>
              <div style={{ marginBottom: '8px', padding: '0 4px' }}>
                <PixelText 
                  text="Enter your email to receive a secret login code." 
                  color="#555" 
                  block 
                  align="center" 
                />
              </div>
              <PixelInput 
                placeholder="email@example.com"
                value={email}
                onChange={setEmail}
                block
                autoFocus
              />
              {error && (
                <div style={{ marginTop: '4px' }}>
                  <PixelText text={error} color="red" />
                </div>
              )}
              <div className="modal-footer" style={{ marginTop: '8px', padding: 0 }}>
                <button type="submit" className="primary" disabled={isLoading} style={{ width: '100%' }}>
                  <PixelText text={isLoading ? "Sending..." : "Send Code"} />
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleVerifyCode}>
              <div style={{ marginBottom: '8px', padding: '0 4px' }}>
                <PixelText 
                  text={`Code sent to ${sentEmail}`} 
                  color="#555" 
                  block 
                  align="center" 
                />
              </div>
              <PixelInput 
                placeholder="123456"
                value={code}
                onChange={setCode}
                block
                autoFocus
              />
              {error && (
                <div style={{ marginTop: '4px' }}>
                  <PixelText text={error} color="red" />
                </div>
              )}
              <div className="modal-footer" style={{ marginTop: '8px', padding: 0, gap: '4px' }}>
                <button type="button" onClick={() => setSentEmail('')} style={{ flex: 1 }}>
                  <PixelText text="Back" />
                </button>
                <button type="submit" className="primary" disabled={isLoading} style={{ flex: 1 }}>
                  <PixelText text={isLoading ? "Verifying..." : "Verify"} />
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

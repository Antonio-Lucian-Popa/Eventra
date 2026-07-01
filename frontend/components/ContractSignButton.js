'use client';

import { useEffect, useRef, useState } from 'react';
import Modal from './Modal';
import { apiRequest } from '../lib/api';

// Buton + modal cu pad de semnatura. Clientul semneaza pe ecran (mouse/touch),
// iar semnatura este trimisa catre backend care o include in PDF-ul contractului.
export default function ContractSignButton({ contract, reload, setError }) {
  const [open, setOpen] = useState(false);
  const [signerName, setSignerName] = useState(contract.client?.fullName || '');
  const [submitting, setSubmitting] = useState(false);
  const [hasStrokes, setHasStrokes] = useState(false);
  const canvasRef = useRef(null);
  const drawing = useRef(false);

  useEffect(() => {
    if (!open) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = '#111827';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  }, [open]);

  function pos(event) {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const point = event.touches ? event.touches[0] : event;
    return {
      x: (point.clientX - rect.left) * (canvas.width / rect.width),
      y: (point.clientY - rect.top) * (canvas.height / rect.height),
    };
  }

  function start(event) {
    event.preventDefault();
    drawing.current = true;
    const ctx = canvasRef.current.getContext('2d');
    const { x, y } = pos(event);
    ctx.beginPath();
    ctx.moveTo(x, y);
  }

  function move(event) {
    if (!drawing.current) return;
    event.preventDefault();
    const ctx = canvasRef.current.getContext('2d');
    const { x, y } = pos(event);
    ctx.lineTo(x, y);
    ctx.stroke();
    setHasStrokes(true);
  }

  function end() {
    drawing.current = false;
  }

  function clearPad() {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    setHasStrokes(false);
  }

  async function submit() {
    if (!hasStrokes) {
      setError?.('Adaugă semnătura înainte de a salva.');
      return;
    }
    if (!signerName || signerName.trim().length < 2) {
      setError?.('Completează numele semnatarului.');
      return;
    }
    setSubmitting(true);
    setError?.('');
    try {
      const signatureData = canvasRef.current.toDataURL('image/png');
      await apiRequest(`/contracts/${contract.id}/sign`, {
        method: 'POST',
        body: JSON.stringify({ signatureData, signerName: signerName.trim() }),
      });
      setOpen(false);
      await reload?.();
    } catch (err) {
      setError?.(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <button className="btn" type="button" onClick={() => setOpen(true)}>
        Semnează
      </button>
      {open ? (
        <Modal
          title={`Semnează contractul ${contract.contractNumber || ''}`}
          onClose={() => setOpen(false)}
          footer={
            <>
              <button className="btn" type="button" onClick={clearPad}>Șterge</button>
              <button className="btn" type="button" onClick={() => setOpen(false)}>Renunță</button>
              <button className="btn primary" type="button" onClick={submit} disabled={submitting}>
                {submitting ? 'Se salvează...' : 'Salvează semnătura'}
              </button>
            </>
          }
        >
          <div className="field" style={{ marginBottom: 12 }}>
            <label>Nume semnatar</label>
            <input value={signerName} onChange={(event) => setSignerName(event.target.value)} placeholder="Nume și prenume" />
          </div>
          <div className="field">
            <label>Semnătură</label>
            <canvas
              ref={canvasRef}
              width={520}
              height={200}
              style={{ width: '100%', maxWidth: 520, height: 200, border: '1px solid var(--border)', borderRadius: 8, touchAction: 'none', cursor: 'crosshair' }}
              onMouseDown={start}
              onMouseMove={move}
              onMouseUp={end}
              onMouseLeave={end}
              onTouchStart={start}
              onTouchMove={move}
              onTouchEnd={end}
            />
          </div>
        </Modal>
      ) : null}
    </>
  );
}

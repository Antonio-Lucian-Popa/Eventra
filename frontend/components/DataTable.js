'use client';

import { useRef, useState, useEffect } from 'react';
import { MoreVertical, Pencil, Trash2 } from 'lucide-react';

function ActionMenu({ onEdit, onDelete }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    function onClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, [open]);

  return (
    <div style={{ position: 'relative', display: 'inline-block' }} ref={ref}>
      <button className="btn icon" aria-label="Acțiuni" onClick={() => setOpen((o) => !o)}>
        <MoreVertical size={16} />
      </button>
      {open && (
        <div style={{
          position: 'absolute', right: 0, top: '110%',
          background: 'var(--surface)', border: '1px solid var(--border)',
          borderRadius: 8, padding: 4, zIndex: 50, minWidth: 140,
          boxShadow: '0 4px 16px rgba(0,0,0,.15)',
        }}>
          {onEdit && (
            <button
              className="btn"
              type="button"
              style={{ width: '100%', justifyContent: 'flex-start', gap: 8 }}
              onClick={() => { onEdit(); setOpen(false); }}
            >
              <Pencil size={13} /> Editează
            </button>
          )}
          {onDelete && (
            <button
              className="btn"
              type="button"
              style={{ width: '100%', justifyContent: 'flex-start', gap: 8, color: 'var(--red)' }}
              onClick={() => { onDelete(); setOpen(false); }}
            >
              <Trash2 size={13} /> Șterge
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default function DataTable({ columns, rows, showDefaultActions = true, onEdit, onDelete }) {
  return (
    <div className="table-scroll">
      <table>
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column.key}>{column.label}</th>
            ))}
            {showDefaultActions ? <th>Acțiuni</th> : null}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              {columns.map((column) => (
                <td key={column.key} data-label={column.label}>{column.render ? column.render(row) : row[column.key]}</td>
              ))}
              {showDefaultActions ? (
                <td data-label="Acțiuni">
                  <ActionMenu
                    onEdit={onEdit ? () => onEdit(row) : undefined}
                    onDelete={onDelete ? () => onDelete(row) : undefined}
                  />
                </td>
              ) : null}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

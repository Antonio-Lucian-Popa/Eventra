import { X } from 'lucide-react';

export default function Modal({ title, children, footer, onClose }) {
  return (
    <div className="modal-backdrop" role="presentation">
      <section className="modal" role="dialog" aria-modal="true" aria-label={title}>
        <div className="modal-header">
          <div className="card-title">{title}</div>
          <button className="btn icon" onClick={onClose} type="button" aria-label="Închide">
            <X size={16} />
          </button>
        </div>
        <div className="modal-body">{children}</div>
        {footer ? <div className="modal-footer">{footer}</div> : null}
      </section>
    </div>
  );
}

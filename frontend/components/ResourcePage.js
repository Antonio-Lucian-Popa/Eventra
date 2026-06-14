'use client';

import { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Plus, Search, Trash2 } from 'lucide-react';
import AppShell from './AppShell';
import PageHeader from './PageHeader';
import DataTable from './DataTable';
import Modal from './Modal';
import ResourceForm from './ResourceForm';
import { createResource, deleteResource, listResource, updateResource } from '../lib/api';

export default function ResourcePage({
  title,
  subtitle,
  endpoint,
  columns,
  fields,
  fallback = [],
  searchPlaceholder = 'Caută...',
  createLabel = 'Adaugă',
  mapItems = (items) => items,
  rowActions,
}) {
  const [items, setItems] = useState(fallback);
  const [meta, setMeta] = useState({ page: 1, pageSize: 25, total: fallback.length });
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState(null);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const debounceRef = useRef(null);

  const tableColumns = [
    ...columns,
    ...(rowActions
      ? [{
          key: 'customActions',
          label: 'Acțiuni rapide',
          render: (row) => <div className="toolbar">{rowActions(row, load, setError)}</div>,
        }]
      : []),
    {
      key: 'delete',
      label: '',
      render: (row) => (
        <button className="btn icon" type="button" onClick={() => remove(row)} aria-label="Șterge">
          <Trash2 size={15} />
        </button>
      ),
    },
  ];

  async function load(currentPage = page, currentSearch = search) {
    setLoading(true);
    setError('');
    try {
      const payload = await listResource(endpoint, { search: currentSearch, page: currentPage, pageSize: 25 });
      setItems(mapItems(payload.data || []));
      setMeta(payload.meta || { page: currentPage, pageSize: 25, total: (payload.data || []).length });
    } catch (err) {
      setItems(fallback);
      setError(`${err.message} Afișez date demo.`);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load(1, search);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!toast) return undefined;
    const timer = setTimeout(() => setToast(''), 2600);
    return () => clearTimeout(timer);
  }, [toast]);

  function onSearchChange(value) {
    setSearch(value);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setPage(1);
      load(1, value);
    }, 350);
  }

  function goToPage(p) {
    setPage(p);
    load(p, search);
  }

  async function save(body) {
    setSubmitting(true);
    setError('');
    try {
      if (modal?.item) await updateResource(endpoint, modal.item.id, body);
      else await createResource(endpoint, body);
      setModal(null);
      setToast('Salvat cu succes.');
      await load(page, search);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function remove(row) {
    if (!window.confirm('Ștergi această înregistrare?')) return;
    setError('');
    try {
      await deleteResource(endpoint, row.id);
      setItems((current) => current.filter((item) => item.id !== row.id));
      setToast('Înregistrare ștearsă.');
    } catch (err) {
      setError(err.message);
    }
  }

  const totalPages = meta.total ? Math.ceil(meta.total / (meta.pageSize || 25)) : 1;
  const showPagination = totalPages > 1;

  return (
    <AppShell>
      <PageHeader title={title} subtitle={subtitle}>
        <button className="btn primary" type="button" onClick={() => setModal({ item: null })}>
          <Plus size={16} />
          {createLabel}
        </button>
      </PageHeader>

      <section className="card table-card">
        <div className="table-tools">
          <div className="toolbar">
            <Search size={16} color="var(--muted)" />
            <input
              className="input"
              placeholder={searchPlaceholder}
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && load(1, search)}
            />
          </div>
          <span className="row-subtitle">{loading ? 'Se încarcă...' : `${meta.total ?? items.length} rezultate`}</span>
        </div>

        {error ? <div style={{ padding: '0 18px 14px' }}><div className="notice error">{error}</div></div> : null}

        {loading ? (
          <>
            <div className="skeleton-row" />
            <div className="skeleton-row" />
            <div className="skeleton-row" />
          </>
        ) : items.length ? (
          <DataTable
            showDefaultActions={false}
            rows={items}
            columns={tableColumns.map((column) =>
              column.key === 'delete' || column.key === 'customActions'
                ? column
                : {
                    ...column,
                    render: column.render || ((row) => (
                      <button className="btn" type="button" onClick={() => setModal({ item: row })}>
                        {row[column.key] ?? '-'}
                      </button>
                    )),
                  },
            )}
          />
        ) : (
          <div className="empty-state">Nu există încă înregistrări.</div>
        )}

        {showPagination && (
          <div className="toolbar" style={{ padding: '12px 18px', borderTop: '1px solid var(--border)', justifyContent: 'center', gap: 8 }}>
            <button
              className="btn icon"
              disabled={page <= 1}
              onClick={() => goToPage(page - 1)}
              aria-label="Pagina anterioară"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="row-subtitle">Pagina {page} din {totalPages}</span>
            <button
              className="btn icon"
              disabled={page >= totalPages}
              onClick={() => goToPage(page + 1)}
              aria-label="Pagina următoare"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        )}
      </section>

      {modal ? (
        <Modal
          title={modal.item ? `Editează` : createLabel}
          onClose={() => setModal(null)}
          footer={
            <>
              <button className="btn" type="button" onClick={() => setModal(null)}>Renunță</button>
              <button className="btn primary" type="submit" form="resource-form" disabled={submitting}>
                {submitting ? 'Se salvează...' : 'Salvează'}
              </button>
            </>
          }
        >
          <ResourceForm fields={fields} item={modal.item} onSubmit={save} submitting={submitting} />
        </Modal>
      ) : null}

      {toast ? <div className="toast">{toast}</div> : null}
    </AppShell>
  );
}

'use client';

import { useEffect, useMemo, useState } from 'react';
import { listResource } from '../lib/api';

function valueFor(item, field) {
  if (!item) return field.defaultValue ?? '';
  const value = item[field.name];
  if (field.type === 'date' && value) return String(value).slice(0, 10);
  if (field.type === 'datetime-local' && value) return String(value).slice(0, 16);
  return value ?? '';
}

function normalizeValue(value, field) {
  if (field.type === 'number') return value === '' ? undefined : Number(value);
  if (field.type === 'date') return value ? new Date(value).toISOString() : undefined;
  if (field.type === 'datetime-local') return value ? new Date(value).toISOString() : undefined;
  if (field.optional && value === '') return undefined;
  return value;
}

export default function ResourceForm({ fields, item, onSubmit, submitting }) {
  const initial = useMemo(
    () => Object.fromEntries(fields.map((field) => [field.name, valueFor(item, field)])),
    [fields, item],
  );
  const [values, setValues] = useState(initial);
  const [dynamicOptions, setDynamicOptions] = useState({});

  useEffect(() => {
    fields
      .filter((field) => field.type === 'relation')
      .forEach((field) => {
        listResource(field.endpoint, { pageSize: 100 })
          .then((payload) => {
            setDynamicOptions((current) => ({
              ...current,
              [field.name]: (payload.data || []).map((row) => ({
                value: row.id,
                label: field.labelFor ? field.labelFor(row) : row.name || row.fullName || row.title || row.invoiceNumber || row.id,
              })),
            }));
          })
          .catch(() => {
            setDynamicOptions((current) => ({ ...current, [field.name]: field.fallbackOptions || [] }));
          });
      });
  }, [fields]);

  function submit(event) {
    event.preventDefault();
    const body = {};
    fields.forEach((field) => {
      if (field.readOnly) return;
      const value = normalizeValue(values[field.name], field);
      if (value !== undefined) body[field.name] = value;
    });
    onSubmit(body);
  }

  return (
    <form id="resource-form" className="form-grid" onSubmit={submit}>
      {fields.map((field) => (
        <div className={`field ${field.full ? 'full' : ''}`} key={field.name}>
          <label htmlFor={field.name}>{field.label}</label>
          {field.type === 'select' || field.type === 'relation' ? (
            <select
              id={field.name}
              value={values[field.name] ?? ''}
              disabled={submitting || field.readOnly}
              onChange={(event) => setValues((current) => ({ ...current, [field.name]: event.target.value }))}
            >
              <option value="">Alege...</option>
              {(field.type === 'relation' ? dynamicOptions[field.name] || field.fallbackOptions || [] : field.options || []).map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          ) : field.type === 'textarea' ? (
            <textarea
              id={field.name}
              value={values[field.name] ?? ''}
              disabled={submitting || field.readOnly}
              onChange={(event) => setValues((current) => ({ ...current, [field.name]: event.target.value }))}
            />
          ) : (
            <input
              id={field.name}
              type={field.type || 'text'}
              value={values[field.name] ?? ''}
              placeholder={field.placeholder}
              disabled={submitting || field.readOnly}
              onChange={(event) => setValues((current) => ({ ...current, [field.name]: event.target.value }))}
            />
          )}
        </div>
      ))}
    </form>
  );
}

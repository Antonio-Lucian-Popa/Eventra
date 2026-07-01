import Link from 'next/link';
import StatusBadge from '../components/StatusBadge';
import ContractSignButton from '../components/ContractSignButton';
import { demoClients, demoEvents, demoInvoices, demoVenues } from './demo-data';
import { apiRequest, createResource } from './api';

const eventTypes = [
  ['wedding', 'Nuntă'],
  ['baptism', 'Botez'],
  ['birthday', 'Majorat'],
  ['corporate', 'Corporate'],
  ['other', 'Altul'],
].map(([value, label]) => ({ value, label }));

const eventStatuses = ['draft', 'preconfirmed', 'confirmed', 'in_preparation', 'completed', 'cancelled'].map((value) => ({ value, label: value }));
const offerStatuses = ['draft', 'sent', 'accepted', 'rejected'].map((value) => ({ value, label: value }));
const invoiceStatuses = ['unpaid', 'partially_paid', 'paid', 'cancelled'].map((value) => ({ value, label: value }));
const paymentStatuses = ['pending', 'succeeded', 'failed', 'refunded'].map((value) => ({ value, label: value }));
const leadStatuses = ['new', 'contacted', 'viewing', 'offer_sent', 'negotiation', 'won', 'lost'].map((value) => ({ value, label: value }));

export function money(value) {
  return `${Number(value || 0).toLocaleString('ro-RO')} €`;
}

export const resourceConfigs = {
  events: {
    title: 'Evenimente',
    subtitle: 'Gestionează evenimentele și rezervările',
    endpoint: '/events',
    fallback: demoEvents,
    createLabel: 'Eveniment nou',
    searchPlaceholder: 'Caută eveniment...',
    columns: [
      { key: 'title', label: 'Eveniment', render: (row) => <Link className="row-title" href={`/events/${row.id}`}>{row.title}</Link> },
      { key: 'client', label: 'Client', render: (row) => row.client?.fullName || row.clientId },
      { key: 'venue', label: 'Locație', render: (row) => row.venue?.name || row.venueId },
      { key: 'team', label: 'Echipă', render: (row) => row.team?.name || '-' },
      { key: 'eventDate', label: 'Data', render: (row) => new Date(row.eventDate).toLocaleDateString('ro-RO') },
      { key: 'guestsCount', label: 'Invitați' },
      { key: 'status', label: 'Status', render: (row) => <StatusBadge status={row.status} /> },
    ],
    fields: [
      { name: 'clientId', label: 'Client', type: 'relation', endpoint: '/clients', labelFor: (row) => row.fullName },
      { name: 'venueId', label: 'Locație', type: 'relation', endpoint: '/venues', labelFor: (row) => row.name },
      { name: 'title', label: 'Titlu' },
      { name: 'eventType', label: 'Tip eveniment', type: 'select', options: eventTypes },
      { name: 'eventDate', label: 'Data eveniment', type: 'date' },
      { name: 'startTime', label: 'Ora început', placeholder: '18:00' },
      { name: 'endTime', label: 'Ora final', placeholder: '03:00', optional: true },
      { name: 'guestsCount', label: 'Număr invitați', type: 'number' },
      { name: 'teamId', label: 'Echipă', type: 'relation', endpoint: '/teams', labelFor: (row) => row.name, optional: true },
      { name: 'status', label: 'Status', type: 'select', options: eventStatuses, defaultValue: 'draft' },
      { name: 'totalAmount', label: 'Valoare totală', type: 'number', defaultValue: 0 },
      { name: 'depositAmount', label: 'Avans', type: 'number', defaultValue: 0 },
      { name: 'paidAmount', label: 'Plătit', type: 'number', defaultValue: 0 },
      { name: 'notes', label: 'Note', type: 'textarea', full: true, optional: true },
    ],
  },
  venues: {
    title: 'Locații',
    subtitle: 'Saloane, capacități și disponibilitate',
    endpoint: '/venues',
    fallback: demoVenues,
    createLabel: 'Locație nouă',
    searchPlaceholder: 'Caută locație...',
    columns: [
      { key: 'name', label: 'Locație' },
      { key: 'address', label: 'Adresă' },
      { key: 'capacity', label: 'Capacitate' },
      { key: 'status', label: 'Status', render: (row) => <StatusBadge status={row.status || 'confirmed'} /> },
    ],
    fields: [
      { name: 'name', label: 'Nume' },
      { name: 'address', label: 'Adresă' },
      { name: 'capacity', label: 'Capacitate', type: 'number' },
      { name: 'status', label: 'Status', type: 'select', options: ['active', 'inactive', 'maintenance'].map((value) => ({ value, label: value })), defaultValue: 'active' },
      { name: 'description', label: 'Descriere', type: 'textarea', full: true, optional: true },
    ],
  },
  clients: {
    title: 'Clienți',
    subtitle: 'Gestionează baza de date cu clienții tăi',
    endpoint: '/clients',
    fallback: demoClients,
    createLabel: 'Client nou',
    searchPlaceholder: 'Caută client...',
    columns: [
      { key: 'fullName', label: 'Nume client' },
      { key: 'phone', label: 'Contact' },
      { key: 'email', label: 'Email' },
      { key: 'events', label: 'Evenimente', render: (row) => row.events?.length || row.events || 0 },
      { key: 'totalPaid', label: 'Total plătit', render: (row) => money(row.totalPaid) },
    ],
    fields: [
      { name: 'fullName', label: 'Nume complet' },
      { name: 'phone', label: 'Telefon' },
      { name: 'email', label: 'Email', type: 'email', optional: true },
      { name: 'notes', label: 'Note', type: 'textarea', full: true, optional: true },
    ],
  },
  leads: {
    title: 'Lead-uri',
    subtitle: 'Oportunități și cereri noi',
    endpoint: '/leads',
    fallback: [],
    createLabel: 'Lead nou',
    searchPlaceholder: 'Caută lead...',
    columns: [
      { key: 'client', label: 'Client', render: (row) => row.client?.fullName || row.clientId },
      { key: 'eventType', label: 'Tip eveniment' },
      { key: 'estimatedGuests', label: 'Invitați' },
      { key: 'desiredDate', label: 'Data dorită', render: (row) => (row.desiredDate ? new Date(row.desiredDate).toLocaleDateString('ro-RO') : '-') },
      { key: 'status', label: 'Status', render: (row) => <StatusBadge status={row.status} /> },
      { key: 'source', label: 'Sursă' },
    ],
    fields: [
      { name: 'clientId', label: 'Client', type: 'relation', endpoint: '/clients', labelFor: (row) => row.fullName },
      { name: 'eventType', label: 'Tip eveniment' },
      { name: 'estimatedGuests', label: 'Invitați estimați', type: 'number', optional: true },
      { name: 'desiredDate', label: 'Data dorită', type: 'date', optional: true },
      { name: 'status', label: 'Status', type: 'select', options: leadStatuses, defaultValue: 'new' },
      { name: 'source', label: 'Sursă', optional: true },
      { name: 'notes', label: 'Note', type: 'textarea', full: true, optional: true },
    ],
  },
  offers: {
    title: 'Oferte',
    subtitle: 'Propuneri comerciale și pachete trimise',
    endpoint: '/offers',
    fallback: [],
    createLabel: 'Ofertă nouă',
    searchPlaceholder: 'Caută ofertă...',
    columns: [
      { key: 'client', label: 'Client', render: (row) => row.client?.fullName || row.clientId },
      { key: 'venue', label: 'Locație', render: (row) => row.venue?.name || row.venueId },
      { key: 'selectedPackage', label: 'Pachet' },
      { key: 'guestsCount', label: 'Invitați' },
      { key: 'totalAmount', label: 'Total', render: (row) => money(row.totalAmount) },
      { key: 'status', label: 'Status', render: (row) => <StatusBadge status={row.status} /> },
    ],
    fields: [
      { name: 'clientId', label: 'Client', type: 'relation', endpoint: '/clients', labelFor: (row) => row.fullName },
      { name: 'eventId', label: 'Eveniment', type: 'relation', endpoint: '/events', labelFor: (row) => row.title, optional: true },
      { name: 'venueId', label: 'Locație', type: 'relation', endpoint: '/venues', labelFor: (row) => row.name },
      { name: 'eventType', label: 'Tip eveniment', type: 'select', options: eventTypes },
      { name: 'guestsCount', label: 'Invitați', type: 'number' },
      { name: 'selectedPackage', label: 'Pachet' },
      { name: 'totalAmount', label: 'Total', type: 'number' },
      { name: 'status', label: 'Status', type: 'select', options: offerStatuses, defaultValue: 'draft' },
      { name: 'validUntil', label: 'Valabil până la', type: 'date', optional: true },
    ],
    rowActions: (row, reload, setError) => (
      <button
        className="btn"
        type="button"
        onClick={async () => {
          try {
            await apiRequest(`/offers/${row.id}/accept`, { method: 'POST', body: JSON.stringify({}) });
            await reload();
          } catch (err) {
            setError(err.message);
          }
        }}
      >
        Acceptă
      </button>
    ),
  },
  contracts: {
    title: 'Contracte',
    subtitle: 'Contracte generate și status semnare',
    endpoint: '/contracts',
    fallback: [],
    createLabel: 'Contract nou',
    searchPlaceholder: 'Caută contract...',
    columns: [
      { key: 'contractNumber', label: 'Nr. contract' },
      { key: 'client', label: 'Client', render: (row) => row.client?.fullName || row.clientId },
      { key: 'event', label: 'Eveniment', render: (row) => row.event?.title || row.eventId },
      { key: 'status', label: 'Status', render: (row) => <StatusBadge status={row.status} /> },
      { key: 'fileUrl', label: 'PDF', render: (row) => (row.fileUrl ? <a href={row.fileUrl} target="_blank">Deschide</a> : '-') },
    ],
    fields: [
      { name: 'eventId', label: 'Eveniment', type: 'relation', endpoint: '/events', labelFor: (row) => row.title },
      { name: 'clientId', label: 'Client', type: 'relation', endpoint: '/clients', labelFor: (row) => row.fullName },
      { name: 'contractNumber', label: 'Nr. contract', optional: true },
      { name: 'status', label: 'Status', type: 'select', options: ['draft', 'signed', 'cancelled'].map((value) => ({ value, label: value })), defaultValue: 'draft' },
      { name: 'signedAt', label: 'Semnat la', type: 'date', optional: true },
      { name: 'fileUrl', label: 'URL fișier', optional: true },
    ],
    rowActions: (row, reload, setError) => (
      <>
        <ContractSignButton contract={row} reload={reload} setError={setError} />
        <button
          className="btn"
          type="button"
          onClick={async () => {
            try {
              await apiRequest(`/contracts/${row.id}/generate-pdf`, { method: 'POST', body: JSON.stringify({}) });
              await reload();
            } catch (err) {
              setError(err.message);
            }
          }}
        >
          PDF
        </button>
        <button
          className="btn primary"
          type="button"
          onClick={async () => {
            try {
              await apiRequest(`/contracts/${row.id}/create-invoice`, { method: 'POST', body: JSON.stringify({}) });
              setError('');
              window.alert('Factura a fost generată din contract. O găsești în secțiunea Facturi.');
              await reload();
            } catch (err) {
              setError(err.message);
            }
          }}
        >
          Factură
        </button>
      </>
    ),
  },
  invoices: {
    title: 'Facturi',
    subtitle: 'Toate facturile emise',
    endpoint: '/invoices',
    fallback: demoInvoices,
    createLabel: 'Factură nouă',
    searchPlaceholder: 'Caută factură...',
    columns: [
      { key: 'invoiceNumber', label: 'Nr. factură' },
      { key: 'client', label: 'Client', render: (row) => row.client?.fullName || row.clientId },
      { key: 'dueDate', label: 'Scadență', render: (row) => (row.dueDate ? new Date(row.dueDate).toLocaleDateString('ro-RO') : '-') },
      { key: 'amount', label: 'Total', render: (row) => money(row.amount) },
      { key: 'status', label: 'Status', render: (row) => <StatusBadge status={row.status} /> },
    ],
    fields: [
      { name: 'eventId', label: 'Eveniment', type: 'relation', endpoint: '/events', labelFor: (row) => row.title },
      { name: 'clientId', label: 'Client', type: 'relation', endpoint: '/clients', labelFor: (row) => row.fullName },
      { name: 'invoiceNumber', label: 'Nr. factură', optional: true },
      { name: 'amount', label: 'Suma', type: 'number' },
      { name: 'status', label: 'Status', type: 'select', options: invoiceStatuses, defaultValue: 'unpaid' },
      { name: 'dueDate', label: 'Scadență', type: 'date', optional: true },
    ],
    rowActions: (row, reload, setError) => (
      <button
        className="btn"
        type="button"
        onClick={async () => {
          try {
            await apiRequest(`/invoices/${row.id}/generate-pdf`, { method: 'POST', body: JSON.stringify({}) });
            await reload();
          } catch (err) {
            setError(err.message);
          }
        }}
      >
        PDF
      </button>
    ),
  },
  payments: {
    title: 'Plăți',
    subtitle: 'Încasări, avansuri și resturi de plată',
    endpoint: '/payments',
    fallback: [],
    createLabel: 'Plată nouă',
    searchPlaceholder: 'Caută plată...',
    columns: [
      { key: 'client', label: 'Client', render: (row) => row.client?.fullName || row.clientId },
      { key: 'event', label: 'Eveniment', render: (row) => row.event?.title || row.eventId },
      { key: 'amount', label: 'Suma', render: (row) => money(row.amount) },
      { key: 'paymentMethod', label: 'Metodă' },
      { key: 'status', label: 'Status', render: (row) => <StatusBadge status={row.status} /> },
      { key: 'paidAt', label: 'Plătit la', render: (row) => (row.paidAt ? new Date(row.paidAt).toLocaleDateString('ro-RO') : '-') },
    ],
    fields: [
      { name: 'eventId', label: 'Eveniment', type: 'relation', endpoint: '/events', labelFor: (row) => row.title },
      { name: 'invoiceId', label: 'Factură', type: 'relation', endpoint: '/invoices', labelFor: (row) => row.invoiceNumber, optional: true },
      { name: 'clientId', label: 'Client', type: 'relation', endpoint: '/clients', labelFor: (row) => row.fullName },
      { name: 'amount', label: 'Suma', type: 'number' },
      { name: 'paymentMethod', label: 'Metodă', type: 'select', options: ['cash', 'bank_transfer', 'card', 'stripe'].map((value) => ({ value, label: value })), defaultValue: 'cash' },
      { name: 'status', label: 'Status', type: 'select', options: paymentStatuses, defaultValue: 'pending' },
      { name: 'externalPaymentId', label: 'ID extern', optional: true },
      { name: 'paidAt', label: 'Plătit la', type: 'date', optional: true },
    ],
    rowActions: (row, reload, setError) => (
      <button
        className="btn primary"
        type="button"
        onClick={async () => {
          try {
            const result = await createResource('/payments/create-checkout-session', {
              eventId: row.eventId,
              invoiceId: row.invoiceId || undefined,
              clientId: row.clientId,
              amount: Number(row.amount),
              description: `Plată ${row.event?.title || ''}`.trim(),
              successUrl: `${window.location.origin}/payments?stripe=success`,
              cancelUrl: `${window.location.origin}/payments?stripe=cancelled`,
            });
            if (result.checkoutSession?.url) window.location.href = result.checkoutSession.url;
            else await reload();
          } catch (err) {
            setError(err.message);
          }
        }}
      >
        Stripe
      </button>
    ),
  },
};

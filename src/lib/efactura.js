/**
 * Client HTTP pentru e-factura-api.
 * Construieste payload UBL din datele Eventra si trimite catre ANAF SPV.
 */
import { config } from '../config/env.js';

const BASE_URL = config.efactura.url;
const API_KEY = config.efactura.apiKey;

async function request(method, path, body) {
  const opts = {
    method,
    headers: { 'X-API-Key': API_KEY },
  };
  if (body !== undefined) {
    opts.headers['Content-Type'] = 'application/json';
    opts.body = JSON.stringify(body);
  }
  const res = await fetch(`${BASE_URL}${path}`, opts);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(`e-factura-api ${res.status}: ${JSON.stringify(data)}`);
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

/**
 * Construieste payload-ul UBL pornind de la datele din Eventra.
 * @param {object} invoice  - record Invoice din Prisma (cu .event si .client incluse)
 * @param {object} organization - record Organization din Prisma
 */
export function buildEfacturaPayload(invoice, organization) {
  const vatRate = Number(invoice.vatRate ?? config.efactura.defaultVatRate);
  const totalWithVat = Number(invoice.amount);
  const totalWithoutVat =
    vatRate > 0
      ? Math.round((totalWithVat / (1 + vatRate / 100)) * 100) / 100
      : totalWithVat;
  const totalVat = Math.round((totalWithVat - totalWithoutVat) * 100) / 100;
  const currency = 'RON';

  const client = invoice.client;

  const supplierAddress = {
    street: organization.street || '',
    city: organization.city || '',
    county: organization.county || 'RO-B',
    country: 'RO',
  };

  const customerAddress = {
    street: client.street || '',
    city: client.city || '',
    county: client.county || 'RO-B',
    country: 'RO',
  };

  // Linii factura: fie detaliate din invoice.items, fie o linie unica
  const lines = Array.isArray(invoice.items) && invoice.items.length > 0
    ? invoice.items.map((item, idx) => {
        const lv = Number(item.vatRate ?? vatRate);
        const lTotal = Number(item.amount ?? item.total ?? 0);
        const lNet = lv > 0 ? Math.round((lTotal / (1 + lv / 100)) * 100) / 100 : lTotal;
        const qty = Number(item.quantity ?? 1);
        const unitPrice = qty > 0 ? Math.round((lNet / qty) * 10000) / 10000 : lNet;
        return {
          line_no: String(idx + 1),
          name: item.name || item.description || 'Serviciu',
          quantity: String(qty),
          uom: item.uom || 'C62',
          unit_price: [String(unitPrice), currency],
          line_amount: [String(lNet), currency],
          vat_category: lv === 0 ? 'Z' : 'S',
          vat_percent: String(lv),
        };
      })
    : [
        {
          line_no: '1',
          name: invoice.event?.title
            ? `Servicii organizare eveniment - ${invoice.event.title}`
            : 'Servicii organizare eveniment',
          quantity: '1',
          uom: 'C62',
          unit_price: [String(totalWithoutVat), currency],
          line_amount: [String(totalWithoutVat), currency],
          vat_category: vatRate === 0 ? 'Z' : 'S',
          vat_percent: String(vatRate),
        },
      ];

  const paymentMeans = organization.iban
    ? [{ code: '31', account: organization.iban, account_name: organization.bankName || '' }]
    : [];

  const issueDate = invoice.createdAt.toISOString().split('T')[0];
  const dueDate = invoice.dueDate
    ? invoice.dueDate.toISOString().split('T')[0]
    : undefined;

  return {
    payload: {
      id: invoice.invoiceNumber,
      issue_date: issueDate,
      ...(dueDate && { due_date: dueDate }),
      currency,
      supplier: {
        cif: organization.cif || '',
        name: organization.name,
        address: supplierAddress,
      },
      customer: {
        cif: client.cif || '',
        name: client.fullName,
        address: customerAddress,
      },
      payment_means: paymentMeans,
      tax: {
        total: [String(totalVat), currency],
        subtotals: [
          {
            taxable: [String(totalWithoutVat), currency],
            amount: [String(totalVat), currency],
            category: vatRate === 0 ? 'Z' : 'S',
            percent: String(vatRate),
          },
        ],
      },
      totals: {
        line_extension: [String(totalWithoutVat), currency],
        tax_exclusive: [String(totalWithoutVat), currency],
        tax_inclusive: [String(totalWithVat), currency],
        payable: [String(totalWithVat), currency],
      },
      lines,
    },
  };
}

/**
 * Trimite factura la e-factura-api pentru validare + incarcare ANAF.
 * @param {string} efacturaCompanyId - ID-ul companiei in e-factura-api
 * @param {object} invoice  - record Invoice (cu .event si .client incluse)
 * @param {object} organization - record Organization
 * @returns {Promise<{validated: boolean, upload: object}>}
 */
export async function submitToEfactura(efacturaCompanyId, invoice, organization) {
  const payload = buildEfacturaPayload(invoice, organization);
  return request('POST', `/api/v1/companies/${efacturaCompanyId}/outbound/`, payload);
}

/**
 * Interogheaza statusul curent al facturii din e-factura-api.
 * @param {string} invoiceNumber
 * @returns {Promise<object[]>}
 */
export async function getEfacturaInvoiceStatus(invoiceNumber) {
  const data = await request(
    'GET',
    `/api/v1/invoices/?direction=out&number=${encodeURIComponent(invoiceNumber)}`,
  );
  return data.results ?? data;
}

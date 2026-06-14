# Stripe Payments Service

Microserviciu Node.js generic pentru plăți online cu **Stripe**, gata de integrat în orice aplicație a ta (Gestio, DentalFlow, e-Factura etc.). Suportă:

- 🛒 **Plăți one-time** (produse) prin Stripe Checkout sau Payment Intents (UI custom)
- 🔁 **Abonamente** (recurring) cu trial, schimbare de plan, anulare / reluare
- 👤 **Clienți** (find-or-create) și **Billing Portal** (self-service)
- 🔔 **Webhook-uri** verificate, idempotente, normalizate și **redirecționate semnat** către aplicațiile tale
- 🏢 **Multi-app**: o singură instanță deservește mai multe proiecte, fiecare cu cheia lui API și cu propriul URL de webhook
- 🐳 **Docker** + docker-compose (cu Postgres) pentru hosting ușor pe serverul tău

---

## 1. Cum funcționează (arhitectura)

```
  Aplicația ta (Gestio/DentalFlow/...)
        │  1) cere o sesiune de plată (cu cheia API)
        ▼
  ┌─────────────────────────┐        ┌──────────┐
  │ stripe-payments-service │ ─────► │  Stripe  │
  └─────────────────────────┘        └──────────┘
        ▲                                   │
        │  3) eveniment normalizat          │ 2) webhook semnat
        │     + semnat HMAC                 ▼
        └────────────────────────── (acest serviciu primește, verifică,
                                      deduplichează și forwardează)
```

Serviciul este **sursă unică pentru integrarea Stripe**. Aplicațiile tale nu mai țin logică Stripe — doar cheamă acest API și primesc înapoi evenimentele relevante.

---

## 2. Pornire rapidă (Docker — recomandat)

```bash
cp .env.example .env
# editează .env: pune cheile Stripe, API_KEYS, WEBHOOK_FORWARDS
docker compose up -d --build
curl http://localhost:3000/health
```

Postgres pornește automat în compose. Serviciul rulează pe `:3000`.

## 3. Pornire locală (fără Docker)

```bash
npm install
cp .env.example .env   # completează valorile
npm run dev            # sau: npm start
```

Fără `DATABASE_URL`, serviciul rulează **stateless** (idempotency în memorie — bun pentru dev, nu recomandat în producție cu mai multe instanțe).

---

## 4. Configurare (.env)

| Variabilă | Descriere |
|---|---|
| `STRIPE_SECRET_KEY` | Cheia secretă Stripe (`sk_test_...` / `sk_live_...`) |
| `STRIPE_WEBHOOK_SECRET` | Signing secret-ul endpoint-ului de webhook (`whsec_...`) |
| `API_KEYS` | `app:cheie` separate prin virgulă. Ex: `gestio:abc,dentalflow:xyz` |
| `WEBHOOK_FORWARDS` | `app:url` — unde trimitem evenimentele fiecărei aplicații |
| `WEBHOOK_FORWARD_URL` | Fallback dacă evenimentul nu are `app` în metadata |
| `WEBHOOK_FORWARD_SECRET` | Secret HMAC pentru semnarea payload-ului forwardat |
| `DATABASE_URL` | Postgres (opțional local; setat automat în compose) |
| `DEFAULT_CURRENCY` | Implicit `ron` |
| `DEFAULT_SUCCESS_URL` / `DEFAULT_CANCEL_URL` | URL-uri fallback pentru checkout |
| `CORS_ORIGINS` | `*` sau listă separată prin virgulă |

Generează chei random: `openssl rand -hex 32`.

---

## 5. Autentificare

Toate rutele `/v1/*` cer o cheie API, în oricare din formele:

```
Authorization: Bearer <cheie>
x-api-key: <cheie>
```

Numele aplicației asociat cheii se atașează automat în `metadata.app` la obiectele Stripe, ca să putem ruta înapoi webhook-urile.

---

## 6. Endpoint-uri

| Metodă | Rută | Descriere |
|---|---|---|
| GET | `/health` | Status (fără auth) |
| GET | `/v1/products` | Listă produse + prețuri active |
| POST | `/v1/customers` | Find-or-create client |
| GET | `/v1/customers/:id` | Detalii client |
| GET | `/v1/customers/:id/subscriptions` | Abonamentele clientului |
| POST | `/v1/checkout/session` | Sesiune Checkout (one-time **sau** abonament) |
| POST | `/v1/checkout/payment-intent` | PaymentIntent pentru UI custom |
| POST | `/v1/portal/session` | Billing Portal (self-service) |
| GET | `/v1/subscriptions/:id` | Detalii abonament |
| POST | `/v1/subscriptions/:id/cancel` | Anulează (la final de perioadă sau imediat) |
| POST | `/v1/subscriptions/:id/resume` | Anulează anularea programată |
| POST | `/v1/subscriptions/:id/change` | Schimbă planul (cu proration) |
| POST | `/webhooks/stripe` | Receiver webhook Stripe (semnătură, nu cheie API) |

---

## 7. Exemple

### Plată one-time (produs) — Checkout

```bash
curl -X POST http://localhost:3000/v1/checkout/session \
  -H "x-api-key: CHEIA_GESTIO" -H "content-type: application/json" \
  -d '{
    "mode": "payment",
    "items": [
      { "name": "Geam termopan 120x120", "amount": 45000, "currency": "ron", "quantity": 2 }
    ],
    "customerEmail": "client@exemplu.ro",
    "successUrl": "https://gestio.ro/plata/ok?sid={CHECKOUT_SESSION_ID}",
    "cancelUrl": "https://gestio.ro/plata/anulat",
    "metadata": { "comanda_id": "CMD-1024" }
  }'
# => { "id": "cs_test_...", "url": "https://checkout.stripe.com/c/pay/..." }
```

> `amount` este în **subunități** (bani / cents). 45000 = 450,00 RON.
> Poți folosi și prețuri existente din Stripe: `{ "price": "price_123", "quantity": 1 }`.

### Abonament — Checkout

```bash
curl -X POST http://localhost:3000/v1/checkout/session \
  -H "x-api-key: CHEIA_DENTAL" -H "content-type: application/json" \
  -d '{
    "mode": "subscription",
    "items": [ { "price": "price_abonament_lunar", "quantity": 1 } ],
    "customerEmail": "clinica@exemplu.ro",
    "trialPeriodDays": 14,
    "successUrl": "https://dentalflow.ro/abonament/ok",
    "cancelUrl": "https://dentalflow.ro/abonament/anulat"
  }'
```

Pentru preț ad-hoc recurent, folosește `{ "name": "Plan Pro", "amount": 9900, "interval": "month" }`.

### Plată custom (Payment Intent + Stripe.js)

```bash
curl -X POST http://localhost:3000/v1/checkout/payment-intent \
  -H "x-api-key: CHEIA_GESTIO" -H "content-type: application/json" \
  -d '{ "amount": 12000, "currency": "ron", "description": "Avans comanda" }'
# => { "client_secret": "pi_..._secret_...", ... }  -> confirmi pe frontend cu Stripe.js
```

### Billing Portal

```bash
curl -X POST http://localhost:3000/v1/portal/session \
  -H "x-api-key: CHEIA_DENTAL" -H "content-type: application/json" \
  -d '{ "customerId": "cus_123", "returnUrl": "https://dentalflow.ro/cont" }'
```

### Anulare abonament

```bash
# la finalul perioadei (default)
curl -X POST http://localhost:3000/v1/subscriptions/sub_123/cancel \
  -H "x-api-key: CHEIA_DENTAL"

# imediat
curl -X POST http://localhost:3000/v1/subscriptions/sub_123/cancel \
  -H "x-api-key: CHEIA_DENTAL" -H "content-type: application/json" \
  -d '{ "immediately": true }'
```

---

## 8. Webhook-uri

### a) Configurarea în Stripe

1. Stripe Dashboard → **Developers → Webhooks → Add endpoint**
2. URL: `https://domeniul-tau.ro/webhooks/stripe`
3. Selectează evenimentele (minim recomandate):
   - `checkout.session.completed`
   - `customer.subscription.created` / `updated` / `deleted`
   - `invoice.paid` / `invoice.payment_failed`
   - `payment_intent.succeeded` / `payment_intent.payment_failed`
4. Copiază **Signing secret** (`whsec_...`) în `STRIPE_WEBHOOK_SECRET`.

Pentru test local: `stripe listen --forward-to localhost:3000/webhooks/stripe`.

### b) Cum primește aplicația ta evenimentele

Serviciul verifică semnătura Stripe, deduplichează, salvează (dacă ai Postgres) și **forwardează** un payload normalizat către URL-ul aplicației (din `WEBHOOK_FORWARDS`). Payload-ul arată așa:

```json
{
  "event_id": "evt_123",
  "type": "checkout.session.completed",
  "app": "gestio",
  "mode": "payment",
  "payment_status": "paid",
  "amount_total": 90000,
  "currency": "ron",
  "customer": "cus_123",
  "metadata": { "comanda_id": "CMD-1024" },
  "raw": { /* evenimentul Stripe complet */ }
}
```

Dacă ai setat `WEBHOOK_FORWARD_SECRET`, payload-ul vine semnat în header-ul `X-Service-Signature` (HMAC-SHA256 peste body-ul brut). Verifică-l în aplicația ta:

```js
// Express, în aplicația ta (Gestio / DentalFlow / Next.js API route)
import crypto from 'node:crypto';

app.post('/api/stripe/webhook', express.json(), (req, res) => {
  const expected = crypto
    .createHmac('sha256', process.env.WEBHOOK_FORWARD_SECRET)
    .update(JSON.stringify(req.body))
    .digest('hex');

  if (req.get('x-service-signature') !== expected) {
    return res.status(401).end();
  }

  const evt = req.body;
  switch (evt.type) {
    case 'checkout.session.completed':
      // marchează comanda evt.metadata.comanda_id ca platită
      break;
    case 'customer.subscription.deleted':
      // dezactivează abonamentul
      break;
  }
  res.json({ ok: true });
});
```

> Notă: pentru a obține exact același HMAC, verifică peste body-ul brut. Cel mai sigur e să folosești `express.raw()` pe acest endpoint și să faci HMAC peste `req.body` (buffer), apoi `JSON.parse`. Exemplul de mai sus merge dacă serializarea JSON e identică; pentru robustețe maximă folosește raw body.

---

## 9. Client helper (Node) pentru aplicațiile tale

```js
class PaymentsClient {
  constructor(baseUrl, apiKey) {
    this.baseUrl = baseUrl;
    this.apiKey = apiKey;
  }
  async #post(path, body) {
    const res = await fetch(this.baseUrl + path, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-api-key': this.apiKey },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error((await res.json()).error?.message);
    return res.json();
  }
  checkout(body) { return this.#post('/v1/checkout/session', body); }
  paymentIntent(body) { return this.#post('/v1/checkout/payment-intent', body); }
  portal(body) { return this.#post('/v1/portal/session', body); }
  cancelSub(id, immediately = false) { return this.#post(`/v1/subscriptions/${id}/cancel`, { immediately }); }
}

const payments = new PaymentsClient('https://plati.domeniul-tau.ro', process.env.PAYMENTS_API_KEY);
const { url } = await payments.checkout({ mode: 'payment', items: [{ price: 'price_x' }], successUrl, cancelUrl });
```

---

## 10. Producție — recomandări

- Pune serviciul în spatele unui reverse proxy (Nginx / Caddy) cu HTTPS. Webhook-ul Stripe trebuie să ajungă pe HTTPS.
- `trust proxy` e deja activat pentru a obține IP-ul real în spatele proxy-ului.
- Păstrează `STRIPE_WEBHOOK_SECRET` și cheile API în secrete (nu în repo).
- Pentru mai multe instanțe (scalare), păstrează `DATABASE_URL` setat — idempotency-ul în memorie nu e partajat între instanțe.
- Tabelul `stripe_events` îți dă audit + posibilitatea de re-forward manual la nevoie.

---

## 11. Structura proiectului

```
src/
├── config/env.js              # validare & parsare configurare (zod)
├── lib/{stripe,db,logger}.js  # clienți & utilitare
├── middleware/                # auth (API key), error handler
├── services/                  # logica Stripe (checkout, sub, customer, product, webhook)
├── routes/                    # rutele Express
├── app.js                     # wiring Express (atenție la ordinea raw-body pt webhook)
└── server.js                  # entrypoint + init DB + graceful shutdown
```

Licență: folosește-l liber în proiectele tale.

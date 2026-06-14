# Eveniment App API - Rezumat pentru Frontend

Acest document rezumă backend-ul implementat și contractul API util pentru construirea interfeței frontend.

## Backend Implementat

Stack:

- Node.js + Express
- PostgreSQL
- Prisma ORM
- JWT auth
- Zod validation
- PDFKit pentru generare documente
- Stripe integration prin serviciul existent `stripe-payments-service`

Funcționalități:

- autentificare utilizatori
- refresh tokens
- logout
- resetare parolă
- invitații useri
- roluri: `admin`, `manager`, `staff`
- multi-tenant prin organizații
- locații / saloane
- clienți
- lead-uri
- conversie lead în eveniment
- evenimente
- calendar evenimente
- task-uri/checklist pe eveniment
- oferte
- contracte
- facturi
- plăți manuale și Stripe
- dashboard statistici
- audit logs
- soft delete
- numerotare automată contracte/facturi
- generare PDF contracte/facturi
- validare conflict sală/data/oră
- rate limiting
- backup PostgreSQL

## URL Local

```text
http://localhost:4000
```

Health check:

```http
GET /health
```

## Autentificare

Login:

```http
POST /auth/login
Content-Type: application/json
```

Body:

```json
{
  "email": "admin@eveniment.local",
  "password": "Admin123!"
}
```

Response:

```json
{
  "data": {
    "token": "jwt-access-token",
    "refreshToken": "opaque-refresh-token",
    "user": {
      "id": "...",
      "organizationId": "...",
      "name": "Admin Eveniment",
      "email": "admin@eveniment.local",
      "role": "admin",
      "organization": {
        "id": "...",
        "name": "Eveniment Demo",
        "slug": "eveniment-demo"
      }
    }
  }
}
```

Frontend-ul trebuie să trimită access token-ul pe toate rutele protejate:

```http
Authorization: Bearer <token>
```

Refresh token:

```http
POST /auth/refresh
```

Body:

```json
{
  "refreshToken": "opaque-refresh-token"
}
```

Important: refresh token-ul se rotește. FE-ul trebuie să înlocuiască token-ul vechi cu cel nou primit.

Logout:

```http
POST /auth/logout
```

Body:

```json
{
  "refreshToken": "opaque-refresh-token"
}
```

User curent:

```http
GET /auth/me
```

Reset password:

```http
POST /auth/password-reset/request
POST /auth/password-reset/confirm
```

Invitații:

```http
POST /auth/invitations
POST /auth/invitations/accept
```

## Format General Response

Listare:

```json
{
  "data": [],
  "meta": {
    "page": 1,
    "pageSize": 25,
    "total": 100
  }
}
```

Obiect singular:

```json
{
  "data": {}
}
```

Eroare:

```json
{
  "error": {
    "code": "validation_error",
    "message": "Date invalide.",
    "details": {}
  }
}
```

Query listare standard:

```http
?page=1&pageSize=25&search=text
```

## Roluri

`admin`:

- acces complet
- poate șterge soft resurse
- poate modifica organizația
- poate vedea audit logs
- poate invita useri

`manager`:

- poate crea/modifica operațional: evenimente, lead-uri, oferte, contracte, facturi, plăți
- poate genera PDF-uri
- poate vedea dashboard

`staff`:

- poate citi date
- poate lucra cu task-uri/checklist
- nu poate modifica financiar/contractual

## Organizație

```http
GET /organization/me
PATCH /organization/me
GET /organization/audit-logs
```

`GET /organization/audit-logs` este pentru `admin`.

## Venues / Locations

```http
GET /venues
POST /venues
GET /venues/:id
PATCH /venues/:id
DELETE /venues/:id
```

Body create/update:

```json
{
  "name": "Salon Royal",
  "address": "Str. Principala 12, Bucuresti",
  "capacity": 260,
  "description": "Salon premium pentru nunti si corporate.",
  "status": "active"
}
```

Status:

```text
active | inactive | maintenance
```

## Clients

```http
GET /clients
POST /clients
GET /clients/:id
PATCH /clients/:id
DELETE /clients/:id
```

Body:

```json
{
  "fullName": "Andreea Popescu",
  "phone": "+40722111222",
  "email": "andreea.popescu@example.com",
  "notes": "Preferinte meniu vegetarian."
}
```

## Leads

```http
GET /leads
POST /leads
GET /leads/:id
PATCH /leads/:id
DELETE /leads/:id
POST /leads/:id/convert-to-event
```

Body lead:

```json
{
  "clientId": "uuid",
  "eventType": "wedding",
  "estimatedGuests": 120,
  "desiredDate": "2026-08-20T12:00:00.000Z",
  "status": "new",
  "source": "Instagram",
  "notes": "A cerut oferta."
}
```

Status lead:

```text
new | contacted | viewing | offer_sent | negotiation | won | lost
```

Convert to event:

```json
{
  "venueId": "uuid",
  "title": "Nunta Andreea & Vlad",
  "eventType": "wedding",
  "eventDate": "2026-08-20T12:00:00.000Z",
  "startTime": "18:00",
  "endTime": "03:00",
  "guestsCount": 220,
  "totalAmount": 99000,
  "depositAmount": 15000,
  "notes": "Tema elegant."
}
```

## Events

```http
GET /events
POST /events
GET /events/:id
PATCH /events/:id
DELETE /events/:id
GET /events/calendar?startDate=&endDate=&venueId=
GET /events/:id/tasks
POST /events/:id/tasks
```

Body event:

```json
{
  "clientId": "uuid",
  "venueId": "uuid",
  "title": "Nunta Andreea & Vlad",
  "eventType": "wedding",
  "eventDate": "2026-08-20T12:00:00.000Z",
  "startTime": "18:00",
  "endTime": "03:00",
  "guestsCount": 220,
  "status": "confirmed",
  "totalAmount": 99000,
  "depositAmount": 15000,
  "paidAmount": 15000,
  "notes": "Tema alb-verde."
}
```

Event type:

```text
wedding | baptism | birthday | corporate | other
```

Event status:

```text
draft | confirmed | in_preparation | completed | cancelled
```

Calendar:

```http
GET /events/calendar?startDate=2026-08-01&endDate=2026-08-31
GET /events/calendar?startDate=2026-08-01&endDate=2026-08-31&venueId=uuid
```

Conflict sală:

Dacă FE încearcă să creeze/modifice un eveniment peste alt eveniment în aceeași sală și același interval, API-ul returnează:

```json
{
  "error": {
    "code": "venue_conflict",
    "message": "Exista deja un eveniment in aceasta locatie in intervalul ales."
  }
}
```

## Event Tasks / Checklist

```http
GET /events/:id/tasks
POST /events/:id/tasks
```

Body:

```json
{
  "title": "Confirmare meniu final",
  "description": "Sunat clientul pentru confirmare.",
  "status": "todo",
  "dueDate": "2026-08-10T12:00:00.000Z",
  "assignedTo": "uuid-user"
}
```

Task status:

```text
todo | in_progress | done
```

## Offers

```http
GET /offers
POST /offers
GET /offers/:id
PATCH /offers/:id
DELETE /offers/:id
POST /offers/:id/accept
```

Body:

```json
{
  "clientId": "uuid",
  "eventId": "uuid",
  "venueId": "uuid",
  "eventType": "wedding",
  "guestsCount": 220,
  "selectedPackage": "Premium Wedding",
  "totalAmount": 99000,
  "status": "sent",
  "validUntil": "2026-08-01T12:00:00.000Z"
}
```

Offer status:

```text
draft | sent | accepted | rejected
```

## Contracts

```http
GET /contracts
POST /contracts
GET /contracts/:id
PATCH /contracts/:id
DELETE /contracts/:id
POST /contracts/:id/mark-signed
POST /contracts/:id/generate-pdf
```

Body:

```json
{
  "eventId": "uuid",
  "clientId": "uuid",
  "contractNumber": "CTR-2026-0001",
  "status": "draft",
  "signedAt": null,
  "fileUrl": null
}
```

`contractNumber` este opțional. Dacă lipsește, API-ul generează automat un număr per organizație.

Contract status:

```text
draft | signed | cancelled
```

PDF:

```http
POST /contracts/:id/generate-pdf
```

Răspunsul include `fileUrl`, de exemplu:

```text
/documents/contract-CTR-2026-0001.pdf
```

## Invoices

```http
GET /invoices
POST /invoices
GET /invoices/:id
PATCH /invoices/:id
POST /invoices/:id/generate-pdf
```

Body:

```json
{
  "eventId": "uuid",
  "clientId": "uuid",
  "invoiceNumber": "INV-2026-0001",
  "amount": 15000,
  "status": "unpaid",
  "dueDate": "2026-08-10T12:00:00.000Z"
}
```

`invoiceNumber` este opțional. Dacă lipsește, API-ul generează automat un număr per organizație.

Invoice status:

```text
unpaid | partially_paid | paid | cancelled
```

PDF:

```http
POST /invoices/:id/generate-pdf
```

## Payments

```http
GET /payments
POST /payments
GET /payments/:id
PATCH /payments/:id
DELETE /payments/:id
POST /payments/create-checkout-session
POST /payments/webhook
```

Body payment manual:

```json
{
  "eventId": "uuid",
  "invoiceId": "uuid",
  "clientId": "uuid",
  "amount": 15000,
  "paymentMethod": "bank_transfer",
  "status": "succeeded",
  "externalPaymentId": null,
  "paidAt": "2026-08-01T12:00:00.000Z"
}
```

Payment method:

```text
cash | bank_transfer | card | stripe
```

Payment status:

```text
pending | succeeded | failed | refunded
```

Stripe checkout:

```http
POST /payments/create-checkout-session
```

Body:

```json
{
  "eventId": "uuid",
  "invoiceId": "uuid",
  "clientId": "uuid",
  "amount": 15000,
  "description": "Avans eveniment",
  "successUrl": "http://localhost:3000/payments/success",
  "cancelUrl": "http://localhost:3000/payments/cancelled"
}
```

Response:

```json
{
  "data": {
    "payment": {
      "id": "uuid",
      "status": "pending",
      "paymentMethod": "stripe"
    },
    "checkoutSession": {
      "id": "cs_test_...",
      "url": "https://checkout.stripe.com/..."
    }
  }
}
```

FE-ul trebuie să redirecționeze utilizatorul către `checkoutSession.url`.

## Dashboard

```http
GET /dashboard/summary
```

Response:

```json
{
  "data": {
    "currentMonthEvents": 2,
    "estimatedRevenue": 141000,
    "actualRevenue": 22000,
    "outstandingDeposits": 3000,
    "venueOccupancy": [],
    "next7DaysEvents": [],
    "topVenuesByOccupancy": [],
    "eventTypeDistribution": []
  }
}
```

Pentru FE, dashboard-ul poate afișa:

- card total evenimente luna curentă
- card încasări estimate
- card încasări reale
- card avansuri restante
- listă evenimente următoarele 7 zile
- chart distribuție evenimente pe tip
- chart/top locații după ocupare

## Soft Delete

`DELETE` nu șterge fizic resursele principale. API-ul setează `deletedAt`, iar listările/get-urile standard ascund resursele șterse.

Pentru FE, după `DELETE`, elimină item-ul din listă local.

## Documente PDF

Documentele generate se servesc static:

```text
http://localhost:4000/documents/<fisier.pdf>
```

Exemple:

```text
/documents/contract-CTR-2026-0001.pdf
/documents/invoice-INV-2026-0001.pdf
```

## Conturi Demo

```text
admin@eveniment.local / Admin123!
manager@eveniment.local / Manager123!
```

## Comenzi Backend Utile

```bash
npm install
docker compose up -d postgres
npm run db:deploy
npm run db:seed
npm run dev
```

Teste:

```bash
DATABASE_URL="postgresql://eveniment:eveniment@localhost:5432/eveniment_app" \
JWT_SECRET="temporary-dev-secret-with-more-than-24-chars" \
npm test
```

Backup:

```bash
DATABASE_URL="postgresql://eveniment:eveniment@localhost:5432/eveniment_app" npm run backup
```


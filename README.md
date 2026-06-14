# Eveniment App Backend

Backend MVP pentru SaaS de management evenimente HoReCa: locații, clienți, lead-uri, evenimente, calendar, oferte, contracte, facturi, plăți, task-uri și dashboard.

## Ce am găsit

În `eveniment-app` exista serviciul `stripe-payments-service`, un microserviciu Express pentru Stripe cu API key auth, checkout sessions, payment intents, subscriptions, portal și webhook forwarding. L-am păstrat separat și îl refolosesc din backend-ul principal prin `POST /payments/create-checkout-session`.

Backend-ul principal este la rădăcina proiectului și folosește Node.js + Express + Prisma + PostgreSQL.

## Capabilități production-ready adăugate

- Multi-tenant prin `Organization`, cu toate resursele operaționale scoped pe organizația utilizatorului.
- Refresh tokens persistate și rotate la fiecare `/auth/refresh`.
- Reset password cu token hash-uit și expirare configurabilă.
- Invitații useri cu token hash-uit și rol asignat.
- Audit logs pentru mutații CRUD și acțiuni administrative.
- Soft delete pentru resursele principale.
- Numerotare automată per organizație pentru contracte și facturi.
- Generare PDF locală pentru contracte și facturi.
- Rate limiting global și request id pe fiecare răspuns.
- Backup script pentru PostgreSQL.
- Validare conflict locație/datã/oră pentru evenimente.
- Teste de integrare cu `node:test` + `supertest`.

## Pornire locală

1. Instalează dependențele:

```bash
npm install
```

2. Pornește PostgreSQL:

```bash
docker compose up -d postgres
```

3. Creează `.env` din exemplu și schimbă secretele:

```bash
cp .env.example .env
```

4. Rulează migrațiile și seed-ul:

```bash
npm run db:migrate
npm run db:seed
```

5. Pornește API-ul:

```bash
npm run dev
```

Serverul pornește pe `http://localhost:4000`.

Conturi demo:

- `admin@eveniment.local` / `Admin123!`
- `manager@eveniment.local` / `Manager123!`

## Auth avansat

- `POST /auth/login` returnează `token` și `refreshToken`.
- `POST /auth/refresh` rotește refresh token-ul.
- `POST /auth/logout` revocă refresh token-ul.
- `POST /auth/password-reset/request` creează un token de reset. În development îl returnează în răspuns; în producție trebuie trimis prin email.
- `POST /auth/password-reset/confirm` setează parola nouă.
- `POST /auth/invitations` creează invitații pentru useri noi.
- `POST /auth/invitations/accept` acceptă invitația și creează userul.

## Integrare Stripe

Serviciul existent poate rula din `stripe-payments-service`. Configurează în `.env`:

```env
STRIPE_PAYMENTS_SERVICE_URL="http://localhost:3000"
STRIPE_PAYMENTS_SERVICE_API_KEY="cheia-configurata-in-API_KEYS"
STRIPE_WEBHOOK_FORWARD_SECRET="acelasi-secret-ca-WEBHOOK_FORWARD_SECRET-din-stripe-service"
PAYMENTS_SUCCESS_URL="http://localhost:3000/payments/success?session_id={CHECKOUT_SESSION_ID}"
PAYMENTS_CANCEL_URL="http://localhost:3000/payments/cancelled"
```

În `stripe-payments-service`, setează forward către backend:

```env
WEBHOOK_FORWARDS="eveniment-app:http://localhost:4000/payments/webhook"
WEBHOOK_FORWARD_SECRET="acelasi-secret"
```

Checkout-ul se creează prin backend:

```http
POST /payments/create-checkout-session
Authorization: Bearer <token>
```

Backend-ul creează o plată locală `pending`, cere sesiunea de checkout de la microserviciul Stripe și marchează plata `succeeded` când primește webhook-ul forwardat.

## Endpoint-uri principale

- `POST /auth/login`
- `POST /auth/register` admin only
- `GET /auth/me`
- CRUD: `/venues`, `/clients`, `/leads`, `/events`, `/offers`, `/contracts`, `/invoices`, `/payments`
- `POST /leads/:id/convert-to-event`
- `GET /events/calendar?startDate=&endDate=&venueId=`
- `GET /events/:id/tasks`
- `POST /events/:id/tasks`
- `POST /offers/:id/accept`
- `POST /contracts/:id/mark-signed`
- `POST /payments/create-checkout-session`
- `POST /payments/webhook`
- `GET /dashboard/summary`
- `GET /organization/me`
- `PATCH /organization/me`
- `GET /organization/audit-logs`
- `POST /contracts/:id/generate-pdf`
- `POST /invoices/:id/generate-pdf`

Documentele generate sunt servite din:

```text
/documents/<fisier.pdf>
```

## Backup

```bash
DATABASE_URL="postgresql://..." npm run backup
```

Backup-urile sunt scrise în `backups/`.

## Teste

Testele de integrare presupun o bază migrată și seed-uită:

```bash
npm run db:deploy
npm run db:seed
DATABASE_URL="postgresql://eveniment:eveniment@localhost:5432/eveniment_app" \
JWT_SECRET="temporary-dev-secret-with-more-than-24-chars" \
npm test
```

## Note tehnice

- Baza de date este PostgreSQL, nu SQLite.
- Migrația inițială este în `prisma/migrations/20260614120000_init/migration.sql`.
- Validarea inputului se face cu Zod.
- Autentificarea este JWT Bearer.
- Rolurile suportate sunt `admin`, `manager`, `staff`.
- Ștergerea este restricționată unde există relații critice, ca să nu fie pierdute date financiare sau evenimente active.
- Delete-ul API este soft delete pentru resursele principale.

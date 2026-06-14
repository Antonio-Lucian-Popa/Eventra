# EventPro Frontend

Aplicație Next.js pentru interfața SaaS de management evenimente HoReCa.

## Pornire

```bash
cd frontend
npm install
cp .env.example .env.local
npm run dev
```

Frontend:

```text
http://localhost:3000
```

Backend implicit:

```text
http://localhost:4000
```

Configurează API-ul în `.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:4000
```

## Pagini implementate

- `/` dashboard
- `/calendar` calendar locații
- `/events` CRUD evenimente
- `/events/event-andreea-mihai` detaliu eveniment
- `/clients` clienți
- `/venues` locații
- `/leads` lead-uri
- `/offers` oferte
- `/contracts` contracte
- `/invoices` facturi
- `/payments` plăți
- `/reports` rapoarte
- `/login` autentificare
- `/settings` organizație, invitații și reset password

Interfața are fallback demo data dacă API-ul nu este pornit, ca design-ul să poată fi verificat independent.

## Funcționalități UI

- Auth guard pe rutele interne.
- Login cu access token + refresh token.
- Refresh automat la răspunsuri `401`.
- Logout din sidebar.
- CRUD cu modale create/edit/delete pentru modulele principale.
- Căutare și filtrare de bază pe liste.
- Calendar conectat la `/events/calendar`.
- Acțiuni rapide pentru acceptare ofertă, semnare contract și generare PDF.
- Plată Stripe prin redirect către Stripe-hosted Checkout.
- Setări organizație, invitații useri și reset password.
- Layout responsive desktop/tabletă/mobil.

## Verificări

```bash
npm run build
npm run lint
npm test
npm run test:visual
npm audit --omit=dev
```

Screenshot-urile mobile Playwright sunt salvate în `frontend/test-results/mobile/`.

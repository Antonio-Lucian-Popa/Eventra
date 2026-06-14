# Deployment

## Docker Compose Production

1. Creează `.env.production` sau exportă variabilele:

```env
JWT_SECRET=change-me-with-a-long-random-secret
POSTGRES_USER=eveniment
POSTGRES_PASSWORD=eveniment
POSTGRES_DB=eveniment_app
APP_URL=https://app.example.com
CORS_ORIGINS=https://app.example.com
NEXT_PUBLIC_API_URL=https://api.example.com
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=user
SMTP_PASS=password
SMTP_FROM=no-reply@example.com
```

2. Pornește serviciile:

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml up -d --build
```

3. Rulează migrațiile:

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml exec api npm run db:deploy
```

4. Opțional seed demo:

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml exec api npm run db:seed
```

## Servicii

- Frontend: port `3000`
- API: port `4000`
- PostgreSQL: intern în rețeaua Docker

## Stripe

Frontend-ul nu colectează carduri. Pentru plăți, UI-ul apelează backend-ul, backend-ul creează Stripe Checkout Session prin `stripe-payments-service`, iar browserul este redirecționat către pagina hosted Stripe.

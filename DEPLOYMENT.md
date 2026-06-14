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
NEXT_PUBLIC_BASE_PATH=
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

## Deploy pe subpath `/eventpro`

Dacă aplicația este publicată prin Nginx la `https://novabytecode.ro/eventpro/`, frontend-ul trebuie construit cu prefixul public, iar API-ul trebuie apelat prin ruta proxy-uită de Nginx:

```env
APP_URL=https://novabytecode.ro/eventpro
CORS_ORIGINS=https://novabytecode.ro
NEXT_PUBLIC_BASE_PATH=/eventpro
NEXT_PUBLIC_API_URL=/eventpro/api
```

După schimbarea acestor variabile, reconstruiește imaginea frontend, altfel Next va răspunde cu `404` la `/eventpro/`:

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml up -d --build frontend
```

Config-ul Nginx trebuie să păstreze prefixul către frontend:

```nginx
location /eventpro/ {
  proxy_pass http://eventpro-frontend:3000;
}
```

Pentru API, prefixul se poate tăia către backend:

```nginx
location /eventpro/api/ {
  proxy_pass http://eventpro-api:4000/;
}
```

## Stripe

Frontend-ul nu colectează carduri. Pentru plăți, UI-ul apelează backend-ul, backend-ul creează Stripe Checkout Session prin `stripe-payments-service`, iar browserul este redirecționat către pagina hosted Stripe.

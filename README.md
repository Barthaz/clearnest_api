# ClearNest API

Serwer API dla panelu administracyjnego ClearNest (NestJS + MySQL + Prisma).

## Wymagania

- Node.js 20+
- MySQL 8 (lokalnie przez Docker lub zdalny hosting)

## Szybki start

```bash
npm install
cp .env.example .env   # uzupełnij DATABASE_URL i JWT_SECRET

# Opcjonalnie: lokalny MySQL
docker compose up -d

npm run prisma:generate
npm run db:setup
npm run start:dev
```

- API: `http://localhost:3000/api/v1`
- Swagger: `http://localhost:3000/api/docs`
- Health: `GET http://localhost:3000/api/v1/health`

Domyślne konto po seedzie: `admin` / `admin` (konfigurowalne przez env).

## Role użytkowników

| Rola | Uprawnienia |
|------|-------------|
| `ADMIN` | Pełny dostęp + reset danych + zarządzanie użytkownikami |
| `MANAGER` | Jak admin (bez resetu danych) |
| `WORKER` | Odczyt: własny profil, przypisane placówki, grafik |

## Endpointy (v1)

### Auth
- `POST /api/v1/auth/login`
- `GET /api/v1/auth/me`
- `POST /api/v1/auth/logout`

### Users (admin/manager)
- `GET/POST /api/v1/users`
- `PATCH/DELETE /api/v1/users/:id`

### Facilities
- `GET/POST /api/v1/facilities`
- `GET/PATCH/DELETE /api/v1/facilities/:id`

### Employees
- `GET/POST /api/v1/employees` (admin/manager)
- `GET /api/v1/employees/me` (worker)
- `GET/PATCH/DELETE /api/v1/employees/:id`

### Shifts
- `GET /api/v1/shifts?month=YYYY-MM`
- `POST /api/v1/shifts/generate`
- `GET /api/v1/shifts/sync-status?month=`
- `PATCH /api/v1/shifts/:id/assign|save|unsave|clear|hours`

### Holidays & skips
- `GET /api/v1/holidays?month=`
- `POST /api/v1/holidays/custom/toggle`
- `GET /api/v1/facility-skips?date=`
- `POST /api/v1/facility-skips/toggle`

### Settings
- `GET/PATCH /api/v1/settings`
- `POST /api/v1/settings/reset` (admin)

### Finance
- `GET /api/v1/finance/report?month=`
- `GET /api/v1/finance/dashboard?month=`
- `GET /api/v1/schedule/conflicts?month=`

## Przykład testu (curl)

```bash
# Login
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin"}'

# Lista placówek
curl http://localhost:3000/api/v1/facilities \
  -H "Authorization: Bearer <TOKEN>"
```

## Zmienne środowiskowe

Zobacz [.env.example](.env.example).

## Integracja z panelem

W kolejnym kroku panel (`ClearNest - panel`) podłączysz przez `VITE_API_BASE_URL=http://localhost:3000/api/v1` i warstwę `ApiRepository`.

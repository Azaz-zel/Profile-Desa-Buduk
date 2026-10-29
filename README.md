# Website Profil Desa Buduk

This is the official website of Desa Buduk, Kec. Mengwi, Kab. Badung, Bali. It has a public site for villagers and an admin area (`/kelola`) for village staff.

- `apps/web`: React with Vite.
- `apps/api`: NestJS, Prisma, and MySQL. In production the API also serves the React build, so it all runs as one container.

## Run in development

Requirements: Node 22 or newer, and MySQL 8.

```bash
npm install
cp apps/api/.env.example apps/api/.env   # fill in DATABASE_URL and JWT_SECRET
npm run db:push -w apps/api               # create the tables
npm run seed -w apps/api                  # initial data from buduk.desa.id plus the admin account
npm run dev:api                           # http://localhost:3000
npm run dev:web                           # http://localhost:5173
```

The admin account comes from `SEED_ADMIN_USER` and `SEED_ADMIN_PASSWORD`. If no password is set, the seed generates a random one and prints it once. Change it after your first login under "Ganti kata sandi".

## Tests

```bash
npm test
```

The tests use a separate database, `desa_buduk_test`, and clear it on every run. Set it with `TEST_DATABASE_URL`. Never point it at the production database.

## Run on a server (VPS)

```bash
cp .env.example .env    # fill in DB_PASSWORD, DB_ROOT_PASSWORD, JWT_SECRET
docker compose up -d --build
docker compose exec web npm run seed   # first time only
```

The app listens on `127.0.0.1:3000`. Put Nginx or Caddy in front of it with HTTPS. The admin login cookie is only sent over HTTPS (`COOKIE_SECURE=true`).

Back up two volumes: `db` (the database) and `files` (uploaded photos and documents).

## Roles

| Role | Can do |
| --- | --- |
| Admin utama | Everything, including budget, population data, profile, officials, and accounts |
| Pengelola isi | Write news, upload documents and photos, and respond to complaints |

## Things to confirm with the village

- Office opening hours, so they can be shown on the home page.
- The age-group data. On the old site it is broken (9,497 people recorded as 66 or older), so it is currently hidden.
- Complaint replies are not sent to WhatsApp automatically. Staff press "Chat pelapor", which opens WhatsApp with the message already filled in. Automatic sending needs a paid WhatsApp API.

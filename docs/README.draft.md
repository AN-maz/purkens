# README (DRAFT)

> **Status: DRAFT** — dokumen ini diperbarui di setiap fase dan belum final.
> Ditinjau bersama setelah tiap fase selesai.

# BUKENS

Aplikasi e-commerce untuk UMKM penjual karpet (MVP).

**Stack:** Next.js + Hono.js + Cloudflare Workers + D1 (SQLite) + Drizzle ORM + Better Auth + R2 + DOKU.

---

## Struktur project

```text
bukens/
├── apps/
│   ├── api/                  # Hono + Cloudflare Worker
│   │   ├── src/
│   │   │   ├── index.ts      # entry Worker + mount routes
│   │   │   ├── env.ts        # tipe bindings (DB, secret auth)
│   │   │   ├── auth.ts       # konfigurasi Better Auth
│   │   │   ├── middleware/
│   │   │   │   └── auth.ts   # requireAuth, requireAdmin
│   │   │   ├── routes/
│   │   │   │   ├── products.ts # GET /products, GET /products/:slug
│   │   │   │   ├── cart.ts     # GET /cart, POST/PATCH/DELETE /cart/items
│   │   │   │   ├── addresses.ts # CRUD /addresses
│   │   │   │   ├── me.ts       # GET /me
│   │   │   │   └── admin.ts    # GET /admin/ping (uji admin)
│   │   │   └── db/
│   │   │       ├── schema.ts # definisi tabel (Drizzle)
│   │   │       └── index.ts  # helper koneksi Drizzle → D1
│   │   ├── migrations/       # SQL migration (drizzle-kit)
│   │   ├── seed.sql          # data produk contoh
│   │   ├── seed-admin.sql    # akun admin contoh
│   │   ├── .dev.vars         # secret lokal (tidak di-commit)
│   │   ├── drizzle.config.ts
│   │   ├── wrangler.toml
│   │   └── package.json
│   └── web/                  # Next.js (UI) — App Router + Tailwind
│       ├── src/
│       │   ├── app/          # halaman: /, /products, /products/:slug, /cart, /login, /register
│       │   ├── components/   # Navbar, kartu/detail produk, form login/register
│       │   ├── components/providers/ # Auth, Currency, Cart (React Context)
│       │   └── lib/api.ts    # fetch helper + tipe + format harga
│       ├── .env.local        # NEXT_PUBLIC_API_URL (tidak di-commit)
│       └── package.json
├── docs/                     # dokumen perencanaan + draft ini
└── README.md                 # entry point (lihat docs)
```

---

## Menjalankan API

```bash
cd apps/api
npm install
npm run dev
```

Buka `http://localhost:8787/health` → harus membalas `{"status":"ok"}`.

### Secrets lokal

Buat `apps/api/.dev.vars` (tidak di-commit):

```dotenv
BETTER_AUTH_SECRET=<random string panjang>
BETTER_AUTH_URL=http://localhost:8787
WEB_URL=http://localhost:3000
```

---

## Menjalankan Web (UI)

Jalankan API dulu (di atas), lalu di terminal lain:

```bash
cd apps/web
npm install
npm run dev
```

Buka `http://localhost:3000`. Buat `apps/web/.env.local`:

```dotenv
NEXT_PUBLIC_API_URL=http://localhost:8787
```

> Frontend hanya **menampilkan**; harga & total diambil dari API (sumber kebenaran).

---

## Perintah database

Semua dijalankan dari `apps/api`:

```bash
npm run db:generate          # generate SQL migration dari schema.ts
npm run db:migrate:local     # terapkan migration ke D1 lokal
npm run db:migrate:remote    # terapkan migration ke D1 remote
npm run db:seed:local        # isi data produk contoh ke D1 lokal
npm run db:seed:admin:local  # isi akun admin contoh ke D1 lokal
```

---

## Progress per fase

| Fase | Nama                   | Status |
| ---- | ---------------------- | ------ |
| 0    | Persiapan lingkungan   | ✅      |
| 1    | Kerangka project       | ✅      |
| 2    | Database & Drizzle     | ✅      |
| 3    | API Produk (read-only) | ✅      |
| 4    | Autentikasi            | ✅      |
| 5    | Cart                   | ✅      |
| 6    | Address                | ✅      |
| 7    | Frontend toko          | ✅      |
| ...  | (lihat IMPLEMENTATION) | ⬜      |

---

## Endpoint saat ini

| Method   | Path                | Keterangan                                     |
| -------- | ------------------- | ---------------------------------------------- |
| GET      | `/health`           | cek status service                             |
| GET      | `/health/db`        | cek koneksi D1 (jumlah produk)                 |
| GET      | `/products`         | katalog produk ACTIVE (`?currency=IDR\|USD`)   |
| GET      | `/products/:slug`   | detail produk + gambar (`?currency=...`)       |
| POST     | `/api/auth/sign-up/email` | register (Better Auth)                   |
| POST     | `/api/auth/sign-in/email` | login (Better Auth)                      |
| POST     | `/api/auth/sign-out`      | logout (Better Auth)                     |
| GET      | `/api/auth/get-session`   | ambil session aktif                      |
| GET      | `/me`               | user yang sedang login (butuh session) → 401 bila kosong |
| GET      | `/admin/ping`       | uji akses admin (butuh role ADMIN) → 401/403   |
| GET      | `/cart`             | isi cart + subtotal (`?currency=IDR\|USD`)     |
| POST     | `/cart/items`       | tambah produk ke cart (`{productId, quantity}`), upsert |
| PATCH    | `/cart/items/:id`   | ubah quantity item (`{quantity}`)              |
| DELETE   | `/cart/items/:id`   | hapus item dari cart                           |
| GET      | `/addresses`        | daftar alamat user (default di atas)           |
| POST     | `/addresses`        | buat alamat (alamat pertama otomatis default)  |
| PATCH    | `/addresses/:id`    | ubah alamat / jadikan default                  |
| DELETE   | `/addresses/:id`    | hapus alamat                                   |

> Semua endpoint `/cart*` dan `/addresses*` butuh session (login) dan hanya menyentuh data milik user sendiri.

### Akun contoh (seed lokal)

| Email                | Password       | Role     |
| -------------------- | -------------- | -------- |
| `admin@bukens.test`  | `admin123456`  | ADMIN    |

Akun customer bisa dibuat lewat `POST /api/auth/sign-up/email`.

---

## Catatan uang

- Semua harga disimpan sebagai **INTEGER** (bukan float).
- IDR: rupiah utuh, contoh `750000`.
- USD: dalam **cents**, contoh `7500` = `$75.00`.

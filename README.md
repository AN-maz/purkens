# BUKENS

Aplikasi e-commerce untuk UMKM penjual karpet (MVP).

Stack: Next.js + Hono.js + Cloudflare Workers + D1 + Drizzle ORM + Better Auth + R2 + DOKU.

## Dokumentasi

Semua dokumen perencanaan ada di [`docs/`](./docs):

- [PRD](./docs/PRD.md)
- [Technology Decision](./docs/desion.md)
- [ERD](./docs/erd.md)
- [Business Logic & User Flow](./docs/bisnisLogic&userFlow.md)
- [Plan](./docs/plan.md)
- [Implementation Plan](./docs/IMPLEMENTATION.md)

## Struktur project

```text
bukens/
├── apps/
│   └── api/          # Hono + Cloudflare Worker
├── docs/             # dokumen perencanaan
└── README.md
```

## Menjalankan API

```bash
cd apps/api
npm install
npm run dev
```

Lalu buka `http://localhost:8787/health` — harus membalas `{"status":"ok"}`.

Perintah lain:

```bash
npm run typecheck   # cek tipe TypeScript
npm run deploy      # deploy ke Cloudflare Workers
```

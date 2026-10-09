# Implementation Plan — BUKENS

Rencana implementasi MVP BUKENS, disusun bertahap supaya bisa diikuti sambil belajar.

> **Prinsip:** Kerjakan **satu domain sampai benar-benar jalan**, jangan lompat-lompat. Backend dulu, frontend menyusul. Tunda semua integrasi eksternal (DOKU, R2, Shipping API) sampai inti sistem stabil.

---

## Cara pakai dokumen ini

1. Kerjakan fase secara **urut**. Jangan mulai fase berikutnya sebelum `Definition of Done` fase sekarang terpenuhi.
2. Setiap fase punya:
   - **Tujuan** — apa yang mau dicapai.
   - **Tugas** — checklist kerjaan.
   - **Checkpoint** — cara membuktikan sudah jalan (biasanya `curl` / buka browser).
   - **Belajar** — konsep yang sebaiknya dipahami di fase itu.
3. Tandai `[x]` hanya kalau checkpoint sudah lulus.

---

## Prinsip anti over-engineering

Yang **sengaja TIDAK** dilakukan sampai nanti:

- ❌ Jangan bikin 30 tabel untuk fitur "mungkin nanti dipakai".
- ❌ Jangan bikin microservices, message queue, atau docker-compose di MVP.
- ❌ Jangan bikin abstraksi `repository`/`service` berlapis-lapis kalau baru 3 endpoint.
- ❌ Jangan integrasi DOKU/R2/Shipping API di awal — **pakai mock dulu**.
- ❌ Jangan bikin sistem tracking sendiri (cukup link ke website courier).
- ❌ Jangan automatic currency conversion / automatic tax engine.

Yang **WAJIB** dipegang sejak awal:

- ✅ Harga, stok, dan total **selalu dihitung di backend**.
- ✅ Order menyimpan **snapshot** harga & alamat.
- ✅ `order.status` dan `payment.status` **dipisah**.
- ✅ Semua uang disimpan sebagai **integer** (rupiah utuh / cents), bukan float.
- ✅ Redirect pembayaran bukan bukti bayar — hanya webhook.

---

## Peta fase (ikhtisar)

| Fase | Nama                        | Fokus                        | Perkiraan  |
| ---- | --------------------------- | ---------------------------- | ---------- |
| 0    | Persiapan lingkungan        | Install & cek tooling        | 1–2 hari   |
| 1    | Kerangka project            | Struktur repo, jalankan API  | 2–3 hari   |
| 2    | Database & Drizzle          | Schema, migration, seed      | 3–5 hari   |
| 3    | API Produk (read-only)      | Endpoint katalog             | 2–3 hari   |
| 4    | Autentikasi                 | Register/login/session       | 3–5 hari   |
| 5    | Cart                        | Item cart milik user         | 3–4 hari   |
| 6    | Address                     | Alamat milik user            | 2–3 hari   |
| 7    | Frontend toko               | Katalog, detail, cart UI     | 5–7 hari   |
| 8    | Checkout & Order            | Validasi, snapshot, order    | 5–7 hari   |
| 9    | Payment (mock → DOKU)       | Status bayar, webhook        | 4–6 hari   |
| 10   | Admin & Shipment            | Panel admin, resi            | 4–6 hari   |
| 11   | Upload gambar (R2)          | Object storage               | 2–3 hari   |
| 12   | Shipping API                | Ongkir otomatis              | 4–6 hari   |
| 13   | Polish & Deploy             | Rapikan, deploy production   | 3–5 hari   |

Perkiraan hari = waktu belajar santai, bukan kerja full-time. Sesuaikan sendiri.

---

## Fase 0 — Persiapan lingkungan

**Tujuan:** semua tool terpasang dan versinya benar.

**Tugas:**

- [x] Install **Node.js LTS** (v20+) dan cek `node -v`, `npm -v`. → v24.18.0 / npm 11.16.0
- [x] Pilih package manager: `npm` atau `pnpm` (pilih satu, konsisten). → pakai **npm**
- [x] Install editor (VS Code) + ekstensi: ESLint, Prettier, Drizzle, Tailwind.
- [x] Install **Wrangler CLI** (tool Cloudflare): `npm i -g wrangler`. → v4.149.0
- [x] `wrangler login` → pastikan berhasil. → login sebagai andrianian398@gmail.com
- [ ] Buat akun **DOKU sandbox** (boleh nanti di Fase 9). → belum (aksi manual, bisa saat Fase 9)

**Checkpoint:**

- [x] `node -v`, `wrangler --version`, `wrangler whoami` semua berhasil.

**Belajar:** apa itu CLI, environment variable, dan kenapa versi Node penting.

---

## Fase 1 — Kerangka project

**Tujuan:** API Hono jalan di lokal, dan struktur repo rapi.

**Struktur yang disarankan** (monorepo sederhana, tanpa tool aneh):

```text
bukens/
├── apps/
│   ├── api/          # Hono + Cloudflare Worker
│   └── web/          # Next.js
├── packages/
│   └── shared/       # tipe & konstanta bersama (opsional, boleh nanti)
└── README.md
```

**Tugas:**

- [x] Buat folder `apps/api`.
- [x] Init Hono project Worker: di-scaffold manual (tanpa prompt interaktif).
- [x] Buat route `GET /health` → balas `{ "status": "ok" }`.
- [x] Jalankan dev server: `wrangler dev`.
- [x] Buat repo Git + `.gitignore` (node_modules, .wrangler, .env).
- [x] Tulis `README.md` cara menjalankan project.

**Checkpoint:**

- [x] `curl http://localhost:8787/health` mengembalikan `{"status":"ok"}`.

**Belajar:** apa itu Worker, `fetch` handler, routing dasar Hono (`c.json`), dev server lokal.

> **Catatan:** jangan bikin `apps/web` dulu. Fokus backend sampai Fase 6.

---

## Fase 2 — Database & Drizzle

**Tujuan:** schema database nyata, bisa migrate & query.

**Tugas:**

- [ ] Buat database D1 lokal: `wrangler d1 create bukens-db` (lalu bind di `wrangler.toml`).
- [ ] Install `drizzle-orm` dan `drizzle-kit`.
- [ ] Definisikan tabel **inti bertahap** (jangan semua sekaligus):
  - [ ] `products`
  - [ ] `product_prices`
  - [ ] `product_images`
- [ ] Terapkan aturan uang: `amount` = **INTEGER** (IDR utuh, USD dalam cents).
- [ ] Buat constraint `UNIQUE(product_id, currency)` di `product_prices`.
- [ ] Buat index minimal: `products.slug`, `products.status`.
- [ ] Generate + jalankan migration ke D1 lokal.
- [ ] Buat file `seed.ts` → isi 3–5 produk contoh (IDR + USD).
- [ ] Buat helper koneksi `db` yang menerima `c.env.DB`.

**Checkpoint:**

- [ ] Query produk dari D1 lewat Drizzle berhasil mengembalikan data seed.
- [ ] `UNIQUE(product_id, currency)` benar-benar menolak duplikat.

**Belajar:** SQL dasar (SELECT/INSERT/JOIN), migration, index, foreign key, kenapa integer untuk uang.

> Tabel lain (`users`, `carts`, `orders`, dst.) ditambah **saat fasenya tiba**, bukan sekarang.

---

## Fase 3 — API Produk (read-only)

**Tujuan:** katalog bisa dibaca lewat API — belum perlu auth.

**Tugas:**

- [ ] `GET /products` → daftar produk **ACTIVE** saja, dengan harga sesuai `?currency=IDR|USD`.
- [ ] `GET /products/:slug` → detail produk + semua gambarnya.
- [ ] Validasi query `currency` (default `IDR`).
- [ ] Produk `INACTIVE` tidak boleh muncul.
- [ ] Format response konsisten: `{ "data": ... }` atau `{ "error": ... }`.
- [ ] Tangani error: produk tidak ditemukan → `404`.

**Checkpoint:**

- [ ] `GET /products` menampilkan hasil seed.
- [ ] `GET /products/:slug` benar; slug aneh → `404`.
- [ ] `?currency=USD` menampilkan harga USD.

**Belajar:** HTTP method & status code, query param, validasi input sederhana.

---

## Fase 4 — Autentikasi

**Tujuan:** user bisa daftar, login, logout, dan session terbaca oleh API.

**Tugas:**

- [ ] Install & konfigurasi **Better Auth** (D1 sebagai storage).
- [ ] Generate tabel auth Better Auth (`users`, `sessions`, `accounts`, `verifications`) — **jangan desain manual**, ikuti schema-nya.
- [ ] Tambahkan kolom `role` (`CUSTOMER` / `ADMIN`) di `users`.
- [ ] Endpoint: register, login, logout, `GET /me`.
- [ ] Buat **middleware auth** di Hono → tempel `user` ke context kalau session valid.
- [ ] Buat **middleware admin** → cek `role === 'ADMIN'`.
- [ ] Seed 1 akun admin.

**Checkpoint:**

- [ ] Register → login → `GET /me` mengembalikan user yang benar.
- [ ] Akses route yang butuh login tanpa session → `401`.
- [ ] Login pakai akun customer ke route admin → `403`.

**Belajar:** cookie/session, hashing password (dihandle library), middleware, authorization vs authentication.

> **Ingat:** role **tidak boleh** dibaca dari body request.

---

## Fase 5 — Cart

**Tujuan:** user bisa mengelola cart miliknya sendiri.

**Tugas:**

- [ ] Tambah tabel `carts` (1 user = 1 cart) dan `cart_items` (+ `UNIQUE(cart_id, product_id)`).
- [ ] `GET /cart` → isi cart + subtotal (dihitung dari harga backend).
- [ ] `POST /cart/items` → tambah produk (upsert quantity).
- [ ] `PATCH /cart/items/:id` → ubah quantity.
- [ ] `DELETE /cart/items/:id` → hapus item.
- [ ] Pastikan user hanya bisa menyentuh **cart miliknya** (cek `user_id`).
- [ ] Tolak menambah produk `INACTIVE`.

**Checkpoint:**

- [ ] User A tidak bisa melihat/mengubah cart User B.
- [ ] Tambah produk yang sama dua kali → quantity menumpuk, bukan jadi 2 baris.
- [ ] Subtotal cocok dengan perhitungan manual.

**Belajar:** relasi 1:1 dan 1:N, upsert, otorisasi kepemilikan data.

---

## Fase 6 — Address

**Tujuan:** user bisa menyimpan beberapa alamat.

**Tugas:**

- [ ] Tabel `addresses` (FK ke `users`).
- [ ] CRUD: `GET`, `POST`, `PATCH`, `DELETE /addresses`.
- [ ] Field: label, recipient, phone, country, country_code, province, city, postal_code, address_line.
- [ ] Dukung `is_default` (hanya satu default per user).
- [ ] Batasi akses hanya ke alamat milik sendiri.

**Checkpoint:**

- [ ] User bisa menyimpan minimal 2 alamat.
- [ ] User tidak bisa mengakses alamat user lain.

**Belajar:** CRUD lengkap, validasi field, aturan "satu default".

---

## Fase 7 — Frontend toko

**Tujuan:** customer bisa lihat produk dan mengisi cart dari browser.

**Tugas:**

- [ ] Buat `apps/web` (Next.js) + Tailwind.
- [ ] Halaman: `/`, `/products`, `/products/:slug`, `/cart`, `/login`, `/register`.
- [ ] Tampilkan pilihan currency IDR/USD (harga dari API, bukan hitung sendiri).
- [ ] Tombol "Add to cart" memanggil API.
- [ ] Setelah login, tampilkan menu akun.

**Checkpoint:**

- [ ] Bisa browse → buka detail → add to cart → lihat cart di UI.
- [ ] Ganti currency → harga berubah sesuai API.

**Belajar:** Next.js routing, server vs client component, fetch ke API, state management sederhana.

> **Ingat:** frontend hanya **menampilkan**. Tidak menghitung total final.

---

## Fase 8 — Checkout & Order

**Tujuan:** inti sistem — membuat order yang benar dan aman.

**Tugas:**

- [ ] Tambah tabel `orders` + `order_items`.
- [ ] `orders.shipping_address_snapshot` (JSON) — snapshot alamat saat checkout.
- [ ] `order_items`: simpan `product_name`, `unit_price`, `quantity`, `subtotal` (snapshot).
- [ ] `POST /checkout` dengan urutan validasi:
  - [ ] sudah login?
  - [ ] cart tidak kosong?
  - [ ] produk masih ada & ACTIVE?
  - [ ] stok cukup?
  - [ ] currency valid?
  - [ ] alamat valid & milik user?
- [ ] Hitung subtotal + shipping + tax + total **di backend**.
- [ ] Simpan order + order_items dalam transaksi.
- [ ] Kurangi stok **aman dari race condition** (cek & update atomik).
- [ ] Kosongkan cart setelah order dibuat.
- [ ] `GET /orders` & `GET /orders/:id` (hanya milik user).
- [ ] Buat `order_number` unik (mis. `BK-0001`).
- [ ] Order awal berstatus `PENDING_PAYMENT`.

**Checkpoint:**

- [ ] Checkout berhasil membuat order dengan snapshot harga yang benar.
- [ ] Ubah harga produk → order lama **tidak berubah**.
- [ ] Stok berkurang tepat sesuai kuantitas.
- [ ] User tidak bisa buka order user lain.
- [ ] Client yang mengirim `total` palsu tetap diabaikan.

**Belajar:** database transaction, snapshot, race condition (atomic update), validasi berlapis.

> Untuk sementara `shipping_fee` dan `tax` boleh **manual/mock** dulu. Diperbaiki di Fase 12.

---

## Fase 9 — Payment (mock dulu, lalu DOKU)

**Tujuan:** order bisa berubah `PENDING_PAYMENT` → `PAID` lewat webhook yang tervalidasi.

**Tugas (mock dulu):**

- [ ] Tabel `payments` (1 order = N payment attempt).
- [ ] `POST /payments` → buat payment record + `payment_url` palsu.
- [ ] `POST /webhooks/payment` (mock) → ubah payment jadi `SUCCESS`, order jadi `PAID`.
- [ ] Pastikan **duplikat webhook** tidak merusak data (idempotent).

**Tugas (ganti ke DOKU):**

- [ ] Konfigurasi DOKU sandbox (kredensial via secret, bukan hardcode).
- [ ] `POST /payments/doku` → panggil DOKU, simpan `provider_payment_id` & `payment_url`.
- [ ] `POST /webhooks/doku` → **verifikasi signature** sebelum ubah status.
- [ ] Verifikasi `amount` & `currency` webhook sama dengan order.
- [ ] Update `payment.status` dan `order.status` terpisah.

**Checkpoint:**

- [ ] Simulasi pembayaran → order menjadi `PAID`.
- [ ] Webhook dengan signature salah → ditolak.
- [ ] Webhook dikirim 2x → tidak dobel update.
- [ ] Redirect balik dari DOKU **belum** mengubah status (harus tetap nunggu webhook).

**Belajar:** webhook, signature/HMAC, idempotency, memisahkan status payment vs order.

---

## Fase 10 — Admin & Shipment

**Tujuan:** admin kelola produk & order, masukkan resi.

**Tugas admin produk:**

- [ ] `POST /admin/products`
- [ ] `PATCH /admin/products/:id`
- [ ] `DELETE /admin/products/:id`
- [ ] Atur harga IDR & USD, stok, status.

**Tugas admin order + shipment:**

- [ ] `GET /admin/orders` & `GET /admin/orders/:id`.
- [ ] `PATCH /admin/orders/:id/status`.
- [ ] Tambah tabel `shipments` (1 order = 1 shipment).
- [ ] `POST /admin/orders/:id/shipment` → input courier, service, tracking_number, tracking_url.
- [ ] Setelah shipment dibuat → order jadi `SHIPPED`.

**Frontend admin:**

- [ ] `/admin/products` (list + create + edit).
- [ ] `/admin/orders` (list + detail).
- [ ] Form input resi.

**Checkpoint:**

- [ ] Admin bisa CRUD produk & ubah stok.
- [ ] Admin bisa proses order dan input resi.
- [ ] Customer melihat status `SHIPPED` + tombol "Track Package" menuju URL courier.

**Belajar:** role-based access, halaman admin, relasi 1:1 order–shipment.

---

## Fase 11 — Upload gambar (R2)

**Tujuan:** gambar produk benar-benar tersimpan di object storage.

**Tugas:**

- [ ] Buat bucket R2 + bind di `wrangler.toml`.
- [ ] `POST /admin/products/:id/images` → upload ke R2, simpan metadata (url, sort_order) di D1.
- [ ] Hapus gambar (R2 + D1).
- [ ] Atur urutan gambar (`sort_order`).
- [ ] Gunakan URL publik / signed URL untuk menampilkan.

**Checkpoint:**

- [ ] Upload gambar dari admin → muncul di halaman produk.
- [ ] Binary **tidak** disimpan di D1.

**Belajar:** object storage vs database, upload multipart, CDN.

> Sebelum fase ini, gambar boleh pakai URL placeholder.

---

## Fase 12 — Shipping API

**Tujuan:** ongkir dihitung otomatis dari provider.

**Tugas:**

- [ ] Pilih & daftar Shipping API.
- [ ] `POST /checkout/shipping-rates` → kirim origin, destination, weight, dimension, courier.
- [ ] Tampilkan pilihan service + harga ke customer.
- [ ] Simpan pilihan layanan pada order.
- [ ] Ganti `shipping_fee` mock di Fase 8 dengan hasil nyata.
- [ ] Shipping fee **tidak berubah** setelah order `PAID`.

**Checkpoint:**

- [ ] Customer memilih layanan → ongkir masuk ke total order.
- [ ] Ongkir tidak berubah setelah dibayar.

**Belajar:** integrasi API eksternal, timeout/error handling, mapping response pihak ketiga.

---

## Fase 13 — Polish & Deploy

**Tujuan:** rapi, aman, dan live.

**Tugas:**

- [ ] Konfigurasi tax (`tax_configurations`) menggantikan nilai hardcode.
- [ ] Validasi input konsisten di semua endpoint (mis. pakai Zod/Valibot).
- [ ] Rapikan error handling & pesan error yang jelas.
- [ ] Pastikan semua secret di environment variable, bukan di repo.
- [ ] Deploy API ke Cloudflare Workers.
- [ ] Deploy Web (Next.js) ke Cloudflare.
- [ ] Setup domain + HTTPS.
- [ ] Smoke test end-to-end di production.
- [ ] Cek checklist Acceptance Criteria (lihat di bawah).

**Checkpoint:**

- [ ] Alur lengkap di production: browse → cart → checkout → bayar → admin kirim → customer lihat resi.
- [ ] Tidak ada secret yang bocor di Git.

**Belajar:** environment/secrets, deployment serverless, monitoring dasar.

---

## Checklist Acceptance Criteria (MVP Ready)

Alur utama harus lulus dari awal sampai akhir (lihat `PRD.md` bagian 33):

- [ ] Customer register / login.
- [ ] Browse produk tanpa login.
- [ ] Add to cart.
- [ ] Checkout hanya setelah login.
- [ ] Pilih alamat.
- [ ] Pilih currency (IDR/USD).
- [ ] Dapat ongkir dari Shipping API.
- [ ] Tax dihitung backend.
- [ ] Review total (total dari backend).
- [ ] Create order (snapshot tersimpan).
- [ ] Bayar via DOKU.
- [ ] Webhook validasi → payment `SUCCESS` → order `PAID`.
- [ ] Admin proses order.
- [ ] Admin input resi → order `SHIPPED`.
- [ ] Customer melihat tracking link.
- [ ] Order `COMPLETED`.

---

## Tips belajar (biar tidak kewalahan)

1. **Satu hal baru per fase.** Kalau fase itu butuh 3 konsep baru, pecah lagi.
2. **Selalu uji dari terminal (`curl`) sebelum bikin UI.** Lebih cepat ketemu bug.
3. **Commit kecil-kecil** dan sering, tiap checkpoint lulus.
4. **Baca error message sampai habis** — jangan asal ubah kode.
5. **Jangan copy-paste tanpa paham.** Kalau tidak paham, tanya/dokumentasikan dulu.
6. **Kalau stuck > 1 jam**, tulis masalahnya, istirahat, lalu bagi jadi langkah kecil.
7. **Utamakan jalan dulu, optimal kemudian.** MVP tidak harus sempurna.

---

## Yang ditunda (bukan MVP)

Jangan sentuh dulu: reviews, wishlist, coupon, loyalty, referral, live chat, notifikasi,
multi-warehouse, split shipment, refund otomatis, tracking engine sendiri, auto exchange rate,
advanced tax engine, recommendation engine.

Selesaikan dulu alur utama sampai `COMPLETED`, baru pertimbangkan fitur tambahan.

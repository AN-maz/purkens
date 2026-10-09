# 1. Technology Decision — BUKENS

Aku sarankan kita **freeze keputusan teknologi** seperti ini untuk MVP.

| Layer                | Teknologi              | Keputusan              |
| -------------------- | ---------------------- | ---------------------- |
| Frontend             | **Next.js**            | ✅ Pakai                |
| Runtime/deployment   | **Cloudflare Workers** | ✅ Pakai                |
| Next.js → Cloudflare | **vinext**             | ✅ Untuk deployment     |
| Backend API          | **Hono.js**            | ✅ Pakai                |
| Database             | **Cloudflare D1**      | ✅ Pakai                |
| Database ORM         | **Drizzle ORM**        | ✅ Pakai                |
| Authentication       | **Better Auth**        | ✅ Pakai                |
| Image/Object Storage | **Cloudflare R2**      | ✅ Pakai                |
| Payment              | **DOKU**               | ✅ Pakai                |
| Shipping             | **Shipping API**       | ✅ Pakai                |
| Currency             | **IDR + USD**          | ✅ Manual               |
| Tax                  | Configurable/backend   | ✅ Pakai                |
| Live tracking        | Courier eksternal      | ❌ Tidak dibuat sendiri |

---

# 2. Kenapa stack ini?

Arsitektur akhirnya:

```text
                    INTERNET
                       │
                       ▼
             ┌───────────────────┐
             │ Cloudflare        │
             │ Workers           │
             └─────────┬─────────┘
                       │
             ┌─────────┴──────────┐
             │                    │
             ▼                    ▼
        Next.js UI            Hono API
             │                    │
             │                    ├──── Better Auth
             │                    │
             │                    ├──── Drizzle
             │                    │       │
             │                    │       ▼
             │                    │      D1
             │                    │
             │                    ├──── DOKU
             │                    │
             │                    ├──── Shipping API
             │                    │
             │                    └──── R2
             │
             ▼
         Customer/Admin
```

Hono memang punya dukungan langsung untuk Cloudflare Workers dan menggunakan `c.env` untuk mengakses bindings seperti D1. ([Hono][2])

Drizzle juga mendukung D1 secara langsung dan menggunakan dialect SQLite. ([Drizzle ORM][3])

Dan menariknya, **Better Auth sekarang punya dukungan native untuk Cloudflare D1**, jadi keputusan D1 + Better Auth semakin masuk akal. ([Better Auth][4])

---

# 3. Keputusan penting: Next.js dan Hono

Ada potensi kebingungan:

> "Kalau Next.js sudah bisa backend, kenapa masih pakai Hono?"

Untuk BUKENS kita sengaja pisahkan:

### Next.js

Menangani:

```text
UI
Routing halaman
Product page
Cart UI
Checkout UI
Admin UI
SSR/RSC
SEO
```

### Hono

Menangani:

```text
API
Business logic
Authentication verification
Product CRUD
Cart
Checkout
Order
Payment
Shipping
DOKU webhook
Admin API
```

Jadi:

```text
Next.js
    │
    │ HTTP
    ▼
Hono API
    │
    ├── D1
    ├── DOKU
    ├── Shipping API
    └── R2
```

**Jangan membuat business logic yang sama di Next.js dan Hono.**

Itu bakal bikin project cepat berantakan.

---

# 4. Native SQL atau Drizzle?

Keputusan final:

> **Drizzle ORM + tetap belajar SQL.**

D1 sendiri memang menggunakan SQLite dan mendukung SQL secara langsung. ([Cloudflare Docs][5])

Jadi kamu tetap akan memahami:

```sql
SELECT
INSERT
UPDATE
DELETE
JOIN
WHERE
GROUP BY
INDEX
FOREIGN KEY
TRANSACTION
```

tetapi application layer menggunakan Drizzle.

Contohnya secara konsep:

```text
Hono
 ↓
Service
 ↓
Drizzle
 ↓
D1
 ↓
SQLite
```

Menurutku ini lebih cocok untuk kamu daripada:

```text
Hono
 ↓
raw SQL everywhere
 ↓
D1
```

karena BUKENS punya cukup banyak relasi.

---

# 5. Database Decision

Sekarang kita masuk ke bagian paling penting:

# FINAL ERD BUKENS

Aku revisi ERD sebelumnya supaya lebih siap untuk implementasi.

## Core entities

```text
USERS
  │
  ├──< ADDRESSES
  │
  ├──── CART
  │       │
  │       └──< CART_ITEMS >──── PRODUCTS
  │
  └──< ORDERS
          │
          ├──< ORDER_ITEMS >──── PRODUCTS
          │
          ├──< PAYMENTS
          │
          └──── SHIPMENTS


PRODUCTS
  │
  ├──< PRODUCT_PRICES
  │
  └──< PRODUCT_IMAGES


TAX_CONFIGURATIONS
```

Tapi ada satu hal penting:

**Better Auth sendiri membutuhkan beberapa tabel.**

Jadi ERD final secara fisik akan mempunyai tabel authentication tambahan seperti:

```text
users
sessions
accounts
verifications
```

dan tabel bisnis BUKENS.

Jangan campurkan semua logic authentication ke tabel bisnis kita secara sembarangan.

---

# 6. FINAL DATABASE SCHEMA

## A. `users`

User utama/customer/admin.

```text
users
-------------------------
id                  PK
name
email               UNIQUE
email_verified
image
role
created_at
updated_at
```

`role`:

```text
CUSTOMER
ADMIN
```

Untuk MVP, cukup dua role.

---

# 7. Authentication tables

Better Auth akan memiliki tabel pendukung seperti:

```text
sessions
accounts
verifications
```

Secara konsep:

```text
users
 │
 ├──< sessions
 │
 ├──< accounts
 │
 └──< verifications
```

Aku **tidak menyarankan kita mendesain ulang tabel Better Auth secara manual dulu**.

Biarkan Better Auth menghasilkan schema yang dibutuhkan, lalu tabel bisnis BUKENS kita integrasikan dengan `users.id`.

Better Auth memang menyediakan schema generation/migration dan dukungan database SQLite/D1. ([Better Auth][6])

---

# 8. `addresses`

Customer bisa punya banyak alamat.

```text
addresses
-------------------------
id                  PK
user_id             FK → users.id

label
recipient_name
phone

address_line
city
province
postal_code
country
country_code

is_default

created_at
updated_at
```

Contoh:

```text
user
 ├── Home
 ├── Office
 └── Warehouse
```

Jadi:

```text
USERS 1 ─── N ADDRESSES
```

---

# 9. `products`

```text
products
-------------------------
id                  PK
name
slug                UNIQUE
description

stock
weight_grams

length_cm
width_cm
height_cm

status

created_at
updated_at
```

`status`:

```text
ACTIVE
INACTIVE
```

Kenapa dimensi ada?

Karena nanti shipping API bisa membutuhkan:

```text
weight
length
width
height
```

---

# 10. `product_prices`

Ini salah satu keputusan schema yang menurutku penting.

Jangan:

```text
products

price_idr
price_usd
```

Lebih bagus:

```text
product_prices
-------------------------
id                  PK
product_id          FK
currency
amount
created_at
updated_at
```

Contoh:

```text
PRODUCT
id = carpet-001

PRODUCT_PRICES

IDR → 750000
USD → 7500
```

Di database:

```text
currency = "IDR"
amount   = 750000
```

atau:

```text
currency = "USD"
amount   = 7500
```

USD menggunakan **minor unit**:

```text
7500 = $75.00
```

Jangan gunakan floating point untuk uang.

Constraint:

```text
UNIQUE(product_id, currency)
```

Jadi satu product hanya memiliki satu harga aktif untuk satu currency.

---

# 11. `product_images`

Gambar tidak disimpan di D1.

File:

```text
Cloudflare R2
```

Database hanya menyimpan metadata:

```text
product_images
-------------------------
id                  PK
product_id          FK
url
sort_order
created_at
```

Relasi:

```text
PRODUCT
   │
   └──< PRODUCT_IMAGES
```

---

# 12. `carts`

Untuk MVP:

> satu customer = satu cart aktif.

```text
carts
-------------------------
id                  PK
user_id             FK UNIQUE

created_at
updated_at
```

Relasi:

```text
USER 1 ─── 1 CART
```

---

# 13. `cart_items`

```text
cart_items
-------------------------
id                  PK
cart_id             FK
product_id          FK

quantity

created_at
updated_at
```

Constraint:

```text
UNIQUE(cart_id, product_id)
```

Jadi jangan sampai:

```text
Cart
 ├── Carpet A × 2
 └── Carpet A × 3
```

melainkan:

```text
Cart
 └── Carpet A × 5
```

---

# 14. `orders`

Ini **jantung sistem BUKENS**.

```text
orders
-------------------------
id                  PK

order_number        UNIQUE

user_id             FK

currency

subtotal
shipping_fee
tax
discount
total

status

shipping_address_snapshot

created_at
updated_at
```

Kenapa `shipping_address_snapshot`?

Misalnya:

Hari ini:

```text
Address A
Jakarta
```

Customer checkout.

Besok customer mengubah alamat menjadi:

```text
Address B
Bandung
```

Order lama **harus tetap Jakarta**.

Makanya kita snapshot.

---

# 15. `order_items`

Ini juga wajib snapshot.

```text
order_items
-------------------------
id                  PK

order_id            FK
product_id          FK

product_name
unit_price
quantity
subtotal

created_at
```

Misalnya:

```text
Product:
Karpet Persian

Saat checkout:
Harga = Rp750.000
```

Lalu admin mengubah harga menjadi:

```text
Rp900.000
```

Order lama tetap:

```text
Karpet Persian
Rp750.000
```

Bukan ikut berubah.

---

# 16. `payments`

Satu order bisa memiliki lebih dari satu payment attempt.

```text
payments
-------------------------
id                  PK

order_id            FK

provider
provider_payment_id

amount
currency

status

payment_url
expired_at
paid_at

created_at
updated_at
```

Contoh:

```text
ORDER #BK-001

Payment #1
FAILED

Payment #2
SUCCESS
```

Makanya:

```text
ORDER 1 ─── N PAYMENTS
```

bukan:

```text
ORDER 1 ─── 1 PAYMENT
```

---

# 17. Payment status

Kita gunakan:

```text
PENDING
SUCCESS
FAILED
EXPIRED
```

Sedangkan order punya status sendiri.

Jangan campur:

```text
order.status
```

dengan:

```text
payment.status
```

Karena:

```text
Payment SUCCESS
        ↓
Order PROCESSING
```

itu dua konsep berbeda.

---

# 18. `shipments`

MVP kita:

```text
ORDER 1 ─── 1 SHIPMENT
```

Schema:

```text
shipments
-------------------------
id                  PK
order_id            FK UNIQUE

provider
service

tracking_number
tracking_url

shipping_fee
estimated_delivery

status

created_at
updated_at
```

Contoh:

```text
Provider: DHL
Service: Express

Tracking:
123456789

URL:
https://courier.example/track/123456789
```

Bukens **tidak perlu membuat sistem tracking sendiri**.

Cukup:

```text
Lihat Resi
       ↓
website courier
```

---

# 19. `tax_configurations`

Untuk sekarang jangan hardcode:

```text
tax = 11%
```

di source code.

Kita buat configurable.

```text
tax_configurations
-------------------------
id                  PK

name

country
currency

rate

is_active

created_at
updated_at
```

Tapi ada catatan penting:

**tabel ini bukan berarti kita sudah menentukan aturan pajak Indonesia/internasional.**

Tabel ini hanya menyediakan tempat untuk konfigurasi bisnis.

Aturan pajaknya nanti harus ditentukan berdasarkan kebutuhan bisnis/legal BUKENS.

---

# 20. Final ERD

Kalau disederhanakan:

```text
                         ┌──────────────┐
                         │    USERS     │
                         └──────┬───────┘
                                │
               ┌────────────────┼────────────────┐
               │                │                │
               ▼                ▼                ▼
        ┌────────────┐   ┌────────────┐   ┌────────────┐
        │ ADDRESSES  │   │   CARTS    │   │   ORDERS   │
        └────────────┘   └─────┬──────┘   └─────┬──────┘
                                │                │
                                ▼                ├──────────────┐
                         ┌────────────┐           │              │
                         │ CART_ITEMS │           ▼              ▼
                         └─────┬──────┘    ┌────────────┐ ┌────────────┐
                               │           │ORDER_ITEMS │ │  PAYMENTS  │
                               │           └─────┬──────┘ └────────────┘
                               │                 │
                               ▼                 │
                         ┌────────────┐          │
                         │  PRODUCTS  │◄─────────┘
                         └─────┬──────┘
                               │
                    ┌──────────┴──────────┐
                    │                     │
                    ▼                     ▼
             ┌──────────────┐      ┌──────────────┐
             │PRODUCT_PRICES│      │PRODUCT_IMAGES│
             └──────────────┘      └──────────────┘


                         ┌────────────┐
                         │ SHIPMENTS  │
                         └─────▲──────┘
                               │
                            ORDERS
```

---

# 21. Relasi final

| Parent  | Child         | Cardinality |
| ------- | ------------- | ----------- |
| User    | Address       | 1:N         |
| User    | Cart          | 1:1         |
| Cart    | Cart Item     | 1:N         |
| Product | Cart Item     | 1:N         |
| User    | Order         | 1:N         |
| Order   | Order Item    | 1:N         |
| Product | Order Item    | 1:N         |
| Product | Product Price | 1:N         |
| Product | Product Image | 1:N         |
| Order   | Payment       | 1:N         |
| Order   | Shipment      | 1:1         |

Dan:

```text
Tax Configuration
       │
       └── digunakan oleh business logic
```

tidak perlu FK langsung ke `orders`, karena **hasil pajaknya disimpan sebagai snapshot di order**.

---

# 22. Index yang wajib

Karena D1 menghitung penggunaan berdasarkan rows read/written, indexing bukan cuma masalah performance tetapi juga bisa membantu efisiensi query dan biaya. ([Cloudflare Docs][7])

Minimal:

```text
users.email
addresses.user_id

products.slug
products.status

product_prices.product_id
product_prices(product_id, currency)

carts.user_id

cart_items.cart_id
cart_items(product_id)

orders.user_id
orders.order_number
orders.status

order_items.order_id

payments.order_id
payments.provider_payment_id

shipments.order_id
shipments.tracking_number
```

Dan foreign key akan kita enforce di D1. D1 memang mendukung foreign-key constraints dan secara default menegakkannya. ([Cloudflare Docs][8])

---

# 23. Satu perubahan arsitektur yang aku rekomendasikan

Ada satu hal yang **belum perlu kita masukkan sekarang**:

```text
inventory_logs
refunds
discounts
coupons
reviews
wishlists
notifications
```

Bukan karena tidak berguna.

Tetapi karena:

> **MVP BUKENS belum membutuhkan semuanya.**

Kita jangan membuat database 30 tabel hanya karena "nanti mungkin diperlukan."

Mulai dari:

```text
AUTH
+
PRODUCT
+
CART
+
ORDER
+
PAYMENT
+
SHIPPING
```

Sudah cukup untuk menghasilkan e-commerce yang benar-benar berjalan.

---

# 24. Final Technology Decision

Jadi kalau kita tulis sebagai keputusan resmi project:

```text
BUKENS TECHNOLOGY DECISION

Frontend
→ Next.js

Deployment
→ Cloudflare Workers
→ vinext untuk Next.js deployment

Backend
→ Hono.js
→ Cloudflare Workers

Database
→ Cloudflare D1
→ SQLite

ORM
→ Drizzle ORM

Authentication
→ Better Auth

Object Storage
→ Cloudflare R2

Payment Gateway
→ DOKU

Shipping
→ External Shipping API

Currency
→ IDR / USD

Money Representation
→ Integer minor units

Architecture
→ Frontend → Hono API → Services → Drizzle → D1

External Integrations
→ DOKU
→ Shipping API
→ R2

Payment Confirmation
→ DOKU HTTP Notification/Webhook
→ NOT frontend redirect
```

DOKU sendiri mendokumentasikan HTTP Notification sebagai mekanisme server-to-server untuk memberitahu aplikasi ketika event pembayaran terjadi, sehingga keputusan kita untuk menjadikan notification sebagai sumber kebenaran pembayaran memang tepat. ([Doku Developers][9])

**Dengan ini aku anggap Technology Decision + ERD sudah cukup matang untuk masuk tahap berikutnya.**

Urutan yang paling aman selanjutnya:

```text
Technology Decision
        ↓
FINAL ERD              ← kita selesai di sini
        ↓
API CONTRACT
        ↓
AUTH + ROLE FLOW
        ↓
CHECKOUT FLOW
        ↓
DOKU PAYMENT FLOW
        ↓
SHIPPING FLOW
        ↓
PRD
        ↓
SITEMAP / USER FLOW FINAL
        ↓
IMPLEMENTATION
```

Yang paling penting berikutnya menurutku adalah **API Contract**, karena di situ kita akan mulai menerjemahkan ERD ini menjadi endpoint nyata seperti `POST /checkout`, `POST /payments/doku`, `POST /webhooks/doku`, `GET /products`, dan sebagainya.

[1]: https://developers.cloudflare.com/workers/framework-guides/web-apps/nextjs/?utm_source=chatgpt.com "Next.js · Cloudflare Workers docs"
[2]: https://hono.dev/docs/getting-started/cloudflare-workers?utm_source=chatgpt.com "Cloudflare Workers - Hono"
[3]: https://orm.drizzle.team/docs/sqlite/connect-cloudflare-d1?utm_source=chatgpt.com "Drizzle ORM - Cloudflare D1"
[4]: https://better-auth.com/blog/1-5?utm_source=chatgpt.com "Better Auth 1.5"
[5]: https://developers.cloudflare.com/d1/sql-api/sql-statements/?utm_source=chatgpt.com "SQL statements · Cloudflare D1 docs"
[6]: https://better-auth.com/docs/concepts/database?utm_source=chatgpt.com "Database | Better Auth"
[7]: https://developers.cloudflare.com/d1/best-practices/use-indexes/?utm_source=chatgpt.com "Use indexes · Cloudflare D1 docs"
[8]: https://developers.cloudflare.com/d1/sql-api/foreign-keys/?utm_source=chatgpt.com "Define foreign keys · Cloudflare D1 docs"
[9]: https://developers.doku.com/get-started-with-doku-api/notification?utm_source=chatgpt.com "Notification | API Reference"

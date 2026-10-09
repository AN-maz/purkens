Iya. Dengan keputusan **Cloudflare D1**, aku justru akan sedikit mengubah rekomendasi arsitektur sebelumnya supaya stack Bukens konsisten dengan ekosistem Cloudflare.

## Rekomendasi stack Bukens

Aku sarankan:

```text
Frontend
└── Next.js

Backend
└── Hono.js

Database
└── Cloudflare D1 (SQLite)

ORM / Database layer
└── Drizzle ORM

Authentication
└── Better Auth

Payment
└── DOKU

Shipping
└── Shipping API

Storage gambar
└── Cloudflare R2

Deployment / Infrastructure
└── Cloudflare Workers
```

Jadi gambaran besarnya:

```text
                    CUSTOMER
                       │
                       ▼
                  ┌─────────┐
                  │ Next.js │
                  └────┬────┘
                       │
                       ▼
                  ┌─────────┐
                  │  Hono   │
                  │   API   │
                  └────┬────┘
                       │
        ┌──────────────┼──────────────┐
        ▼              ▼              ▼
   Cloudflare D1      DOKU      Shipping API
    Database        Payment       Shipping
        │
        │
        ▼
   Cloudflare R2
  Product Images
```

---

# 1. D1: menurutku cocok

**Cloudflare D1** menggunakan SQLite dan memang dirancang untuk aplikasi yang berjalan di ekosistem Cloudflare.

Untuk Bukens, kebutuhan database kita relatif sederhana:

```text
Users
Products
Cart
Orders
Payments
Shipments
```

Kita belum membutuhkan database dengan kompleksitas tinggi.

Jadi:

> **D1 cukup untuk MVP Bukens.**

Dan ini sekaligus bagus untuk kamu belajar karena kamu sebelumnya sudah pernah menggunakan database SQL.

Bedanya sekarang kamu akan belajar:

```text
SQLite
   ↓
Cloudflare D1
   ↓
Database yang diakses aplikasi serverless
```

---

# 2. "Native" database aman?

Kalau maksudmu:

> "Apakah aku bisa tidak menggunakan ORM dan langsung menggunakan SQL?"

**Bisa.**

Misalnya Hono:

```ts
const result = await env.DB
  .prepare("SELECT * FROM products WHERE id = ?")
  .bind(productId)
  .first();
```

Ini valid dan bahkan bagus untuk belajar SQL.

Tapi untuk Bukens, aku **tidak menyarankan seluruh project menggunakan raw SQL**.

Karena nanti query kita akan semakin banyak:

```text
products
orders
order_items
payments
shipments
addresses
cart_items
...
```

Dan kamu akan mulai mendapatkan:

```text
SQL
+
TypeScript
+
validation
+
relations
+
migration
```

yang cukup merepotkan.

---

# 3. Aku pilih Drizzle ORM

Untuk Bukens:

> **Drizzle ORM + D1**

menurutku pilihan yang paling masuk akal.

Contoh konsepnya:

```ts
const products = await db
  .select()
  .from(productsTable)
  .where(eq(productsTable.id, productId));
```

Tapi yang lebih penting adalah kamu tetap bisa melihat SQL yang mendasarinya.

Jadi kamu tidak menjadi:

> "Aku bisa ORM tapi nggak ngerti database."

Kita tetap belajar:

```text
SQL fundamentals
      ↓
Drizzle
      ↓
Application
```

### Dibanding Prisma

Karena kamu sebelumnya sudah pernah memakai Prisma, memang tempting untuk:

```text
Prisma + D1
```

Tetapi untuk project baru yang **target deployment-nya Cloudflare Workers + D1**, aku lebih condong ke Drizzle.

Alasannya sederhana:

```text
D1
 ↓
SQLite
 ↓
Drizzle
 ↓
TypeScript
```

sangat natural.

Dan karena kamu sedang belajar, aku ingin menghindari layer yang membuat deployment Cloudflare menjadi lebih rumit dari yang diperlukan.

---

# 4. Authentication: aku pilih Better Auth

Nah ini bagian yang menurutku penting.

Karena requirement kita:

> Customer wajib login sebelum checkout.

Kita membutuhkan:

```text
Register
Login
Logout
Session
Password hashing
Session management
```

Aku **tidak menyarankan membuat authentication dari nol**.

Jangan sampai kita sendiri membuat:

```text
hash password
session
cookie
refresh token
CSRF
password reset
email verification
```

untuk project pertama.

Lebih baik gunakan library auth yang memang menangani hal-hal tersebut.

Untuk stack ini, aku menyarankan:

> **Better Auth**

dan database auth-nya kita simpan di D1.

Konsepnya:

```text
Next.js
   │
   ▼
Better Auth
   │
   ▼
D1
```

Kemudian Hono juga harus bisa memvalidasi session user ketika mengakses endpoint yang membutuhkan authentication.

---

# 5. Next.js + Hono

Nah, di sini aku ingin kamu belajar satu hal penting.

Jangan berpikir:

```text
Next.js = backend
Hono = backend
```

lalu keduanya melakukan hal yang sama.

Kita beri tanggung jawab jelas.

### Next.js

```text
UI
SSR / RSC
Product pages
Cart UI
Checkout UI
Account UI
Admin UI
```

### Hono

```text
Business API
Authentication verification
Product API
Cart API
Checkout
Order
Payment
Shipping
DOKU webhook
```

Misalnya:

```text
Browser
   │
   ▼
Next.js
   │
   │ API request
   ▼
Hono
   │
   ├── D1
   ├── DOKU
   └── Shipping API
```

---

# 6. Cloudflare Workers

Aku sarankan target deployment akhirnya:

```text
Cloudflare Workers
```

bukan:

```text
VPS Ubuntu
```

untuk versi pertama.

Kenapa?

Karena kamu memang sedang ingin belajar Cloudflare/serverless.

Kamu akan mendapatkan pengalaman:

```text
Local Development
       ↓
Cloudflare Wrangler
       ↓
Workers
       ↓
D1
       ↓
R2
```

Dan ini relevan banget dengan pembahasan kita sebelumnya tentang:

> "serverless itu sebenarnya apa?"

Bukens bisa menjadi project nyata untuk memahami konsep tersebut.

---

# 7. Cloudflare R2 untuk gambar

Untuk product image:

**jangan simpan file gambar di D1.**

D1:

```text
product_images
────────────────
id
product_id
url
sort_order
```

R2:

```text
bukens-product-images/
├── carpet-a/
│   ├── 1.webp
│   ├── 2.webp
│   └── 3.webp
│
└── carpet-b/
    ├── 1.webp
    └── 2.webp
```

D1 hanya menyimpan metadata/URL.

Jadi:

```text
Image binary
     ↓
R2

Image metadata
     ↓
D1
```

---

# 8. Ada satu hal yang perlu kita ubah dari ERD sebelumnya

Karena kita menggunakan D1 + SQLite, aku akan sedikit merapikan schema.

Misalnya untuk uang.

**Jangan menggunakan floating point.**

Jangan:

```text
price = 750000.50
```

gunakan integer dalam unit terkecil.

Untuk IDR:

```text
750000
```

Untuk USD, kita bisa menyimpan dalam cents:

```text
7500
```

yang berarti:

```text
$75.00
```

Kemudian setiap price record memiliki:

```text
currency
amount
```

Contoh:

```text
product_prices

product_id | currency | amount
-----------|----------|-------
CARPET-01  | IDR      | 750000
CARPET-01  | USD      | 7500
```

Ini menghindari masalah floating point.

---

# 9. Architecture final yang aku rekomendasikan

Jadi kalau aku yang mendesain Bukens sekarang:

```text
                         INTERNET
                            │
                            ▼
                    ┌──────────────┐
                    │ Cloudflare   │
                    │   Workers    │
                    └───────┬──────┘
                            │
             ┌──────────────┴──────────────┐
             │                             │
             ▼                             ▼
       ┌───────────┐                 ┌───────────┐
       │ Next.js   │                 │   Hono    │
       │ Frontend  │                 │    API    │
       └───────────┘                 └─────┬─────┘
                                           │
                 ┌─────────────────────────┼──────────────────┐
                 │                         │                  │
                 ▼                         ▼                  ▼
            ┌─────────┐              ┌─────────┐       ┌─────────────┐
            │   D1    │              │   DOKU  │       │  Shipping   │
            │ SQLite  │              │ Payment │       │     API     │
            └─────────┘              └─────────┘       └─────────────┘
                 │
                 │
                 ▼
            ┌─────────┐
            │   R2    │
            │ Images  │
            └─────────┘
```

Authentication:

```text
Better Auth
     │
     ▼
    D1
```

---

# 10. Kenapa aku suka stack ini untuk kamu

Karena kamu bukan cuma sedang membuat Bukens.

Kamu juga sedang belajar:

### Next.js

```text
React
 ↓
Next.js
 ↓
SSR / Server Components / Routing
```

### Backend

```text
Express yang sudah kamu kenal
       ↓
Hono
       ↓
Edge/serverless API
```

### Database

```text
SQL
 ↓
SQLite
 ↓
D1
```

### Deployment

```text
localhost
 ↓
Cloudflare Workers
```

### Storage

```text
local files
 ↓
R2 object storage
```

### Payment

```text
Application
 ↓
Payment Gateway
 ↓
Webhook
 ↓
Order state
```

Ini project yang bagus banget untuk naik level dari:

> **"Aku bisa bikin web React"**

menjadi:

> **"Aku bisa merancang dan deploy web application dengan backend, database, payment gateway, shipping API, authentication, dan serverless infrastructure."**

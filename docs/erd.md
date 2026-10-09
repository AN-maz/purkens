## 1. Gambaran ERD

Secara besar:

```text
┌──────────┐
│   USER   │
└────┬─────┘
     │
     ├───────────────┐
     │               │
     ▼               ▼
 ADDRESS           ORDER
                       │
          ┌────────────┼─────────────┐
          │            │             │
          ▼            ▼             ▼
     ORDER_ITEM     PAYMENT       SHIPMENT
          │
          ▼
       PRODUCT
          │
          ▼
        STOCK
```

Dan untuk cart:

```text
USER
 │
 ▼
CART
 │
 ▼
CART_ITEM
 │
 ▼
PRODUCT
```

Jadi kita punya domain utama:

```text
User
Address

Product
Cart
CartItem

Order
OrderItem
Payment
Shipment

TaxConfiguration
```

---

# 2. `users`

Menyimpan customer dan admin.

```text
users
────────────────────────
id
name
email
password_hash
role
created_at
updated_at
```

Contoh:

```text
USR-001
Budi
budi@email.com
hashed_password
CUSTOMER
```

Admin:

```text
ADM-001
Bukens Admin
admin@bukens.com
hashed_password
ADMIN
```

### Role

```text
CUSTOMER
ADMIN
```

Untuk MVP menurutku cukup dua role.

---

# 3. `addresses`

Satu customer bisa memiliki beberapa alamat.

```text
addresses
────────────────────────
id
user_id FK
label
recipient_name
phone
country
province
city
postal_code
address_line
is_default
created_at
updated_at
```

Relasi:

```text
USER 1 ─────────── N ADDRESS
```

Contoh:

```text
Budi
 │
 ├── Home
 │
 └── Office
```

---

# 4. `products`

Ini inti katalog Bukens.

```text
products
────────────────────────
id
name
slug
description
price_idr
price_usd
stock
weight
length
width
height
status
created_at
updated_at
```

Kenapa aku memasukkan:

```text
weight
length
width
height
```

?

Karena kita menggunakan **shipping API**.

Shipping provider kemungkinan membutuhkan informasi berat/dimensi untuk menghitung ongkir.

Misalnya:

```text
Karpet A
weight = 5000 gram
length = 100 cm
width  = 50 cm
height = 10 cm
```

---

# 5. Product image

Jangan menyimpan banyak gambar langsung dalam `products`.

Lebih bagus:

```text
product_images
────────────────────────
id
product_id FK
url
sort_order
created_at
```

Relasi:

```text
PRODUCT 1 ───────── N PRODUCT_IMAGE
```

Jadi:

```text
Karpet A
 │
 ├── image-1
 ├── image-2
 └── image-3
```

---

# 6. `cart`

Satu customer memiliki cart aktif.

```text
carts
────────────────────────
id
user_id FK
created_at
updated_at
```

Relasi:

```text
USER 1 ───────── 1 CART
```

Untuk MVP, aku sarankan satu active cart per customer.

---

# 7. `cart_items`

Isi cart.

```text
cart_items
────────────────────────
id
cart_id FK
product_id FK
quantity
created_at
updated_at
```

Relasi:

```text
CART 1 ───────── N CART_ITEM
                  │
                  ▼
               PRODUCT
```

Contoh:

```text
Cart Budi

├── Karpet A × 2
├── Karpet B × 1
└── Karpet C × 3
```

---

# 8. `orders`

Ini tabel **paling penting**.

```text
orders
────────────────────────
id
order_number
user_id FK

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

Tapi ada satu hal yang sengaja aku buat berbeda:

### Jangan hanya menyimpan `address_id`.

Karena customer bisa mengubah alamatnya setelah order.

Misalnya:

```text
Hari ini:
Address = Jakarta

Order #001
```

Besok customer mengubah alamat menjadi:

```text
Bandung
```

Order #001 **harus tetap Jakarta**.

Karena itu order perlu menyimpan **snapshot alamat**.

Ada dua cara.

### Cara A — JSON

```text
shipping_address_snapshot JSON
```

Contoh:

```json
{
  "recipientName": "Budi",
  "phone": "08123456789",
  "country": "Indonesia",
  "province": "Jawa Barat",
  "city": "Bandung",
  "postalCode": "40123",
  "address": "Jl. Example No. 1"
}
```

Untuk MVP aku cukup suka pendekatan ini.

---

# 9. `order_items`

Jangan hanya:

```text
order_items
product_id
quantity
```

Karena harga product dapat berubah.

Kita perlu menyimpan **snapshot transaksi**.

```text
order_items
────────────────────────
id
order_id FK
product_id FK

product_name
unit_price
quantity
subtotal

created_at
```

Misalnya:

```text
Product sekarang:
Karpet A = $100
```

Customer membeli:

```text
Karpet A × 2
```

Maka:

```text
order_items

product_name = Karpet A
unit_price   = 100
quantity     = 2
subtotal     = 200
```

Besok admin mengubah:

```text
Karpet A = $150
```

Order lama tetap:

```text
Karpet A
$100 × 2
= $200
```

Ini **sangat penting untuk e-commerce**.

---

# 10. `payments`

Payment jangan digabung langsung ke `orders`.

Karena satu order bisa memiliki beberapa payment attempt.

Misalnya:

```text
Order #001

Payment Attempt #1
FAILED

Payment Attempt #2
EXPIRED

Payment Attempt #3
SUCCESS
```

Jadi:

```text
payments
────────────────────────
id
order_id FK

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
provider = DOKU
status = SUCCESS
amount = 1500000
currency = IDR
```

Relasi:

```text
ORDER 1 ───────── N PAYMENT
```

Ini akan membantu ketika kita masuk ke integrasi DOKU.

---

# 11. `shipments`

Shipping kita pisahkan dari order.

```text
shipments
────────────────────────
id
order_id FK

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
Order #BK-001

Courier:
DHL

Service:
Express

Tracking:
123456789

Tracking URL:
https://...

Status:
SHIPPED
```

Relasi:

```text
ORDER 1 ───────── 1 SHIPMENT
```

Untuk MVP kita asumsikan satu order → satu shipment.

Kalau suatu hari Bukens mendukung **split shipment**, desain ini bisa kita upgrade.

---

# 12. Tax

Karena tadi kita belum menentukan mekanisme tax, aku tidak ingin menaruh:

```text
tax = 11%
```

langsung di product atau order.

Kita buat konfigurasi:

```text
tax_configurations
────────────────────────
id
name
country
currency
rate
is_active
created_at
updated_at
```

Contoh konseptual:

```text
Indonesia
rate = X%

International
rate = Y%
```

**Tetapi:** angka tax aktual dan aturan penerapannya nanti harus ditentukan berdasarkan kebutuhan bisnis/legal Bukens, bukan kita hardcode sekarang.

Dan order tetap menyimpan:

```text
tax
```

karena order membutuhkan snapshot nilai pajak saat transaksi.

---

# 13. ERD lengkap

Kalau kita gabungkan:

```text
┌────────────────┐
│     USERS      │
├────────────────┤
│ PK id          │
│ name           │
│ email          │
│ password_hash  │
│ role           │
└───────┬────────┘
        │
        ├───────────────┐
        │               │
        │               ▼
        │        ┌───────────────┐
        │        │   ADDRESSES   │
        │        ├───────────────┤
        │        │ PK id         │
        │        │ FK user_id    │
        │        │ label         │
        │        │ recipient     │
        │        │ phone         │
        │        │ country       │
        │        │ province      │
        │        │ city          │
        │        │ postal_code   │
        │        │ address_line  │
        │        └───────────────┘
        │
        ├─────────────────────┐
        │                     │
        ▼                     ▼
┌───────────────┐      ┌───────────────┐
│     CARTS     │      │    ORDERS     │
├───────────────┤      ├───────────────┤
│ PK id         │      │ PK id         │
│ FK user_id    │      │ order_number  │
└───────┬───────┘      │ FK user_id    │
        │              │ currency      │
        ▼              │ subtotal      │
┌───────────────┐      │ shipping_fee  │
│  CART_ITEMS   │      │ tax           │
├───────────────┤      │ discount      │
│ PK id         │      │ total         │
│ FK cart_id    │      │ status        │
│ FK product_id │      │ address JSON  │
│ quantity      │      └───────┬───────┘
└───────┬───────┘              │
        │              ┌───────┼─────────────┐
        │              │       │             │
        │              ▼       ▼             ▼
        │        ORDER_ITEMS PAYMENTS     SHIPMENTS
        │              │
        │              ▼
        │           PRODUCTS
        │              │
        │              ▼
        │       PRODUCT_IMAGES
        │
        ▼
   ┌───────────┐
   │ PRODUCTS  │
   └───────────┘
```

---

# 14. Relasi utamanya

Secara lebih sederhana:

```text
USER
 │
 ├──< ADDRESS
 │
 ├──── CART
 │       │
 │       └──< CART_ITEM >── PRODUCT
 │
 └──< ORDER
         │
         ├──< ORDER_ITEM >── PRODUCT
         │
         ├──< PAYMENT
         │
         └──── SHIPMENT


PRODUCT
 │
 └──< PRODUCT_IMAGE
```

`<` artinya "many".

Jadi:

```text
User 1 : N Address
User 1 : 1 Cart
Cart 1 : N CartItem
Product 1 : N CartItem

User 1 : N Order
Order 1 : N OrderItem
Product 1 : N OrderItem

Order 1 : N Payment
Order 1 : 1 Shipment

Product 1 : N ProductImage
```

---

# 15. Ada satu perubahan yang aku sarankan

Awalnya kita punya:

```text
products
├── price_idr
└── price_usd
```

**Untuk MVP ini sebenarnya masih oke.**

Tapi kalau kita ingin desain yang lebih scalable, aku lebih suka:

```text
products
     │
     ▼
product_prices
```

Sehingga:

```text
product_prices
────────────────────
id
product_id
currency
amount
```

Contoh:

```text
PRODUCT
Karpet A
    │
    ├── IDR → 750000
    └── USD → 75
```

Keuntungannya: nanti kalau Bukens suatu hari ingin:

```text
EUR
SGD
MYR
JPY
```

kita tidak perlu mengubah struktur tabel.

Untuk project belajar sekaligus production-minded, **aku lebih merekomendasikan `product_prices`**.

---

# 16. Maka versi final sementara

Database Bukens kita menjadi:

```text
AUTH
├── users
└── addresses

CATALOG
├── products
├── product_prices
└── product_images

CART
├── carts
└── cart_items

ORDER
├── orders
└── order_items

PAYMENT
└── payments

SHIPPING
└── shipments

TAX
└── tax_configurations
```

Ini sudah cukup bagus sebagai **MVP database** tanpa overengineering.

---

## 17. Yang sengaja belum kita masukkan

Aku **tidak memasukkan** beberapa tabel dulu:

```text
reviews
coupons
wishlist
notifications
refunds
inventory_logs
audit_logs
multi-warehouse
multiple shipments
exchange_rates
```

Bukan berarti fitur tersebut tidak mungkin diperlukan.

Tapi karena sekarang kita sedang membuat **MVP Bukens**, kita jangan membuat 30 tabel hanya karena "mungkin nanti diperlukan".

Yang paling penting dulu:

> **Customer → Product → Cart → Checkout → Shipping → Order → DOKU → Shipment**

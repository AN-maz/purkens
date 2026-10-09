# Product Requirement Document (PRD)

## 1. Informasi Produk

**Nama Produk:** BUKENS
**Jenis:** E-Commerce Web Application
**Target:** UMKM penjual karpet
**Platform:** Web
**Status:** MVP / Development Planning

### Technology Stack

| Layer           | Technology            |
| --------------- | --------------------- |
| Frontend        | Next.js               |
| Backend API     | Hono.js               |
| Runtime         | Cloudflare Workers    |
| Database        | Cloudflare D1         |
| ORM             | Drizzle ORM           |
| Authentication  | Better Auth           |
| Object Storage  | Cloudflare R2         |
| Payment Gateway | DOKU                  |
| Shipping        | External Shipping API |
| Currency        | IDR & USD             |

---

# 2. Product Overview

BUKENS adalah aplikasi e-commerce untuk UMKM yang menjual produk karpet kepada pelanggan lokal maupun internasional.

Sistem memungkinkan pelanggan untuk:

* melihat katalog produk,
* melihat detail produk,
* memasukkan produk ke cart,
* memilih mata uang IDR atau USD,
* menyimpan beberapa alamat,
* menghitung ongkos kirim melalui shipping API,
* melakukan checkout,
* melakukan pembayaran melalui DOKU,
* melihat status pesanan,
* mendapatkan nomor resi,
* dan melakukan tracking melalui website courier.

Admin dapat:

* mengelola produk,
* mengelola harga IDR/USD,
* mengelola stok,
* mengaktifkan/nonaktifkan produk,
* melihat dan memproses pesanan,
* serta memasukkan informasi pengiriman dan nomor resi.

---

# 3. Problem Statement

Proses penjualan produk BUKENS membutuhkan sistem yang mampu mengintegrasikan:

1. katalog produk,
2. harga dalam dua mata uang,
3. stok,
4. cart,
5. alamat pelanggan,
6. perhitungan pengiriman,
7. pajak,
8. pembayaran,
9. pemrosesan order,
10. dan informasi tracking.

Tanpa sistem terintegrasi, data transaksi berisiko tidak konsisten, terutama ketika terjadi perubahan harga, stok, alamat, atau status pembayaran.

BUKENS membutuhkan satu sumber kebenaran pada backend untuk memastikan bahwa harga, stok, ongkos kirim, pajak, dan total pembayaran tidak dapat dimanipulasi dari sisi client.

---

# 4. Product Goals

## Primary Goals

### G1 — Menyediakan katalog produk

Customer dapat melihat produk BUKENS dengan informasi:

* nama,
* deskripsi,
* gambar,
* harga,
* stok,
* berat,
* dan dimensi.

### G2 — Menyediakan shopping cart

Customer dapat:

* menambahkan produk,
* mengubah quantity,
* menghapus produk,
* dan melihat subtotal.

### G3 — Menyediakan checkout

Customer dapat melakukan checkout dengan:

* akun terautentikasi,
* alamat pengiriman,
* currency,
* shipping service,
* tax,
* dan payment method.

### G4 — Menyediakan pembayaran online

Customer dapat membayar order menggunakan DOKU.

Sistem harus menerima konfirmasi pembayaran melalui server-to-server notification dari DOKU.

### G5 — Menyediakan manajemen order

Admin dapat mengelola proses:

```text
Pending Payment
       ↓
Paid
       ↓
Processing
       ↓
Shipped
       ↓
Completed
```

### G6 — Mendukung customer lokal dan internasional

Sistem mendukung:

```text
IDR
USD
```

serta shipping API yang dapat menangani kebutuhan pengiriman berdasarkan destination.

---

# 5. Non-Goals MVP

Fitur berikut **tidak termasuk MVP**:

* product review,
* wishlist,
* coupon,
* loyalty point,
* referral,
* live chat,
* notification center,
* multi-warehouse,
* split shipment,
* inventory ledger kompleks,
* automated refund management,
* custom courier tracking engine,
* automatic currency conversion,
* automatic tax engine,
* recommendation engine.

Fitur tersebut dapat dipertimbangkan pada fase berikutnya.

---

# 6. Target Users

## 6.1 Customer

Customer adalah pengguna yang membeli produk BUKENS.

Kebutuhan utama:

* menemukan produk,
* mengetahui harga,
* mengetahui ketersediaan,
* menghitung shipping,
* melakukan pembayaran,
* dan mengetahui status order.

## 6.2 Admin

Admin adalah pihak BUKENS yang mengelola toko.

Kebutuhan utama:

* mengelola produk,
* mengelola harga,
* mengelola stok,
* memproses order,
* dan mengelola shipment.

---

# 7. User Roles

## CUSTOMER

Permissions:

```text
View products
View product detail
Manage own cart
Manage own addresses
Create order
Create payment
View own orders
View own order detail
View shipment information
```

Customer **tidak boleh**:

```text
View other customers
Modify other customers' orders
Modify product
Modify stock
Modify price
Access admin API
```

## ADMIN

Permissions:

```text
Manage products
Manage product images
Manage prices
Manage stock
View orders
Process orders
Manage shipment
View payment status
```

---

# 8. Authentication Requirements

Customer dapat:

```text
Browse website
        ↓
Product
        ↓
Cart
```

tanpa login.

Namun ketika customer ingin checkout:

```text
Checkout
   ↓
Authenticated?
   ├── NO → Login/Register
   └── YES → Continue
```

### Authentication Rules

1. Customer wajib login sebelum membuat order.
2. Customer hanya dapat mengakses data miliknya sendiri.
3. Admin membutuhkan role `ADMIN`.
4. API tidak boleh mempercayai role dari request body.
5. Session authentication ditangani oleh Better Auth.
6. Password tidak boleh disimpan secara plaintext.

---

# 9. Product Requirements

## PRD-PROD-001 — Product Listing

Sistem harus menyediakan halaman katalog produk.

Informasi minimum:

```text
Product image
Product name
Price
Stock availability
```

Customer dapat membuka detail produk.

---

## PRD-PROD-002 — Product Detail

Product detail menampilkan:

```text
Name
Description
Images
Price
Stock
Weight
Dimensions
```

Harga harus mengikuti currency yang dipilih customer.

---

## PRD-PROD-003 — Product Status

Product memiliki status:

```text
ACTIVE
INACTIVE
```

Product `INACTIVE`:

* tetap dapat muncul pada data admin,
* tidak dapat dibeli pada order baru.

Backend harus melakukan validasi status produk saat checkout.

---

## PRD-PROD-004 — Product Pricing

Setiap product dapat memiliki:

```text
IDR price
USD price
```

Harga ditentukan manual oleh admin.

Sistem **tidak melakukan automatic exchange-rate conversion**.

Contoh:

```text
Karpet A

IDR = 750000
USD = 7500
```

---

# 10. Cart Requirements

## PRD-CART-001

Customer dapat menambahkan produk ke cart.

Cart item memiliki:

```text
product_id
quantity
```

## PRD-CART-002

Customer dapat:

* menambah quantity,
* mengurangi quantity,
* menghapus item.

## PRD-CART-003

Satu customer memiliki satu active cart.

## PRD-CART-004

Cart tidak melakukan stock reservation.

Stock hanya divalidasi ulang saat checkout.

---

# 11. Address Requirements

Customer dapat menyimpan beberapa alamat.

Contoh:

```text
Home
Office
Warehouse
```

Setiap alamat memiliki:

```text
Recipient name
Phone
Address
City
Province
Postal code
Country
Country code
```

Customer dapat menentukan default address.

Customer hanya dapat melihat dan mengubah alamat miliknya sendiri.

---

# 12. Currency Requirements

BUKENS mendukung:

```text
IDR
USD
```

Satu order hanya boleh menggunakan **satu currency**.

Contoh:

```text
Order #BK001
Currency = IDR
```

atau:

```text
Order #BK002
Currency = USD
```

Tidak diperbolehkan:

```text
Order #BK003
Product A = IDR
Product B = USD
```

---

# 13. Checkout Requirements

Checkout merupakan proses utama BUKENS.

Flow:

```text
Cart
 ↓
Authentication
 ↓
Select Currency
 ↓
Select Address
 ↓
Calculate Shipping
 ↓
Calculate Tax
 ↓
Review Order
 ↓
Create Order
 ↓
Payment
```

---

## PRD-CHECKOUT-001 — Authentication

Jika customer belum login:

```text
Checkout
 ↓
Login/Register
 ↓
Return to Checkout
```

---

## PRD-CHECKOUT-002 — Stock Validation

Backend harus melakukan pengecekan ulang:

```text
Product exists?
Product active?
Stock sufficient?
```

Sebelum order dibuat.

Frontend tidak boleh menjadi sumber kebenaran stok.

---

## PRD-CHECKOUT-003 — Price Validation

Backend mengambil harga berdasarkan:

```text
product_id
currency
```

Harga dari frontend tidak boleh dipercaya.

Contoh request:

```text
product_id = P001
quantity = 2
```

Backend mengambil sendiri:

```text
P001
IDR
→ Rp750.000
```

bukan menerima:

```text
price = 1
```

dari client.

---

# 14. Shipping Requirements

Shipping menggunakan external Shipping API.

Input minimum:

```text
Origin
Destination
Weight
Dimensions
Courier
Service
```

Sistem mengambil pilihan shipping dari provider.

Contoh:

```text
Courier A
Regular
Rp25.000

Courier A
Express
Rp50.000
```

Customer memilih salah satu service.

Shipping fee yang dipilih menjadi bagian dari order.

Setelah order dibayar, shipping fee tidak boleh berubah secara diam-diam.

---

# 15. Tax Requirements

Tax dihitung oleh backend.

Sistem menyediakan konfigurasi tax:

```text
Country
Currency
Rate
Active status
```

Tax final disimpan pada order.

Contoh:

```text
Subtotal
Rp750.000

Shipping
Rp50.000

Tax
Rp80.000

Total
Rp880.000
```

Frontend hanya menampilkan hasil perhitungan backend.

---

# 16. Order Requirements

Order menyimpan snapshot transaksi.

Minimum:

```text
Order number
Customer
Currency
Subtotal
Shipping fee
Tax
Discount
Total
Shipping address snapshot
Status
Created at
Updated at
```

## Order Status

MVP:

```text
PENDING_PAYMENT
PAID
PROCESSING
SHIPPED
COMPLETED
```

Status tambahan seperti:

```text
CANCELLED
REFUNDED
PAYMENT_FAILED
EXPIRED
```

dapat ditambahkan ketika payment lifecycle sudah ditentukan lebih lanjut.

---

# 17. Order Item Requirements

Setiap order item menyimpan snapshot:

```text
Product ID
Product name
Unit price
Quantity
Subtotal
```

Tujuannya agar perubahan product setelah transaksi tidak mengubah histori order.

Contoh:

```text
Saat checkout:

Karpet Persian
Rp750.000
× 2
```

Kemudian harga product berubah menjadi:

```text
Rp900.000
```

Order lama tetap:

```text
Rp750.000 × 2
```

---

# 18. Payment Requirements

BUKENS menggunakan DOKU sebagai payment gateway.

Payment dipisahkan dari order karena satu order dapat memiliki beberapa payment attempt.

Payment menyimpan:

```text
Order
Provider
Provider payment ID
Amount
Currency
Status
Payment URL
Expired time
Paid time
```

Payment status:

```text
PENDING
SUCCESS
FAILED
EXPIRED
```

---

# 19. Payment Security

Payment redirect dari DOKU **bukan sumber kebenaran pembayaran**.

Flow:

```text
Customer
   ↓
DOKU
   ↓
Payment
   ↓
DOKU Notification
   ↓
BUKENS Backend
   ↓
Validate Notification
   ↓
Update Payment
   ↓
Update Order
```

Contoh:

```text
Payment SUCCESS
       ↓
Order PAID
```

Backend harus memvalidasi notification sesuai mekanisme keamanan DOKU sebelum mengubah status pembayaran.

---

# 20. Shipment Requirements

Setelah order siap dikirim, admin dapat memasukkan:

```text
Courier
Service
Tracking number
Tracking URL
Estimated delivery
```

Shipment MVP:

```text
1 Order
   ↓
1 Shipment
```

Sistem tidak membuat live tracking sendiri.

Customer hanya diberikan:

```text
Tracking Number
+
Track Shipment button
```

yang mengarah ke website courier.

---

# 21. Admin Product Management

Admin dapat:

### Create Product

Input:

```text
Name
Description
Images
Stock
Weight
Dimensions
IDR price
USD price
Status
```

### Update Product

Admin dapat mengubah:

```text
Name
Description
Images
Stock
Dimensions
Status
Price
```

### Activate / Deactivate

Admin dapat mengubah:

```text
ACTIVE
INACTIVE
```

---

# 22. Admin Order Management

Admin dapat melihat:

```text
Order number
Customer
Order date
Currency
Total
Payment status
Order status
Shipment status
```

Admin dapat membuka detail order:

```text
Customer
Products
Quantity
Price
Subtotal
Shipping
Tax
Total
Address
Payment
Shipment
```

---

# 23. Admin Shipment Management

Admin dapat memasukkan:

```text
Courier
Service
Tracking number
Tracking URL
Estimated delivery
```

Setelah shipment dibuat:

```text
Order status
    ↓
SHIPPED
```

---

# 24. Stock Management

Stock disimpan pada product.

Ketika order berhasil dibuat:

```text
Current stock
    -
Ordered quantity
    =
New stock
```

Namun sistem harus memperhatikan race condition ketika dua customer membeli stok terakhir secara bersamaan.

Stock validation dan stock update harus dilakukan secara aman di backend/database.

---

# 25. Business Rules

### BR-001

Customer wajib login untuk membuat order.

### BR-002

Customer hanya dapat membuat order menggunakan cart miliknya.

### BR-003

Product `INACTIVE` tidak dapat dibeli.

### BR-004

Stock harus divalidasi ulang saat checkout.

### BR-005

Harga harus diambil dari backend.

### BR-006

Frontend tidak boleh menentukan total pembayaran final.

### BR-007

Satu order hanya menggunakan satu currency.

### BR-008

Harga order harus disimpan sebagai snapshot.

### BR-009

Alamat pengiriman order harus disimpan sebagai snapshot.

### BR-010

Shipping fee harus disimpan pada order.

### BR-011

Tax final harus disimpan pada order.

### BR-012

Payment status dan order status harus dipisahkan.

### BR-013

Redirect payment tidak menentukan payment success.

### BR-014

DOKU notification harus divalidasi oleh backend.

### BR-015

Customer tidak boleh mengakses order milik customer lain.

### BR-016

Admin endpoint hanya dapat diakses oleh user dengan role `ADMIN`.

### BR-017

Product image binary disimpan di R2, bukan D1.

### BR-018

Product image metadata disimpan di D1.

### BR-019

Currency tidak menggunakan floating point.

### BR-020

Tracking live ditangani oleh courier eksternal.

---

# 26. Database Requirements

Database utama:

**Cloudflare D1**

ORM:

**Drizzle ORM**

Core business tables:

```text
users

addresses

products
product_prices
product_images

carts
cart_items

orders
order_items

payments
shipments

tax_configurations
```

Authentication tables dari Better Auth:

```text
users
sessions
accounts
verifications
```

Implementasi final schema Better Auth harus mengikuti schema yang dihasilkan/ditentukan oleh versi Better Auth yang digunakan.

---

# 27. Storage Requirements

Cloudflare R2 digunakan untuk:

```text
Product images
```

D1 hanya menyimpan:

```text
Image URL
Product relation
Sort order
Metadata
```

Tidak menyimpan binary image langsung di database.

---

# 28. API Requirements

Backend API menggunakan Hono.

Kategori endpoint:

```text
/auth
/products
/cart
/addresses
/checkout
/orders
/payments
/shipments
/admin
/webhooks
```

Contoh endpoint:

```text
GET    /products
GET    /products/:slug

POST   /cart/items
PATCH  /cart/items/:id
DELETE /cart/items/:id

GET    /addresses
POST   /addresses
PATCH  /addresses/:id
DELETE /addresses/:id

POST   /checkout

GET    /orders
GET    /orders/:id

POST   /payments/doku

POST   /webhooks/doku
```

Endpoint admin:

```text
POST   /admin/products
PATCH  /admin/products/:id
DELETE /admin/products/:id

GET    /admin/orders
GET    /admin/orders/:id

PATCH  /admin/orders/:id/status

POST   /admin/orders/:id/shipment
```

Detail request/response, validation schema, HTTP status code, dan authentication requirement akan ditentukan pada **API Contract**.

---

# 29. Frontend Requirements

## Public Pages

```text
/
 /products
 /products/:slug
 /cart
```

## Authentication

```text
/login
/register
```

## Customer

```text
/checkout
/account
/account/orders
/account/orders/:id
/account/addresses
```

## Admin

```text
/admin
/admin/products
/admin/products/new
/admin/products/:id
/admin/orders
/admin/orders/:id
```

Struktur URL dapat berubah ketika sitemap final dibuat.

---

# 30. Non-Functional Requirements

## Security

Sistem harus:

* menggunakan HTTPS,
* memvalidasi input backend,
* melakukan authorization berdasarkan session/role,
* tidak mempercayai harga dari frontend,
* tidak mempercayai stock dari frontend,
* tidak mempercayai total dari frontend,
* memvalidasi webhook DOKU,
* mencegah customer mengakses resource customer lain,
* dan menggunakan secure session handling.

## Performance

Target MVP:

* halaman katalog cepat diakses,
* image menggunakan optimized delivery,
* database query menggunakan index yang relevan,
* tidak melakukan query database yang tidak diperlukan,
* static/public content dapat memanfaatkan caching Cloudflare.

## Reliability

Sistem harus menjaga konsistensi:

```text
Order
Payment
Stock
Shipment
```

terutama ketika terjadi:

* payment retry,
* webhook duplicate,
* request timeout,
* user refresh,
* atau user kembali dari payment gateway.

---

# 31. Error Handling

Sistem harus menangani minimal:

### Product

```text
Product not found
Product inactive
Insufficient stock
```

### Authentication

```text
Unauthorized
Forbidden
Session expired
```

### Checkout

```text
Invalid address
Shipping unavailable
Price changed
Stock changed
Invalid currency
```

### Payment

```text
Payment creation failed
Payment expired
Payment failed
Invalid notification
Duplicate notification
```

### Shipment

```text
Shipping provider unavailable
Invalid destination
Courier unavailable
```

---

# 32. Success Metrics

MVP dianggap berhasil apabila:

### Customer

* Customer dapat browse product tanpa login.
* Customer dapat membuat account.
* Customer dapat menyimpan address.
* Customer dapat menambahkan product ke cart.
* Customer dapat checkout setelah login.
* Customer dapat memilih IDR/USD.
* Customer dapat memilih shipping service.
* Customer dapat membayar menggunakan DOKU.
* Payment berhasil mengubah status order melalui backend notification.
* Customer dapat melihat order history.
* Customer dapat melihat tracking information.

### Admin

* Admin dapat membuat product.
* Admin dapat mengubah product.
* Admin dapat mengatur IDR/USD price.
* Admin dapat mengatur stock.
* Admin dapat mengaktifkan/nonaktifkan product.
* Admin dapat melihat order.
* Admin dapat mengubah order status.
* Admin dapat memasukkan tracking information.

---

# 33. MVP Acceptance Criteria

MVP BUKENS dianggap **Ready** apabila skenario utama berikut berhasil:

```text
Customer
   ↓
Register/Login
   ↓
Browse Product
   ↓
Add to Cart
   ↓
Checkout
   ↓
Select Address
   ↓
Select Currency
   ↓
Get Shipping Rate
   ↓
Calculate Tax
   ↓
Review Total
   ↓
Create Order
   ↓
DOKU Payment
   ↓
DOKU Notification
   ↓
Backend Validation
   ↓
Payment SUCCESS
   ↓
Order PAID
   ↓
Admin Process
   ↓
Shipment Created
   ↓
Order SHIPPED
   ↓
Customer Sees Tracking
   ↓
Order COMPLETED
```

---

# 34. MVP Scope Summary

### Included

```text
Authentication
Product Catalog
Product Detail
Product Image
Pricing IDR/USD
Cart
Address Management
Checkout
Shipping API
Tax Configuration
Order
Order Items
DOKU Payment
Payment Notification
Stock Management
Shipment
Tracking Link
Admin Dashboard
Admin Product Management
Admin Order Management
```

### Not Included

```text
Reviews
Wishlist
Coupons
Discount Engine
Loyalty
Referral
Live Chat
Recommendation
Multi Warehouse
Split Shipment
Automated Refund
Custom Tracking Engine
Automatic Exchange Rate
Advanced Tax Engine
```

---

# 35. Product Architecture

Final high-level architecture:

```text
                         CUSTOMER
                            │
                            ▼
                     ┌─────────────┐
                     │   Next.js   │
                     │   Frontend  │
                     └──────┬──────┘
                            │
                            │ HTTP
                            ▼
                     ┌─────────────┐
                     │    Hono     │
                     │     API     │
                     └──────┬──────┘
                            │
          ┌─────────────────┼─────────────────┐
          │                 │                 │
          ▼                 ▼                 ▼
     ┌─────────┐      ┌───────────┐     ┌──────────┐
     │ Drizzle │      │ Better    │     │ Business │
     │         │      │ Auth      │     │ Services │
     └────┬────┘      └───────────┘     └────┬─────┘
          │                                    │
          ▼                       ┌────────────┼────────────┐
     ┌─────────┐                  ▼            ▼            ▼
     │   D1    │                DOKU      Shipping API     R2
     └─────────┘
```

---

# 36. Core Principle

Prinsip utama BUKENS:

> **Frontend menampilkan dan meminta. Backend memvalidasi dan memutuskan. Database menyimpan sumber kebenaran. External service menangani layanan spesifiknya.**

Contoh:

```text
Frontend:
"Totalnya Rp880.000."

Backend:
"Sebentar, saya hitung ulang."

Backend:
Product price = Rp750.000
Quantity = 1
Shipping = Rp50.000
Tax = Rp80.000

Total = Rp880.000
```

Frontend tidak pernah menjadi sumber kebenaran transaksi.

Ini menjadi prinsip arsitektur utama BUKENS.

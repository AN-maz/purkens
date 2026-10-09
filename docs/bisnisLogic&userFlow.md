# 1. Business Rules Bukens

Business rules adalah aturan yang **harus selalu benar**, terlepas dari framework yang kita gunakan.

---

## A. Account & Authentication

### BR-01 — Customer wajib login untuk checkout

Customer boleh:

* melihat produk
* melihat detail produk
* menambahkan produk ke cart

Tetapi ketika ingin checkout:

```text
Cart
 ↓
Checkout
 ↓
[Belum login?]
 ↓
Login / Register
```

Customer yang belum login **tidak boleh membuat order**.

---

### BR-02 — Order harus memiliki customer

Setiap order harus memiliki:

```text
Order
 └── customerId
```

Jadi tidak ada:

```text
Order
 └── anonymous customer
```

untuk MVP Bukens.

---

## B. Product & Stock

### BR-03 — Product memiliki harga IDR dan USD

Setiap product aktif memiliki:

```text
priceIDR
priceUSD
```

Contoh:

```text
Karpet A

IDR : Rp750.000
USD : $75
```

---

### BR-04 — Harga ditentukan admin

Customer **tidak pernah mengirim harga final** sebagai sumber kebenaran.

Misalnya frontend mengirim:

```json
{
  "productId": "CARPET-01",
  "quantity": 2
}
```

Backend yang mengambil:

```text
Product
   ↓
priceIDR / priceUSD
```

Ini penting untuk mencegah manipulasi harga.

---

### BR-05 — Product yang inactive tidak dapat dibeli

Product dapat memiliki status:

```text
ACTIVE
INACTIVE
```

Jika:

```text
INACTIVE
```

maka:

* tidak muncul di katalog normal
* tidak dapat dimasukkan ke order baru
* order lama tetap menyimpan snapshot product tersebut

---

### BR-06 — Stock harus mencukupi

Misalnya:

```text
Stock = 5
```

Customer ingin:

```text
Quantity = 6
```

Maka:

```text
❌ Order tidak boleh dibuat
```

---

### BR-07 — Cart tidak menjamin stock

Ini penting.

Misalnya:

```text
10:00
Stock = 5

Customer A
Cart → 5 item

10:05
Customer B
membeli 5 item

10:10
Customer A
Checkout
```

Customer A **tidak otomatis mendapatkan 5 item** hanya karena sudah memasukkannya ke cart.

Stock harus diverifikasi kembali ketika checkout.

---

# 2. Currency Rules

Kita punya:

```text
IDR
USD
```

### BR-08 — Satu order hanya menggunakan satu currency

Jangan sampai:

```text
Product A → IDR
Product B → USD
```

dalam satu order.

Customer memilih market/currency:

```text
Indonesia → IDR
International → USD
```

Kemudian seluruh order menggunakan currency tersebut.

---

### BR-09 — Currency tidak boleh diubah setelah order dibuat

Misalnya:

```text
Order #001

currency = USD
total = $150
```

Kemudian admin mengubah harga product.

Order #001 **tetap $150**.

Jadi kita perlu konsep:

> **Order Price Snapshot**

Order menyimpan harga ketika transaksi dibuat.

---

# 3. Cart Rules

Misalnya:

```text
Cart
├── Karpet A × 2
├── Karpet B × 1
└── Karpet C × 3
```

### BR-10 — Satu cart dapat memiliki banyak product

Setiap item memiliki:

```text
product
quantity
price snapshot?*
```

Untuk cart sendiri kita bisa diskusikan nanti apakah harga disimpan atau selalu dihitung ulang.

Aku cenderung:

```text
Cart
   ↓
Product ID + Quantity
```

Kemudian harga final dihitung ketika checkout.

---

# 4. Checkout Rules

Ketika customer menekan:

> **Checkout**

backend melakukan validasi ulang.

```text
Checkout Request
       │
       ▼
Authenticated?
       │
       ▼
Products exist?
       │
       ▼
Products active?
       │
       ▼
Stock sufficient?
       │
       ▼
Currency valid?
       │
       ▼
Address valid?
       │
       ▼
Shipping available?
       │
       ▼
Calculate tax
       │
       ▼
Calculate total
       │
       ▼
Create Order
```

---

# 5. Shipping Rules

Kita sudah menentukan:

> Shipping menggunakan API.

Maka customer memasukkan:

```text
Shipping Address
├── Name
├── Phone
├── Country
├── Province / State
├── City
├── Postal Code
└── Address
```

Kemudian backend mengirim informasi yang diperlukan ke shipping provider.

Kemungkinan:

```text
Origin
Destination
Weight
Dimension
Courier
```

dan mendapatkan:

```text
Shipping service
Shipping fee
Estimated delivery
```

---

### BR-11 — Shipping fee masuk ke order

Contoh:

```text
Subtotal       $100
Shipping        $20
Tax              $5
───────────────────
Total           $125
```

Order menyimpan breakdown tersebut.

---

### BR-12 — Shipping fee tidak boleh berubah setelah payment

Setelah:

```text
PAID
```

kita tidak boleh tiba-tiba:

```text
Shipping
$20 → $30
```

tanpa mekanisme adjustment/refund yang jelas.

---

# 6. Tax Rules

Untuk tax kita **belum menentukan persentase**.

Aku sarankan rule awal:

> Tax dihitung oleh backend berdasarkan market/destination dan konfigurasi tax yang berlaku.

Misalnya secara konsep:

```text
Tax Configuration

Indonesia
    → Rule A

International
    → Rule B
```

Yang penting:

```text
Frontend ❌ menghitung tax sebagai sumber kebenaran
Backend   ✅ menghitung tax
```

---

# 7. Order Rules

Order adalah **snapshot transaksi**.

Misalnya customer membeli:

```text
Karpet A
Qty: 2
Price: $50
```

Kemudian besok admin mengubah harga:

```text
$50 → $70
```

Order lama tetap:

```text
Karpet A
Qty: 2
Price: $50
```

Karena customer sudah melakukan transaksi berdasarkan harga tersebut.

---

## Order menyimpan kira-kira:

```text
Order
├── customer
├── currency
├── subtotal
├── shippingFee
├── tax
├── discount
├── total
├── shippingAddress
├── status
└── createdAt

OrderItem
├── product
├── productNameSnapshot
├── priceSnapshot
└── quantity
```

Ini akan sangat penting ketika nanti kita bikin database.

---

# 8. Payment Rules

Payment menggunakan DOKU.

Order baru:

```text
PENDING_PAYMENT
```

kemudian customer melakukan pembayaran.

Jika berhasil:

```text
PAID
```

Jika gagal:

```text
PAYMENT_FAILED
```

Jika payment expired:

```text
EXPIRED
```

---

### BR-13 — Redirect bukan bukti pembayaran

Ini salah satu business rule paling penting.

Jangan:

```text
Customer kembali ke Bukens
        ↓
"Success!"
        ↓
Order = PAID
```

Sebaliknya:

```text
DOKU
  ↓
Payment status
  ↓
Backend / webhook
  ↓
Validate
  ↓
Order = PAID
```

Nanti ketika masuk desain DOKU, kita akan bahas mekanisme signature/security-nya.

---

# 9. Shipment Rules

Setelah payment berhasil:

```text
PAID
 ↓
PROCESSING
```

Setelah barang dikirim:

```text
PROCESSING
 ↓
SHIPPED
```

Saat SHIPPED, Bukens menyimpan:

```text
courier
trackingNumber
trackingUrl
```

Customer melihat:

```text
Order #BK-001

Status: SHIPPED

Courier:
DHL

Tracking Number:
XXXXXXXXX

[Track Package]
```

Button tersebut mengarah ke website courier.

Bukens **tidak perlu melakukan live tracking sendiri**.

---

# 10. Order State

Untuk MVP aku menyarankan:

```text
             ┌──────────────┐
             │    CREATED   │
             └──────┬───────┘
                    │
                    ▼
          ┌───────────────────┐
          │ PENDING_PAYMENT   │
          └────────┬──────────┘
                   │
          ┌────────┴────────┐
          │                 │
          ▼                 ▼
        PAID             EXPIRED
          │
          ▼
      PROCESSING
          │
          ▼
       SHIPPED
          │
          ▼
      COMPLETED
```

Dan payment failure:

```text
PENDING_PAYMENT
       │
       ▼
PAYMENT_FAILED
```

Nanti kita bisa menentukan apakah `PAYMENT_FAILED` kembali ke `PENDING_PAYMENT` atau membuat payment attempt baru.

---

# 11. User Flow — Customer

Sekarang kita ubah business rules tadi menjadi flow.

## Flow 1 — Browse Product

```text
Customer
   │
   ▼
Homepage
   │
   ▼
Product Catalog
   │
   ▼
Product Detail
   │
   ├── View price
   ├── View stock
   └── Add to Cart
```

---

# 12. Flow 2 — Cart

```text
Product Detail
      │
      ▼
   Add Cart
      │
      ▼
     Cart
      │
      ├── Product A × 2
      ├── Product B × 1
      │
      ├── Update quantity
      ├── Remove item
      └── Checkout
```

---

# 13. Flow 3 — Checkout

Ini flow paling penting.

```text
                  CART
                    │
                    ▼
                CHECKOUT
                    │
                    ▼
              Is User Login?
                /        \
              NO          YES
              │            │
              ▼            ▼
            LOGIN       CHECKOUT
              │            │
              └─────┬──────┘
                    ▼
              Select Currency
                    │
             ┌──────┴──────┐
             ▼             ▼
            IDR           USD
             │             │
             └──────┬──────┘
                    ▼
             Shipping Address
                    │
                    ▼
             Shipping Options
                    │
                    ▼
              Select Shipping
                    │
                    ▼
               Calculate Tax
                    │
                    ▼
             Order Summary
                    │
                    ▼
             Confirm Order
                    │
                    ▼
             Create Order
                    │
                    ▼
               DOKU Payment
```

---

# 14. Flow 4 — Payment

```text
Order Created
      │
      ▼
PENDING_PAYMENT
      │
      ▼
DOKU Checkout
      │
      ▼
Customer Pays
      │
      ▼
DOKU processes payment
      │
      ▼
Backend receives payment notification
      │
      ▼
Verify notification
      │
      ▼
Update Order
      │
      ▼
     PAID
```

---

# 15. Flow 5 — Shipping

Setelah:

```text
PAID
```

admin/operasional Bukens memproses order.

```text
PAID
 │
 ▼
PROCESSING
 │
 ▼
Prepare Package
 │
 ▼
Create Shipment
 │
 ▼
Get Tracking Number
 │
 ▼
Save Resi
 │
 ▼
SHIPPED
```

Customer:

```text
My Orders
    │
    ▼
Order Detail
    │
    ▼
Tracking Number
    │
    ▼
[Track Package]
    │
    ▼
Courier Website
```

---

# 16. Flow 6 — Customer melihat order

```text
Login
 │
 ▼
My Orders
 │
 ├── BK-001 → PAID
 ├── BK-002 → SHIPPED
 └── BK-003 → COMPLETED
          │
          ▼
      Order Detail
```

Customer dapat melihat:

```text
Order information
Product
Quantity
Price
Subtotal
Shipping
Tax
Total
Address
Payment status
Shipping status
Tracking number
```

---

# 17. Flow 7 — Admin

Karena harga dan shipment dikelola admin, kita sebenarnya sudah punya **Admin Domain**.

```text
ADMIN
 │
 ├── Dashboard
 │
 ├── Products
 │    ├── Create
 │    ├── Update
 │    ├── Stock
 │    └── Activate/Deactivate
 │
 ├── Pricing
 │    ├── IDR
 │    └── USD
 │
 ├── Orders
 │    ├── View
 │    ├── Process
 │    └── Update shipment
 │
 └── Shipment
      ├── Courier
      ├── Resi
      └── Tracking URL
```

---

# 18. Gambaran keseluruhan User Flow

Kalau digabung:

```text
                         BUKENS
                           │
              ┌────────────┴────────────┐
              │                         │
           CUSTOMER                   ADMIN
              │                         │
              ▼                         ▼
          Register/Login             Login
              │                         │
              ▼                         ▼
        Browse Product              Dashboard
              │                         │
              ▼              ┌──────────┼──────────┐
             Cart            │          │          │
              │           Product     Order     Shipment
              ▼
           Checkout
              │
       ┌──────┼────────┐
       │      │        │
    Currency Address Shipping
       │      │        │
       └──────┼────────┘
              │
              ▼
          Tax Calculate
              │
              ▼
          Order Created
              │
              ▼
             DOKU
              │
              ▼
           Payment
              │
         ┌────┴────┐
         │         │
       Failed    Success
                   │
                   ▼
                  PAID
                   │
                   ▼
               PROCESSING
                   │
                   ▼
                SHIPPED
                   │
                   ▼
               COMPLETED
```

---

## 19. Ada satu konsep penting yang baru muncul

Dari seluruh flow ini, Bukens sebenarnya punya **dua jenis status** yang sebaiknya jangan dicampur:

### Order status

```text
PENDING_PAYMENT
PAID
PROCESSING
SHIPPED
COMPLETED
```

### Payment status

```text
PENDING
SUCCESS
FAILED
EXPIRED
```

Kenapa dipisah?

Karena:

```text
Order = PROCESSING
Payment = SUCCESS
```

sangat masuk akal.

Tapi:

```text
Order = PROCESSING
Payment = FAILED
```

tidak masuk akal.

Dengan memisahkan keduanya, kita bisa membuat sistem yang lebih robust dan lebih mudah dikembangkan.

---

# 20. Fondasi Bukens kita sekarang

Jadi sejauh ini:

```text
BUSINESS
├── Customer wajib login
├── IDR / USD
├── Manual pricing
├── Multi-product cart
├── Shipping API
├── Tax configurable
├── DOKU payment
├── Order management
└── External tracking

DOMAIN
├── Auth
├── Customer
├── Product
├── Cart
├── Pricing
├── Checkout
├── Order
├── Payment
├── Shipping
├── Tax
└── Admin
```

**Menurutku ini sudah cukup matang untuk naik ke tahap berikutnya: System Architecture.**

Di sana kita akan menjawab pertanyaan yang lebih teknis seperti:

```text
Next.js
     │
     ├── bagaimana komunikasi dengan Hono?
     │
     ▼
Hono.js
     │
     ├── Auth
     ├── Product API
     ├── Cart API
     ├── Checkout API
     ├── DOKU API
     └── Shipping API
             │
             ├── Database
             ├── DOKU
             └── Shipping Provider
```

Lalu setelah itu baru kita desain **ERD/database**, karena sekarang kita sudah tahu objek dan aturan bisnis yang harus disimpan.

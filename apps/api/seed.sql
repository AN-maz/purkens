-- Seed data contoh untuk pengembangan lokal.
-- Jalankan: npm run db:seed:local

DELETE FROM product_images;
DELETE FROM product_prices;
DELETE FROM products;

INSERT INTO products (id, name, slug, description, stock, weight_grams, length_cm, width_cm, height_cm, status) VALUES
  ('carpet-persian', 'Karpet Persian Klasik', 'karpet-persian-klasik', 'Karpet Persian motif klasik, ditenun tangan.', 10, 5000, 200, 150, 3, 'ACTIVE'),
  ('carpet-turki',   'Karpet Turki Modern',    'karpet-turki-modern',    'Karpet Turki dengan desain modern minimalis.', 5, 4200, 180, 120, 2, 'ACTIVE'),
  ('carpet-shaggy',  'Karpet Bulu Shaggy',     'karpet-bulu-shaggy',     'Karpet bulu lembut, cocok untuk kamar tidur.', 20, 3000, 160, 120, 5, 'ACTIVE'),
  ('carpet-kilim',   'Karpet Kilim Handmade',  'karpet-kilim-handmade',  'Karpet Kilim buatan tangan, edisi terbatas.', 3, 6000, 220, 160, 3, 'ACTIVE');

INSERT INTO product_prices (id, product_id, currency, amount) VALUES
  ('price-persian-idr', 'carpet-persian', 'IDR', 750000),
  ('price-persian-usd', 'carpet-persian', 'USD', 7500),
  ('price-turki-idr',   'carpet-turki',   'IDR', 1250000),
  ('price-turki-usd',   'carpet-turki',   'USD', 12500),
  ('price-shaggy-idr',  'carpet-shaggy',  'IDR', 450000),
  ('price-shaggy-usd',  'carpet-shaggy',  'USD', 4500),
  ('price-kilim-idr',   'carpet-kilim',   'IDR', 2500000),
  ('price-kilim-usd',   'carpet-kilim',   'USD', 25000);

INSERT INTO product_images (id, product_id, url, sort_order) VALUES
  ('img-persian-1', 'carpet-persian', 'https://placehold.co/800x600?text=Karpet+Persian', 0),
  ('img-turki-1',   'carpet-turki',   'https://placehold.co/800x600?text=Karpet+Turki',   0),
  ('img-shaggy-1',  'carpet-shaggy',  'https://placehold.co/800x600?text=Karpet+Shaggy',  0),
  ('img-kilim-1',   'carpet-kilim',   'https://placehold.co/800x600?text=Karpet+Kilim',   0);

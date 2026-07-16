## Fitur
- Login & registrasi email/password
- Chat realtime per room (Postgres Realtime)
- Kirim teks, gambar, video, dan file
- Auto-join room "General" untuk user baru

## Setup
1. Buat akun di [Supabase](https://supabase.com), lalu buat organization dan project baru.
2. Buka **SQL Editor** di project Supabase, lalu jalankan isi `schema.sql`.
3. Buat file `.env.local` di root project dengan isi:

   ```
   NEXT_PUBLIC_SUPABASE_URL=...
   NEXT_PUBLIC_SUPABASE_ANON_KEY=...
   ```

   Kedua nilai ini didapat dari **Project Settings > API** di dashboard Supabase.

4. Install dependency dan jalankan:

   ```
   npm install
   npm run dev
   ```

5. Buka `http://localhost:2257`.

## Struktur Project
```
app/
  page.tsx         # redirect ke /login
  login/page.tsx    # halaman login & registrasi
  chat/page.tsx     # halaman chat utama
lib/
  supabase.ts       # client Supabase
schema.sql          # skema database + RLS policy
```

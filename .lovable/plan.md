
## Perbaikan Input Settings untuk Perhitungan Lebih Detail

### Masalah
Browser memvalidasi input `type="number"` berdasarkan atribut `step`:
- **Biaya Admin (%)**: `step="0.1"` → hanya menerima kelipatan 0.1, sehingga `6.85` ditolak (harus 6.8 atau 6.9)
- **Potongan Tetap (Rp)**: tanpa `step` → default `step="1"`, sehingga `1.300` (desimal) ditolak

### Solusi
Ubah kedua input menggunakan `step="any"` agar browser menerima angka desimal dengan presisi berapa pun.

### Perubahan di `src/pages/SettingsPage.tsx`

**Input Biaya Admin (%)** (baris 102):
- Ubah `step="0.1"` menjadi `step="any"`
- Ini memungkinkan input seperti `6.85`, `6.855`, dll

**Input Potongan Tetap (Rp)** (baris 123-132):
- Tambahkan `step="any"` pada input
- Ini memungkinkan input nilai desimal seperti `1300.5`

### Hasil Setelah Perbaikan
| Field | Sebelum | Sesudah |
|---|---|---|
| Biaya Admin | Hanya menerima 6.8, 6.9 (kelipatan 0.1) | Menerima 6.85, 6.855, dst |
| Potongan Tetap | Hanya menerima bilangan bulat | Menerima 1300, 1300.5, dst |

### File yang Diubah
- **`src/pages/SettingsPage.tsx`** - Tambah `step="any"` pada kedua input

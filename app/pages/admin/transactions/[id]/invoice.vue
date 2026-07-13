<script setup lang="ts">
import type { TransactionView } from "../../../../composables/useTransactions";

definePageMeta({ layout: false });

const { $api } = useNuxtApp();
const { formatDate } = useTransactions();
const route = useRoute();
const router = useRouter();
const id = route.params.id as string;

const view = ref<TransactionView | null>(null);
const address = ref<string>("");
const isLoading = ref(true);
const notFound = ref(false);
const format = ref<"a4" | "thermal">("a4");

const merchant = {
  name: "CAHAYA GADING",
  phone: "085103992545",
  transferInfo: "Transfer A/N. Nurhati H.Andi\nBCA 6320371676",
  footerNote:
    "BARANG YANG SUDAH LAMA DIBELI, TIDAK DAPAT DI TUKAR ATAU DI RETUR",
};

onMounted(async () => {
  try {
    view.value = await $api<TransactionView>(`/transactions/${id}/view`);
    if (view.value.customerId) {
      try {
        const addrRes = await $api<{ items: any[] }>(
          `/customers/${view.value.customerId}/addresses`,
        );
        const addrs = addrRes.items ?? [];
        const def = addrs.find((a) => a.isDefault) ?? addrs[0];
        if (def) {
          address.value = [
            def.addressLine1,
            def.addressLine2,
            def.city,
            def.province,
            def.postalCode,
          ]
            .filter(Boolean)
            .join(", ");
        }
      } catch {}
    }
  } catch {
    notFound.value = true;
  } finally {
    isLoading.value = false;
  }
});

const invoiceNo = computed(() => {
  if (!view.value) return "";
  const d = new Date(view.value.createdAt);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yy = String(d.getFullYear()).slice(2);
  const seq = view.value.id.replace(/-/g, "").slice(-4).toUpperCase();
  return `INV/${dd}${mm}${yy}${seq}`;
});

const formatTanggal = (d: string) =>
  new Date(d).toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

const fmtIDR = (amount: string | number) => {
  const n = typeof amount === "string" ? parseFloat(amount) : amount;
  return new Intl.NumberFormat("id-ID", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
};

const grandTotal = computed(() => parseFloat(view.value?.totalAmount ?? "0"));
const totalPaid = computed(() => parseFloat(view.value?.paidAmount ?? "0"));
const saldo = computed(() => grandTotal.value - totalPaid.value);

const handlePrint = () => {
  const original = document.title;
  document.title = invoiceNo.value;
  window.print();
  document.title = original;
};

const fmtThermal = (amount: string | number) => {
  const n = typeof amount === "string" ? parseFloat(amount) : amount;
  return new Intl.NumberFormat("id-ID", { maximumFractionDigits: 0 }).format(n);
};

const isPaid = computed(() => view.value?.paymentStatus === "paid");
</script>

<template>
  <div class="invoice-shell">
    <div class="controls no-print">
      <button
        class="ctrl-back"
        @click="router.push(`/admin/transactions/${id}`)"
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
        >
          <path d="M19 12H5M12 19l-7-7 7-7" />
        </svg>
        Back
      </button>
      <div class="format-tabs">
        <button
          class="format-tab"
          :class="{ 'format-tab--active': format === 'a4' }"
          @click="format = 'a4'"
        >
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <rect x="3" y="3" width="18" height="18" rx="2" />
          </svg>
          A4 Faktur
        </button>
        <button
          class="format-tab"
          :class="{ 'format-tab--active': format === 'thermal' }"
          @click="format = 'thermal'"
        >
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <rect x="6" y="3" width="12" height="18" rx="2" />
          </svg>
          80mm Struk
        </button>
      </div>
      <div class="ctrl-actions">
        <button class="ctrl-btn ctrl-btn--outline" @click="handlePrint">
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <polyline points="6 9 6 2 18 2 18 9" />
            <path
              d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"
            />
            <rect x="6" y="14" width="12" height="8" />
          </svg>
          Print / Save PDF
        </button>
      </div>
    </div>

    <div v-if="isLoading" class="loading no-print">Loading…</div>
    <div v-else-if="notFound" class="not-found no-print">
      <p>Transaksi tidak ditemukan.</p>
      <button class="ctrl-back" @click="router.push('/admin/transactions')">
        ← Kembali
      </button>
    </div>

    <!-- A4 FAKTUR -->
    <div v-else-if="view && format === 'a4'" class="a4-paper print-target">
      <div class="a4-header">
        <div class="a4-header__left">
          <p class="a4-merchant-name">{{ merchant.name }}</p>
          <p class="a4-merchant-phone">{{ merchant.phone }}</p>
        </div>
        <div class="a4-header__right">
          <table class="a4-meta">
            <tr>
              <td class="a4-meta__key">No. Transaksi</td>
              <td class="a4-meta__sep">:</td>
              <td class="a4-meta__val">{{ invoiceNo }}</td>
            </tr>
            <tr>
              <td class="a4-meta__key">Tanggal</td>
              <td class="a4-meta__sep">:</td>
              <td class="a4-meta__val">{{ formatTanggal(view.createdAt) }}</td>
            </tr>
            <tr>
              <td class="a4-meta__key">Pelanggan</td>
              <td class="a4-meta__sep">:</td>
              <td class="a4-meta__val">{{ view.customerName }}</td>
            </tr>
            <tr v-if="address">
              <td class="a4-meta__key">Alamat</td>
              <td class="a4-meta__sep">:</td>
              <td class="a4-meta__val a4-meta__val--addr">{{ address }}</td>
            </tr>
          </table>
        </div>
      </div>

      <table class="a4-table">
        <thead>
          <tr>
            <th class="a4-th a4-th--desc">Description</th>
            <th class="a4-th a4-th--num">Total Item</th>
            <th class="a4-th a4-th--sat">Satuan</th>
            <th class="a4-th a4-th--price">Harga Item</th>
            <th class="a4-th a4-th--disc">Discount Item</th>
            <th class="a4-th a4-th--total">Total Harga</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in view.items" :key="item.productId" class="a4-tr">
            <td class="a4-td">{{ item.productName }}</td>
            <td class="a4-td a4-td--center">{{ item.qty }}</td>
            <td class="a4-td a4-td--center">{{ item.sku ?? "PC" }}</td>
            <td class="a4-td a4-td--right">{{ fmtIDR(item.unitAmount) }}</td>
            <td class="a4-td a4-td--right">0,00</td>
            <td class="a4-td a4-td--right">{{ fmtIDR(item.lineTotal) }}</td>
          </tr>
        </tbody>
      </table>

      <div class="a4-spacer" />

      <div class="a4-footer">
        <div class="a4-sigs">
          <div class="a4-sig">
            <p class="a4-sig__label">Pembeli</p>
            <div class="a4-sig__space" />
            <div class="a4-sig__line" />
          </div>
          <div class="a4-sig">
            <p class="a4-sig__label">Penjual</p>
            <div class="a4-sig__space a4-sig__space--stamp"></div>
            <div class="a4-sig__line" />
          </div>
        </div>

        <div class="a4-totals">
          <div class="a4-total-row">
            <span class="a4-total-label">Harga</span>
            <span class="a4-total-sep">:</span>
            <span class="a4-total-val">{{ fmtIDR(view.totalAmount) }}</span>
          </div>
          <div class="a4-total-row">
            <span class="a4-total-label">Saldo</span>
            <span class="a4-total-sep">:</span>
            <span class="a4-total-val">{{ fmtIDR(saldo) }}</span>
          </div>
          <div class="a4-total-row">
            <span class="a4-total-label">Discount</span>
            <span class="a4-total-sep">:</span>
            <span class="a4-total-val">0,00</span>
          </div>
          <div class="a4-divider" />
          <div class="a4-total-row a4-total-row--grand">
            <span class="a4-total-label">Total</span>
            <span class="a4-total-sep">:</span>
            <span class="a4-total-val">{{ fmtIDR(grandTotal) }}</span>
          </div>
        </div>
      </div>

      <div class="a4-bottom-note">{{ merchant.footerNote }}</div>
    </div>

    <!-- 80mm STRUK -->
    <div
      v-else-if="view && format === 'thermal'"
      class="thermal-paper print-target"
    >
      <p class="thm-merchant">{{ merchant.name }}</p>
      <p class="thm-phone">{{ merchant.phone }}</p>
      <p class="thm-div">================================</p>
      <div class="thm-row">
        <span>No.</span><span>{{ invoiceNo }}</span>
      </div>
      <div class="thm-row">
        <span>Tgl</span><span>{{ formatTanggal(view.createdAt) }}</span>
      </div>
      <div class="thm-row">
        <span>Pelanggan</span><span>{{ view.customerName }}</span>
      </div>
      <div v-if="address" class="thm-address">{{ address }}</div>
      <p class="thm-div">--------------------------------</p>
      <div class="thm-col-head">
        <span>Produk</span
        ><span class="thm-col-head__right"
          >Jml&nbsp;&nbsp;&nbsp;&nbsp;Total</span
        >
      </div>
      <p class="thm-div-thin">- - - - - - - - - - - - - - - -</p>
      <div v-for="item in view.items" :key="item.productId" class="thm-item">
        <p class="thm-item__name">{{ item.productName }}</p>
        <div class="thm-item__row">
          <span class="thm-item__sku">{{ item.sku ?? "" }}</span>
          <span>{{ item.qty }} x {{ fmtThermal(item.unitAmount) }}</span>
          <span class="thm-item__total">{{ fmtThermal(item.lineTotal) }}</span>
        </div>
      </div>
      <p class="thm-div">================================</p>
      <div class="thm-row thm-row--total">
        <span>TOTAL</span><span>Rp {{ fmtThermal(view.totalAmount) }}</span>
      </div>
      <div class="thm-row">
        <span>Dibayar</span><span>Rp {{ fmtThermal(view.paidAmount) }}</span>
      </div>
      <div v-if="saldo > 0" class="thm-row thm-row--saldo">
        <span>Saldo</span><span>Rp {{ fmtThermal(saldo) }}</span>
      </div>
      <div class="thm-row"><span>Discount</span><span>Rp 0</span></div>
      <p class="thm-div">- - - - - - - - - - - - - - - -</p>
      <div class="thm-transfer">
        <p v-for="line in merchant.transferInfo.split('\n')" :key="line">
          {{ line }}
        </p>
      </div>
      <p class="thm-div">================================</p>
      <div v-if="isPaid" class="thm-lunas">*** LUNAS ***</div>
      <div class="thm-sig-row">
        <div class="thm-sig">
          <div class="thm-sig__space" />
          <p>Pembeli</p>
        </div>
        <div class="thm-sig">
          <div class="thm-sig__space" />
          <p>Penjual</p>
        </div>
      </div>
      <p class="thm-footer-note">{{ merchant.footerNote }}</p>
    </div>
  </div>
</template>

<style>
@media print {
  .no-print {
    display: none !important;
  }
  body,
  html {
    margin: 0;
    padding: 0;
    background: white;
  }
  .invoice-shell {
    background: white;
    min-height: 0 !important;
    display: block !important;
    padding: 0 !important;
    gap: 0;
  }
  .a4-paper {
    width: 100% !important;
    min-height: 0 !important;
    height: auto !important;
    max-height: none !important;
    overflow: visible !important;
    box-shadow: none !important;
    padding: 6mm 6mm 4mm 4mm !important; /* top 6mm clears the cut; balanced sides */
    margin: 0 !important;
    display: block !important;
    font-size: 11.5pt !important; /* bump up from 10pt */
  }
  .thermal-paper {
    box-shadow: none !important;
    width: 72mm !important;
    padding: 2mm !important;
    margin: 0 !important;
  }
  @page {
    size: auto;
    margin: 0mm; /* drop the margin-left: 8px */
  }
}
</style>

<style scoped>
.invoice-shell {
  min-height: 100vh;
  background: #e2e8f0;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding-bottom: 48px;
  gap: 20px;
}
.controls {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 24px;
  background: #1e293b;
  position: sticky;
  top: 0;
  z-index: 10;
  gap: 16px;
}
.ctrl-back {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: none;
  border: none;
  cursor: pointer;
  font-size: 13px;
  font-weight: 500;
  color: #94a3b8;
  font-family: inherit;
  padding: 6px 10px;
  border-radius: 6px;
  transition:
    color 0.15s,
    background 0.15s;
}
.ctrl-back:hover {
  color: #fff;
  background: rgba(255, 255, 255, 0.08);
}
.format-tabs {
  display: flex;
  gap: 4px;
  background: rgba(255, 255, 255, 0.08);
  padding: 4px;
  border-radius: 8px;
}
.format-tab {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px;
  border: none;
  background: none;
  border-radius: 5px;
  font-size: 12.5px;
  font-weight: 500;
  color: #94a3b8;
  cursor: pointer;
  font-family: inherit;
  transition:
    background 0.15s,
    color 0.15s;
}
.format-tab--active {
  background: #fff;
  color: #0f172a;
}
.ctrl-actions {
  display: flex;
  gap: 8px;
}
.ctrl-btn {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 8px 16px;
  border-radius: 7px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  font-family: inherit;
  transition: background 0.15s;
}
.ctrl-btn--outline {
  background: rgba(255, 255, 255, 0.1);
  color: #e2e8f0;
  border: 1px solid rgba(255, 255, 255, 0.2);
}
.ctrl-btn--outline:hover {
  background: rgba(255, 255, 255, 0.18);
}
.loading,
.not-found {
  padding: 48px;
  color: #64748b;
  font-size: 14px;
}

/* A4 */
.a4-paper {
  width: 9.5in;
  height: 5.5in;
  max-height: 5.5in;
  background: #fff;
  padding: 3mm 6mm;
  box-shadow: 0 8px 40px rgba(0, 0, 0, 0.18);
  font-family: Arial, "Helvetica Neue", sans-serif;
  font-size: 8.5pt;
  color: #111;
  position: relative;
  overflow: hidden;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
}

.a4-spacer {
  flex: 1 1 auto;
  min-height: 4mm;
}

.a4-total-row--grand .a4-total-label,
.a4-total-row--grand .a4-total-sep,
.a4-total-row--grand .a4-total-val {
  font-size: 12pt;
  font-weight: 700;
  color: #000;
}
.a4-total-row--grand .a4-total-val {
  font-size: 13pt;
}

.a4-table {
  margin-top: 4mm;
}
.a4-table thead th {
  padding-bottom: 2.5mm;
}
.a4-table tbody tr:first-child td {
  padding-top: 2.5mm;
}

.a4-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 3mm;
  gap: 8mm;
}
.a4-header__left {
  flex: 1 1 0;
  min-height: 20mm;
  display: flex;
  flex-direction: column;
}
.a4-header__right {
  flex: 1 1 0;
}
.a4-merchant-name {
  font-size: 16pt;
  font-weight: 900;
  color: #000;
  margin: 0 0 0.5mm;
  letter-spacing: 0.03em;
}
.a4-merchant-phone {
  font-size: 8.5pt;
  color: #333;
  margin: 0 0 2mm;
}

.a4-transfer-stamp {
  border: 2px solid #cc0000;
  padding: 1.5mm 3mm;
  display: inline-block;
  color: #cc0000;
  font-size: 8pt;
  font-weight: 700;
  line-height: 1.4;
}
.a4-transfer-stamp p {
  margin: 0;
}

.a4-meta {
  border-collapse: collapse;
  font-size: 8.5pt;
  width: 100%;
}
.a4-meta__key {
  color: #333;
  padding-right: 2mm;
  white-space: nowrap;
  vertical-align: top;
}
.a4-meta__sep {
  padding: 0 1.5mm;
  color: #333;
  vertical-align: top;
}
.a4-meta__val {
  color: #000;
  font-weight: 500;
  line-height: 1.3;
}
.a4-meta__val--addr {
  max-width: 70mm;
  word-break: break-word;
  font-size: 8pt;
  line-height: 1.3;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.a4-table {
  width: 100%;
  border-collapse: collapse;
  table-layout: fixed;
}
.a4-th {
  background: #fff;
  color: #111;
  border-top: 1px solid #999;
  border-bottom: 1px solid #999;
  padding: 1.5mm 3mm;
  font-size: 11pt;
  font-weight: 700;
  text-align: center;
  white-space: nowrap;
}
.a4-th--desc {
  text-align: left;
}
.a4-th--num {
  width: 14mm;
}
.a4-th--sat {
  width: 24mm;
}
.a4-th--price {
  width: 30mm;
}
.a4-th--disc {
  width: 16mm;
}
.a4-th--total {
  width: 32mm;
}
.a4-td {
  padding: 1.8mm 3mm;
  font-size: 11pt;
  border-bottom: 0.5px solid #ddd;
  vertical-align: middle;
  height: 6mm;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}
.a4-td--center {
  text-align: center;
  white-space: normal;
  word-break: break-all;
}
.a4-td--right {
  text-align: right;
  font-family: "Courier New", monospace;
  overflow: visible !important; /* beat the base .a4-td overflow: hidden */
  text-overflow: clip !important;
  white-space: nowrap !important;
}
.a4-tr--pad .a4-td {
  border-bottom: 0.5px solid #eee;
  height: 7mm;
}

.a4-footer {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  margin-top: 2mm;
  border-top: 1px solid #999;
  padding-top: 2mm;
}
.a4-sigs {
  display: flex;
  gap: 10mm;
}
.a4-sig {
  width: 40mm;
}
.a4-sig__label {
  font-size: 8.5pt;
  font-weight: 700;
  margin: 0 0 1mm;
  text-align: center;
}
.a4-sig__space {
  height: 10mm;
  position: relative;
}
.a4-sig__space--stamp {
  display: flex;
  align-items: center;
  justify-content: center;
}
.a4-sig__line {
  border-top: 1px solid #333;
}
.a4-watermark {
  border: 2px solid rgba(37, 99, 235, 0.35);
  border-radius: 50%;
  width: 24mm;
  height: 24mm;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  transform: rotate(-15deg);
  position: absolute;
  color: rgba(37, 99, 235, 0.4);
}
.a4-watermark__top {
  font-size: 5.5pt;
  font-weight: 700;
  margin: 0;
  letter-spacing: 0.05em;
  text-align: center;
}
.a4-watermark__bot {
  font-size: 9pt;
  font-weight: 900;
  margin: 0;
  letter-spacing: 0.15em;
}

.a4-totals {
  min-width: 58mm;
}
.a4-total-row {
  display: flex;
  align-items: baseline;
  padding: 0.6mm 0;
  font-size: 8.5pt;
}
.a4-total-label {
  width: 20mm;
  color: #333;
}
.a4-total-sep {
  padding: 0 1.5mm;
  color: #333;
}
.a4-total-val {
  flex: 1;
  text-align: right;
  font-family: "Courier New", monospace;
  font-weight: 500;
  color: #000;
}
.a4-divider {
  border-top: 1px solid #999;
  margin: 1mm 0;
}

.a4-bottom-note {
  margin-top: 2mm;
  padding-top: 2mm;
  border-top: 1px solid #999;
  font-size: 7pt;
  color: #555;
  text-align: center;
  font-style: italic;
}

/* THERMAL */
.thermal-paper {
  width: 72mm;
  background: #fff;
  padding: 4mm 3mm;
  box-shadow: 0 4px 32px rgba(0, 0, 0, 0.15);
  font-family: "Courier New", Courier, monospace;
  font-size: 8pt;
  color: #000;
  line-height: 1.45;
}
.thm-merchant {
  font-size: 11pt;
  font-weight: 900;
  text-align: center;
  margin: 0 0 0.5mm;
  letter-spacing: 0.05em;
}
.thm-phone {
  font-size: 7.5pt;
  text-align: center;
  color: #444;
  margin: 0 0 1mm;
}
.thm-div {
  font-size: 7.5pt;
  color: #555;
  margin: 1.5mm 0;
  text-align: center;
}
.thm-div-thin {
  font-size: 7pt;
  color: #aaa;
  margin: 1mm 0;
  text-align: center;
}
.thm-row {
  display: flex;
  justify-content: space-between;
  font-size: 8pt;
  margin: 0.5mm 0;
}
.thm-row span:last-child {
  text-align: right;
  font-weight: 500;
}
.thm-row--total {
  font-weight: 700;
  font-size: 9.5pt;
}
.thm-row--saldo {
  color: #c00;
}
.thm-address {
  font-size: 7.5pt;
  color: #555;
  margin: 0.5mm 0 0 0;
  padding-left: 1mm;
}
.thm-col-head {
  display: flex;
  justify-content: space-between;
  font-size: 7.5pt;
  font-weight: 700;
  margin: 0.5mm 0;
}
.thm-col-head__right {
  text-align: right;
}
.thm-item {
  margin: 1mm 0;
}
.thm-item__name {
  font-size: 8pt;
  font-weight: 700;
  margin: 0;
}
.thm-item__row {
  display: flex;
  justify-content: space-between;
  font-size: 7.5pt;
  color: #444;
}
.thm-item__sku {
  color: #888;
  flex: 1;
}
.thm-item__total {
  font-weight: 500;
}
.thm-transfer {
  font-size: 7.5pt;
  color: #555;
  text-align: center;
  font-style: italic;
}
.thm-transfer p {
  margin: 0.3mm 0;
}
.thm-lunas {
  text-align: center;
  font-size: 12pt;
  font-weight: 900;
  letter-spacing: 0.15em;
  margin: 2mm 0;
}
.thm-sig-row {
  display: flex;
  justify-content: space-between;
  margin: 2mm 0 1mm;
}
.thm-sig {
  width: 28mm;
  text-align: center;
  font-size: 7.5pt;
}
.thm-sig__space {
  height: 10mm;
  border-bottom: 1px solid #333;
  margin: 0 2mm;
}
.thm-sig p {
  margin: 1mm 0 0;
}
.thm-footer-note {
  font-size: 6.5pt;
  color: #777;
  text-align: center;
  font-style: italic;
  margin: 2mm 0 0;
  line-height: 1.4;
}
</style>

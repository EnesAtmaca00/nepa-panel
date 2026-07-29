import React from "react";

export function computeTotals(lineItems, taxMode) {
  let subtotal = 0;
  let taxAmount = 0;

  if (!lineItems || lineItems.length === 0) return { subtotal: 0, taxAmount: 0, total: 0 };

  lineItems.forEach(item => {
    const lineTotal = (item.quantity || 0) * (item.unit_price || 0);
    subtotal += lineTotal;
    if (taxMode === "excluded") {
      taxAmount += lineTotal * ((item.tax_rate || 0) / 100);
    }
  });

  const total = taxMode === "excluded" ? subtotal + taxAmount : subtotal;
  const displaySubtotal = taxMode === "included" ? subtotal - (subtotal * 0.2 / 1.2) : subtotal;

  return {
    subtotal: taxMode === "included" ? displaySubtotal : subtotal,
    taxAmount: taxMode === "included" ? subtotal - displaySubtotal : taxAmount,
    total: taxMode === "included" ? subtotal : total,
  };
}

export default function InvoiceTotals({ lineItems, taxMode, currency }) {
  const sym = currency === "EUR" ? "€" : "₺";
  const { subtotal, taxAmount, total } = computeTotals(lineItems, taxMode);

  if (!lineItems || lineItems.length === 0) return null;

  return (
    <div className="border rounded-lg p-3 bg-muted/30 space-y-1.5">
      <div className="flex justify-between text-sm">
        <span className="text-muted-foreground">Ara Toplam</span>
        <span>{sym}{subtotal.toLocaleString("tr-TR", { minimumFractionDigits: 2 })}</span>
      </div>
      {taxMode !== "none" && (
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">
            KDV {taxMode === "included" ? "(dahil)" : ""}
          </span>
          <span>{sym}{taxAmount.toLocaleString("tr-TR", { minimumFractionDigits: 2 })}</span>
        </div>
      )}
      <div className="flex justify-between text-sm font-bold border-t pt-1.5 mt-1">
        <span>Genel Toplam</span>
        <span>{sym}{total.toLocaleString("tr-TR", { minimumFractionDigits: 2 })}</span>
      </div>
    </div>
  );
}
import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2 } from "lucide-react";

export default function InvoiceLineItems({ lineItems, onChange, currency }) {
  const sym = currency === "EUR" ? "€" : "₺";

  const addItem = () => {
    onChange([...lineItems, { description: "", quantity: 1, unit_price: 0, tax_rate: 20, total: 0 }]);
  };

  const removeItem = (i) => {
    onChange(lineItems.filter((_, idx) => idx !== i));
  };

  const updateItem = (i, field, value) => {
    const updated = lineItems.map((item, idx) => {
      if (idx !== i) return item;
      const newItem = { ...item, [field]: value };
      newItem.total = (newItem.quantity || 0) * (newItem.unit_price || 0);
      return newItem;
    });
    onChange(updated);
  };

  return (
    <div className="space-y-2">
      {lineItems.length > 0 && (
        <div className="grid grid-cols-12 gap-1 text-xs text-muted-foreground px-1">
          <div className="col-span-5">Açıklama</div>
          <div className="col-span-2 text-center">Miktar</div>
          <div className="col-span-2 text-center">Birim Fiyat</div>
          <div className="col-span-2 text-center">KDV %</div>
          <div className="col-span-1"></div>
        </div>
      )}

      {lineItems.map((item, i) => (
        <div key={i} className="grid grid-cols-12 gap-1 items-center">
          <div className="col-span-5">
            <Input
              value={item.description}
              onChange={(e) => updateItem(i, "description", e.target.value)}
              placeholder="Hizmet adı..."
              className="text-sm"
            />
          </div>
          <div className="col-span-2">
            <Input
              type="number"
              value={item.quantity}
              onChange={(e) => updateItem(i, "quantity", parseFloat(e.target.value) || 0)}
              min="0"
              className="text-sm text-center"
            />
          </div>
          <div className="col-span-2">
            <Input
              type="number"
              value={item.unit_price}
              onChange={(e) => updateItem(i, "unit_price", parseFloat(e.target.value) || 0)}
              min="0"
              className="text-sm"
              placeholder={sym}
            />
          </div>
          <div className="col-span-2">
            <Select
              value={String(item.tax_rate)}
              onValueChange={(v) => updateItem(i, "tax_rate", parseFloat(v))}
            >
              <SelectTrigger className="text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="0">%0</SelectItem>
                <SelectItem value="1">%1</SelectItem>
                <SelectItem value="8">%8</SelectItem>
                <SelectItem value="10">%10</SelectItem>
                <SelectItem value="18">%18</SelectItem>
                <SelectItem value="20">%20</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="col-span-1 flex justify-center">
            <button onClick={() => removeItem(i)} className="text-muted-foreground hover:text-destructive p-1">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="col-span-11 text-right text-xs text-muted-foreground pr-6">
            Toplam: {sym}{((item.quantity || 0) * (item.unit_price || 0)).toLocaleString("tr-TR", { minimumFractionDigits: 2 })}
          </div>
        </div>
      ))}

      <Button type="button" variant="outline" size="sm" onClick={addItem} className="w-full">
        <Plus className="w-3.5 h-3.5 mr-1" /> Satır Ekle
      </Button>
    </div>
  );
}
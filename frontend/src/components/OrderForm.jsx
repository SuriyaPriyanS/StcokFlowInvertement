import React, { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Btn, Field, inputCls } from "./SharedComponents";
import { money } from "../utils/money";

export default function OrderForm({
  entity,
  products,
  partyOptions,
  partyLabel,
  warehouses,
  priceKey,
  priceSource,
  onSave,
  onCancel,
}) {
  const [party, setParty] = useState(
    entity.supplier || entity.customer || partyOptions[0]?._id || ""
  );
  const [warehouse, setWarehouse] = useState(
    entity.warehouse || warehouses[0]?._id || ""
  );
  const [items, setItems] = useState(entity.items || []);

  const updateItem = (idx, patch) => {
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, ...patch } : it)));
  };

  const addItem = () => {
    setItems((prev) => [
      ...prev,
      {
        product: products[0]?._id || "",
        quantity: 1,
        [priceKey]: products[0]?.[priceSource] || 0,
      },
    ]);
  };

  const removeItem = (idx) => setItems((prev) => prev.filter((_, i) => i !== idx));

  const total = items.reduce(
    (s, i) => s + (parseInt(i.quantity, 10) || 0) * (parseFloat(i[priceKey]) || 0),
    0
  );
  const isSupplier = partyLabel === "Supplier";

  const handleSubmit = (e) => {
    e.preventDefault();
    if (items.length === 0) {
      alert("Please add at least one line item");
      return;
    }
    const payload = { warehouse, items };
    if (isSupplier) payload.supplier = party;
    else payload.customer = party;
    onSave(payload);
  };

  return (
    <form className="flex flex-col gap-3" onSubmit={handleSubmit}>
      <div className="grid grid-cols-2 gap-3">
        <Field label={partyLabel}>
          <select className={inputCls} value={party} onChange={(e) => setParty(e.target.value)}>
            {partyOptions.map((p) => (
              <option key={p._id} value={p._id}>
                {p.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Warehouse">
          <select className={inputCls} value={warehouse} onChange={(e) => setWarehouse(e.target.value)}>
            {warehouses.map((w) => (
              <option key={w._id} value={w._id}>
                {w.name}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between border-b border-slate-800 pb-1">
          <span className="text-sm text-slate-400">Line items</span>
          <Btn size="sm" variant="subtle" onClick={addItem}>
            <Plus size={12} /> Add item
          </Btn>
        </div>
        
        {items.map((it, idx) => (
          <div key={idx} className="grid grid-cols-[1fr_80px_100px_28px] gap-2 items-end">
            <Field label="Product">
              <select
                className={inputCls}
                value={it.product}
                onChange={(e) => {
                  const prod = products.find((pp) => pp._id === e.target.value);
                  updateItem(idx, {
                    product: e.target.value,
                    [priceKey]: prod?.[priceSource] || 0,
                  });
                }}
              >
                {products.map((p) => (
                  <option key={p._id} value={p._id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Qty">
              <input
                type="number"
                min="1"
                required
                className={inputCls}
                value={it.quantity}
                onChange={(e) => updateItem(idx, { quantity: parseInt(e.target.value, 10) || 1 })}
              />
            </Field>
            <Field label="Price">
              <input
                type="number"
                min="0"
                step="0.01"
                required
                className={inputCls}
                value={it[priceKey]}
                onChange={(e) => updateItem(idx, { [priceKey]: parseFloat(e.target.value) || 0 })}
              />
            </Field>
            <button
              type="button"
              onClick={() => removeItem(idx)}
              className="text-slate-500 hover:text-rose-400 mb-1.5 flex items-center justify-center p-1"
            >
              <Trash2 size={15} />
            </button>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between border-t border-slate-800 pt-3">
        <span className="text-sm text-slate-400">Total</span>
        <span className="font-mono font-semibold text-lg">{money(total)}</span>
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Btn variant="ghost" onClick={onCancel}>
          Cancel
        </Btn>
        <Btn type="submit">
          Create Order
        </Btn>
      </div>
    </form>
  );
}

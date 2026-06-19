"use client";

import { useState } from "react";
import { createPurchaseOrderAction } from "@/app/app/supply/actions";

type Supplier = { id: string; name: string };
type Material = { id: string; name: string; unit: string; costPerUnit: number };
type Row = { materialId: string; description: string; quantity: number; unitCost: number };

export function PurchaseForm({ suppliers, materials }: { suppliers: Supplier[]; materials: Material[] }) {
  const [rows, setRows] = useState<Row[]>([{ materialId: "", description: "", quantity: 1, unitCost: 0 }]);
  const total = rows.reduce((s, r) => s + r.quantity * r.unitCost, 0);

  function update(i: number, patch: Partial<Row>) {
    setRows((rs) => rs.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  }

  function onMaterial(i: number, materialId: string) {
    const m = materials.find((x) => x.id === materialId);
    update(i, {
      materialId,
      description: m ? m.name : rows[i].description,
      unitCost: m ? m.costPerUnit : rows[i].unitCost,
    });
  }

  return (
    <form action={createPurchaseOrderAction} className="space-y-6">
      <div className="card p-6">
        <label className="label">Fornecedor</label>
        <select name="supplierId" required className="input max-w-md">
          <option value="">Selecione…</option>
          {suppliers.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </div>

      <div className="card p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-cormorant text-xl">Itens</h2>
          <button
            type="button"
            className="btn-ghost"
            onClick={() => setRows((rs) => [...rs, { materialId: "", description: "", quantity: 1, unitCost: 0 }])}
          >
            + Item
          </button>
        </div>
        <div className="space-y-3">
          {rows.map((r, i) => (
            <div key={i} className="grid grid-cols-12 gap-2 items-end">
              <div className="col-span-4">
                {i === 0 && <label className="label">Material</label>}
                <select
                  value={r.materialId}
                  onChange={(e) => onMaterial(i, e.target.value)}
                  className="input"
                  name="materialId"
                >
                  <option value="">(livre)</option>
                  {materials.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="col-span-4">
                {i === 0 && <label className="label">Descrição</label>}
                <input
                  name="desc"
                  value={r.description}
                  onChange={(e) => update(i, { description: e.target.value })}
                  className="input"
                  required
                />
              </div>
              <div className="col-span-2">
                {i === 0 && <label className="label">Qtd</label>}
                <input
                  name="qty"
                  type="number"
                  min={0}
                  step="0.0001"
                  value={r.quantity}
                  onChange={(e) => update(i, { quantity: Number(e.target.value) })}
                  className="input"
                />
              </div>
              <div className="col-span-2">
                {i === 0 && <label className="label">Custo un.</label>}
                <input
                  name="cost"
                  type="number"
                  min={0}
                  step="0.0001"
                  value={r.unitCost}
                  onChange={(e) => update(i, { unitCost: Number(e.target.value) })}
                  className="input"
                />
              </div>
            </div>
          ))}
        </div>
        <div className="flex justify-end font-cormorant text-2xl mt-4 pt-4 border-t border-line">
          Total: {total.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
        </div>
      </div>

      <div className="flex justify-end">
        <button type="submit" className="btn-gold">Criar pedido de compra</button>
      </div>
    </form>
  );
}

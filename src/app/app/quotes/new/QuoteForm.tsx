"use client";

import { useState } from "react";
import { createQuoteAction } from "@/app/app/actions";

type Customer = { id: string; name: string };
type Row = { description: string; quantity: number; unitPrice: number };

export function QuoteForm({ customers }: { customers: Customer[] }) {
  const [rows, setRows] = useState<Row[]>([{ description: "", quantity: 1, unitPrice: 0 }]);
  const [discount, setDiscount] = useState(0);

  const subtotal = rows.reduce((s, r) => s + r.quantity * r.unitPrice, 0);
  const total = Math.max(0, subtotal - discount);

  function update(i: number, patch: Partial<Row>) {
    setRows((rs) => rs.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  }

  return (
    <form action={createQuoteAction} className="space-y-6">
      <div className="card p-6">
        <label className="label">Cliente</label>
        <select name="customerId" required className="input max-w-md">
          <option value="">Selecione…</option>
          {customers.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
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
            onClick={() => setRows((rs) => [...rs, { description: "", quantity: 1, unitPrice: 0 }])}
          >
            + Item
          </button>
        </div>

        <div className="space-y-3">
          {rows.map((r, i) => (
            <div key={i} className="grid grid-cols-12 gap-2 items-end">
              <div className="col-span-6">
                {i === 0 && <label className="label">Descrição</label>}
                <input
                  name="desc"
                  value={r.description}
                  onChange={(e) => update(i, { description: e.target.value })}
                  className="input"
                  placeholder="Ex.: Mocassim couro liso, grade 33-40"
                  required
                />
              </div>
              <div className="col-span-2">
                {i === 0 && <label className="label">Qtd</label>}
                <input
                  name="qty"
                  type="number"
                  min={1}
                  value={r.quantity}
                  onChange={(e) => update(i, { quantity: Number(e.target.value) })}
                  className="input"
                />
              </div>
              <div className="col-span-3">
                {i === 0 && <label className="label">Preço unit.</label>}
                <input
                  name="price"
                  type="number"
                  min={0}
                  step="0.01"
                  value={r.unitPrice}
                  onChange={(e) => update(i, { unitPrice: Number(e.target.value) })}
                  className="input"
                />
              </div>
              <div className="col-span-1">
                {rows.length > 1 && (
                  <button
                    type="button"
                    onClick={() => setRows((rs) => rs.filter((_, idx) => idx !== i))}
                    className="btn-ghost px-2"
                    aria-label="Remover"
                  >
                    ×
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="card p-6 grid sm:grid-cols-2 gap-6">
        <div>
          <label className="label">Observações</label>
          <textarea name="notes" rows={3} className="input" />
        </div>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted">Subtotal</span>
            <span>{subtotal.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-muted">Desconto</span>
            <input
              name="discount"
              type="number"
              min={0}
              step="0.01"
              value={discount}
              onChange={(e) => setDiscount(Number(e.target.value))}
              className="input w-32 text-right"
            />
          </div>
          <div className="flex justify-between font-cormorant text-2xl pt-2 border-t border-line">
            <span>Total</span>
            <span>{total.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</span>
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <button type="submit" className="btn-gold">
          Criar orçamento
        </button>
      </div>
    </form>
  );
}

"use client";

export function PrintButton() {
  return (
    <button type="button" onClick={() => window.print()} className="btn-ghost flex-1 justify-center">
      Imprimir / PDF
    </button>
  );
}

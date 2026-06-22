# Motor de preço — Fermo Studio

Fonte de verdade é o **servidor** (`src/server/studio/pricing.ts`). O front só exibe.

## Entradas
modelo-base, materiais/cores, solado, forro, palmilha, cadarço, embalagem,
personalizações, quantidade, grade, amostra/desenvolvimento, urgência.

## Fórmula (conceitual)
```
custoMateriais   = Σ(opção.consumo × custoUnitário)
custoProducao    = corte + pesponto + montagem + acabamento + QC + embalagem
custoUnitarioBase= materiais + produção + perdas% + custos indiretos
precoUnitario    = custoUnitarioBase + personalizações + complexidade + margem + impostos − descontoVolume
total            = precoUnitario × qtd + desenvolvimento + modelagem + amostra + serviços + frete
sinal            = total × sinal%
```

## Versionamento e snapshot
- `PriceProfileVersion.params` guarda margem, custos de operação, perdas, impostos, sinal%,
  validade etc. `VolumeDiscount` define faixas (12–29, 30–49, …) editáveis.
- Ao gerar o orçamento, gravamos um **snapshot imutável** (params + opções + breakdown)
  em `StudioProject.priceSnapshot` e no `QuoteVersion.snapshot`. Alterar a tabela depois
  **não** muda orçamentos já emitidos.

## Saída (breakdown)
desenvolvimento, modelagem, amostra, materiais, produção, personalização, embalagem,
unitário, subtotal, desconto, impostos, frete, sinal, saldo, total + prazos.

# Assets 3D — Fermo Studio

Os modelos 3D iniciais são **DEMONSTRATIVOS** (`public/models/*.glb`, marcados como DEMO).
Não apresente como modelos finais.

## Substituir pelos modelos reais
1. Exporte o GLB do calçado (Blender), com **malhas nomeadas** por componente
   (ex.: `Upper_Main`, `Side_Left`, `Outsole`, `Tongue`, `Laces`...).
2. Otimização recomendada: Draco + KTX2 + escala/centralização.
3. No admin (`/app/fermo-studio/modelos`), envie o GLB e mapeie cada malha aos
   componentes comerciais via `editableMeshes`:
   ```json
   { "editableMeshes": [
     {"key":"upper_main","label":"Cabedal","meshNames":["Upper_Main"],"colorEnabled":true,"logoEnabled":false},
     {"key":"sole","label":"Solado","meshNames":["Outsole","Midsole"],"colorEnabled":true,"logoEnabled":false}
   ]}
   ```
4. Variantes de cor do GLB (KHR_materials_variants) são detectadas automaticamente.

## Storage
Defina `STORAGE_PROVIDER`/`STORAGE_*` para enviar GLBs a S3/Cloudinary. Sem isso, o
upload usa `/public/models` (apenas dev/demo).

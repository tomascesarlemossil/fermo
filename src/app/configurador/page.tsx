import { getPublicCatalog } from "@/server/catalog";
import { Configurator } from "./Configurator";

export const dynamic = "force-dynamic";

export default async function ConfiguradorPage() {
  const slug = process.env.DEFAULT_TENANT_SLUG || "fermo";
  const { products, materials } = await getPublicCatalog(slug);
  const models = products.map((p) => p.name);
  const couros = materials
    .filter((m) => (m.category || "").toLowerCase() === "couro")
    .map((m) => m.name);

  return <Configurator models={models} couros={couros} />;
}

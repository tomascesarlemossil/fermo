import { NextResponse } from "next/server";
import { captureLeadForTenant, leadInputSchema } from "@/server/crm";

/**
 * Captura pública de lead a partir do site. O tenant é resolvido no servidor
 * (DEFAULT_TENANT_SLUG ou ?tenant=), nunca enviado pelo front.
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = leadInputSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, errors: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }
    const url = new URL(req.url);
    const slug = url.searchParams.get("tenant") || process.env.DEFAULT_TENANT_SLUG || "fermo";
    const lead = await captureLeadForTenant(slug, parsed.data);
    return NextResponse.json({ ok: true, id: lead.id });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Erro inesperado." },
      { status: 500 },
    );
  }
}

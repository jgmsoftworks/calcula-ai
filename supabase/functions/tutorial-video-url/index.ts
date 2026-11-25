// Gera link temporário para vídeo de tutorial publicado. Só usuários logados.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const auth = req.headers.get("Authorization");
    if (!auth?.startsWith("Bearer ")) return json({ error: "Não autorizado" }, 401);
    const url = Deno.env.get("SUPABASE_URL")!;
    const userClient = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: auth } },
    });
    const { data: claims, error: authErr } = await userClient.auth.getClaims(auth.slice(7));
    if (authErr || !claims?.claims?.sub) return json({ error: "Não autorizado" }, 401);

    const body = await req.json().catch(() => null);
    const path = typeof body?.storagePath === "string" ? body.storagePath : "";
    if (!path || path.length > 500) return json({ error: "Caminho inválido" }, 400);

    const admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: isAdmin } = await admin.rpc("has_role_or_higher", {
      required_role: "admin", check_user_id: claims.claims.sub,
    });
    if (!isAdmin) {
      const { data: video } = await admin
        .from("tutorial_videos")
        .select("id, is_published, tutorial_categories!inner(is_published)")
        .eq("storage_path", path)
        .eq("is_published", true)
        .eq("tutorial_categories.is_published", true)
        .maybeSingle();
      if (!video) return json({ error: "Vídeo indisponível" }, 404);
    }
    const { data, error } = await admin.storage.from("tutorial-videos").createSignedUrl(path, 900);
    if (error || !data?.signedUrl) return json({ error: "Vídeo indisponível" }, 404);
    return json({ signedUrl: data.signedUrl });
  } catch (e) {
    console.error("tutorial-video-url", e);
    return json({ error: "Erro interno" }, 500);
  }
});

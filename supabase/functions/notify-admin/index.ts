// Supabase Edge Function: notify-admin
// Resides under: supabase/functions/notify-admin/index.ts

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight request
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { record } = await req.json();
    if (!record) {
      throw new Error("No record found in request body");
    }

    const { nome, email } = record;
    if (!nome || !email) {
      throw new Error("Nome and email are required fields");
    }

    console.log(`[Edge Function] Notifying admin about pending user: ${nome} (${email})`);

    // Fetch credentials from Supabase Environment Variables
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    const ADMIN_EMAIL = Deno.env.get("ADMIN_EMAIL") || "EmersonOliveira.Goncalves@gmail.com";

    let emailSent = false;
    let details = "";

    if (RESEND_API_KEY) {
      // Dispatch real email via Resend API
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${RESEND_API_KEY}`,
        },
        body: JSON.stringify({
          from: "Torre de Comando <onboarding@resend.dev>",
          to: ADMIN_EMAIL,
          subject: "Novo Cadastro Pendente - Torre de Comando",
          html: `
            <div style="font-family: sans-serif; padding: 20px; color: #333;">
              <h2 style="color: #ea580c;">Solicitação de Acesso Pendente</h2>
              <p>Olá Administrador,</p>
              <p>Um novo colaborador solicitou acesso ao sistema <strong>Torre de Comando Volumosos</strong>:</p>
              <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
                <tr>
                  <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold; width: 120px;">Nome:</td>
                  <td style="padding: 8px; border: 1px solid #ddd;">${nome}</td>
                </tr>
                <tr>
                  <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">E-mail:</td>
                  <td style="padding: 8px; border: 1px solid #ddd;">${email}</td>
                </tr>
                <tr>
                  <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">Situação:</td>
                  <td style="padding: 8px; border: 1px solid #ddd; color: #ea580c; font-weight: bold;">Pendente</td>
                </tr>
              </table>
              <p>Por favor, acesse o painel administrativo na aba <strong>Controle de Acessos</strong> para aprovar a liberação.</p>
              <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;" />
              <p style="font-size: 11px; color: #666;">Este é um e-mail automático disparado pelo Supabase Edge Functions.</p>
            </div>
          `,
        }),
      });

      if (res.ok) {
        emailSent = true;
        details = "Disparado via Resend API com sucesso.";
      } else {
        const text = await res.text();
        details = `Falha ao disparar via Resend: ${text}`;
        console.error(details);
      }
    } else {
      // Simulation fallback if Resend credentials are not set yet
      emailSent = true;
      details = "Simulação ativada (RESEND_API_KEY ausente). E-mail de notificação gerado no log.";
      console.log(`[Email Simulation] To: ${ADMIN_EMAIL} | Subject: Novo Cadastro Pendente | User: ${nome} (${email})`);
    }

    return new Response(JSON.stringify({ success: true, emailSent, details }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (err: any) {
    console.error("[Edge Function Error]", err.message);
    return new Response(JSON.stringify({ error: err.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});

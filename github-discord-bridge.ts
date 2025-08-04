/**
 * Welcome to Cloudflare Workers! This is your first worker.
 *
 * - Run "npm run dev" in your terminal to start a development server
 * - Open a browser tab at http://localhost:8787/ to see your worker in action
 * - Run "npm run deploy" to publish your worker
 *
 * Learn more at https://developers.cloudflare.com/workers/
 */

export default {
  async fetch(request, env, ctx) {
    const SECRET = env.SECRET;
    const DISCORD_WEBHOOK = env.DISCORD_WEBHOOK;

    if (request.method !== "POST") {
      return new Response("Method Not Allowed", { status: 405 });
    }

    const signature = request.headers.get("X-Hub-Signature-256");
    if (!signature) {
      return new Response("Missing signature", { status: 401 });
    }

    const rawBody = await request.arrayBuffer();

    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(SECRET),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );

    const signed = await crypto.subtle.sign("HMAC", key, rawBody);
    const actualSignature = "sha256=" + Array.from(new Uint8Array(signed))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    if (signature !== actualSignature) {
      return new Response("Invalid signature", { status: 401 });
    }

    const payload = JSON.parse(new TextDecoder().decode(rawBody));

    if (payload.action === "started" && payload.sender && payload.repository) {
      const sender = payload.sender.login;
      const repo = payload.repository.full_name;

      const message = {
        content: `${sender} – just starred ⭐️ ${repo}`
      };

      await fetch(DISCORD_WEBHOOK, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(message),
      });

      return new Response("OK", { status: 200 });
    }

    return new Response("Ignored", { status: 200 });
  }
}

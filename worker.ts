export interface Env {
  ASSETS: { fetch: (request: Request) => Promise<Response> };
  FIREBASE_API_KEY: string;
  FIREBASE_AUTH_DOMAIN: string;
  FIREBASE_PROJECT_ID: string;
  FIREBASE_STORAGE_BUCKET: string;
  FIREBASE_MESSAGING_SENDER_ID: string;
  FIREBASE_APP_ID: string;
}

export default {
  async fetch(request: Request, env: Env, ctx: any): Promise<Response> {
    const url = new URL(request.url);

    // API Handling
    if (url.pathname.startsWith("/api/")) {
      if (url.pathname === "/api/health") {
        return new Response(JSON.stringify({ 
          status: "ok", 
          timestamp: Date.now(),
          service: "QR Student Manager API"
        }), {
          headers: { 
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*"
          },
        });
      }
      return new Response(JSON.stringify({ error: "Not Found" }), { status: 404 });
    }

    // Serve Static Assets via Cloudflare Pages/Workers Assets binding
    // If env.ASSETS is not available (e.g. local dev without binding), fallback to text
    if (!env.ASSETS) {
      return new Response("Environment ASSETS binding not found.", { status: 500 });
    }

    let response = await env.ASSETS.fetch(request);

    // If the response is HTML, inject the environment variables
    const contentType = response.headers.get("Content-Type");
    if (response.status === 200 && contentType && contentType.includes("text/html")) {
        let html = await response.text();
        
        const firebaseConfig = {
            apiKey: env.FIREBASE_API_KEY || "",
            authDomain: env.FIREBASE_AUTH_DOMAIN || "",
            projectId: env.FIREBASE_PROJECT_ID || "",
            storageBucket: env.FIREBASE_STORAGE_BUCKET || "",
            messagingSenderId: env.FIREBASE_MESSAGING_SENDER_ID || "",
            appId: env.FIREBASE_APP_ID || ""
        };

        // Inject config as a global variable before the closing head tag
        const injection = `<script>window.FIREBASE_ENV = ${JSON.stringify(firebaseConfig)};</script>`;
        html = html.replace('</head>', `${injection}</head>`);

        return new Response(html, {
            status: 200,
            headers: response.headers
        });
    }

    return response;
  },
};
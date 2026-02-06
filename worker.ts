
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
    if (!env.ASSETS) {
      return new Response("Environment ASSETS binding not found.", { status: 500 });
    }

    // IMPORTANT: For HTML requests, we must bypass browser caching (304 Not Modified) 
    // to ensure we always get the full response body to inject environment variables.
    let assetRequest = request;
    const isHtmlRequest = url.pathname === '/' || url.pathname.endsWith('.html') || !url.pathname.includes('.');
    
    if (isHtmlRequest) {
        const newHeaders = new Headers(request.headers);
        // Strip conditional headers to force a 200 OK response from the asset binding
        newHeaders.delete('If-None-Match');
        newHeaders.delete('If-Modified-Since');
        assetRequest = new Request(request.url, {
            method: request.method,
            headers: newHeaders,
            body: request.body
        });
    }

    let response = await env.ASSETS.fetch(assetRequest);

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

        // Inject config as a global variable
        const injection = `<script>window.FIREBASE_ENV = ${JSON.stringify(firebaseConfig)};</script>`;
        
        // Robust injection: try replacing closing head, otherwise closing body
        if (html.includes('</head>')) {
            html = html.replace('</head>', `${injection}</head>`);
        } else if (html.includes('</body>')) {
            html = html.replace('</body>', `${injection}</body>`);
        } else {
            // Last resort: append to end
            html += injection;
        }

        return new Response(html, {
            status: 200,
            headers: response.headers
        });
    }

    return response;
  },
};

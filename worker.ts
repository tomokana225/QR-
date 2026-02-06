
export interface Env {
  ASSETS: { fetch: (request: Request) => Promise<Response> };
  FIREBASE_API_KEY?: string;
  FIREBASE_AUTH_DOMAIN?: string;
  FIREBASE_PROJECT_ID?: string;
  FIREBASE_STORAGE_BUCKET?: string;
  FIREBASE_MESSAGING_SENDER_ID?: string;
  FIREBASE_APP_ID?: string;
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

      if (url.pathname === "/api/config") {
        return new Response(JSON.stringify({
            apiKey: env.FIREBASE_API_KEY || "",
            authDomain: env.FIREBASE_AUTH_DOMAIN || "",
            projectId: env.FIREBASE_PROJECT_ID || "",
            storageBucket: env.FIREBASE_STORAGE_BUCKET || "",
            messagingSenderId: env.FIREBASE_MESSAGING_SENDER_ID || "",
            appId: env.FIREBASE_APP_ID || ""
        }), {
          headers: { 
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
            "Cache-Control": "no-store"
          },
        });
      }

      return new Response(JSON.stringify({ error: "Not Found" }), { status: 404 });
    }

    // Serve Static Assets via Cloudflare Workers Assets binding
    if (!env.ASSETS) {
      return new Response("Environment ASSETS binding not found.", { status: 500 });
    }

    // For HTML requests, bypass cache to ensure environment variables are injected
    let assetRequest = request;
    const isHtmlRequest = url.pathname === '/' || url.pathname.endsWith('.html') || !url.pathname.includes('.');
    
    if (isHtmlRequest) {
        const newHeaders = new Headers(request.headers);
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
        
        // Retrieve variables from the `env` object provided by Cloudflare Runtime
        const firebaseConfig = {
            apiKey: env.FIREBASE_API_KEY || "",
            authDomain: env.FIREBASE_AUTH_DOMAIN || "",
            projectId: env.FIREBASE_PROJECT_ID || "",
            storageBucket: env.FIREBASE_STORAGE_BUCKET || "",
            messagingSenderId: env.FIREBASE_MESSAGING_SENDER_ID || "",
            appId: env.FIREBASE_APP_ID || ""
        };

        const availableKeys = Object.keys(firebaseConfig).filter(k => !!firebaseConfig[k as keyof typeof firebaseConfig]);
        const debugLog = `console.log("QR Manager: Loaded Config Keys:", ${JSON.stringify(availableKeys)});`;

        const injection = `
        <script>
            ${debugLog}
            window.FIREBASE_ENV = ${JSON.stringify(firebaseConfig)};
        </script>
        `;
        
        // Robust injection: try replacing closing head, otherwise closing body, or append
        if (html.includes('</head>')) {
            html = html.replace('</head>', `${injection}</head>`);
        } else if (html.includes('</body>')) {
            html = html.replace('</body>', `${injection}</body>`);
        } else {
            html += injection;
        }

        const newHeaders = new Headers(response.headers);
        // Force no-cache for the HTML to ensure fresh injection on reload
        newHeaders.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
        newHeaders.set('Pragma', 'no-cache');
        newHeaders.set('Expires', '0');

        return new Response(html, {
            status: 200,
            headers: newHeaders
        });
    }

    return response;
  },
};

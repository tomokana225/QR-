export interface Env {
  // Bindings if necessary
}

// FIX: Explicitly define ExecutionContext to resolve the "Cannot find name 'ExecutionContext'" error 
// which typically occurs when workers-types are not configured in the global scope.
export interface ExecutionContext {
  waitUntil(promise: Promise<any>): void;
  passThroughOnException(): void;
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    // Basic routing example
    if (url.pathname === "/api/health") {
      return new Response(JSON.stringify({ status: "ok", timestamp: Date.now() }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    // Default response (assuming frontend handles routing)
    return new Response("QR Student Manager Worker active", { status: 200 });
  },
};

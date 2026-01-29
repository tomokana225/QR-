export interface Env {}

export interface ExecutionContext {
  waitUntil(promise: Promise<any>): void;
  passThroughOnException(): void;
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    // APIリクエストのみをWorkerで処理
    if (url.pathname.startsWith("/api/")) {
      if (url.pathname === "/api/health") {
        return new Response(JSON.stringify({ 
          status: "ok", 
          timestamp: Date.now()
        }), {
          headers: { "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ error: "Not Found" }), { status: 404 });
    }

    // API以外のリクエスト（HTML/JS/CSSなど）はWorkerで干渉せず
    // fetch(request) を返すことで、ホスティング側の静的ファイル配信に任せる
    return fetch(request);
  },
};
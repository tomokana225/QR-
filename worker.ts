export interface Env {
  // 環境変数やBindingがあればここに定義
}

/**
 * Cloudflare Workers Execution Context
 */
export interface ExecutionContext {
  waitUntil(promise: Promise<any>): void;
  passThroughOnException(): void;
}

export default {
  /**
   * メインフェッチハンドラ
   */
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    // APIエンドポイントの処理
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
      
      return new Response(JSON.stringify({ error: "API Route Not Found" }), { 
        status: 404,
        headers: { "Content-Type": "application/json" }
      });
    }

    // 静的ファイル（index.html, JS, CSSなど）については、Workerで介入せず
    // プラットフォーム側の静的配信（Pages Assetsなど）に委ねるよう
    // 404を返すことでフォールバックを促します（環境によってはパススルーが必要）
    return new Response("Not Found", { status: 404 });
  },
};
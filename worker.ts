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

    // APIエンドポイントの例
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
      
      return new Response(JSON.stringify({ error: "Not Found" }), { 
        status: 404,
        headers: { "Content-Type": "application/json" }
      });
    }

    // デフォルトの応答 (フロントエンドのHTMLを想定)
    // 静的アセット配信は通常 Cloudflare Pages や Assets 経由だが、
    // Worker単体で動作させる場合のフォールバック
    return new Response(
      `QRコード学生管理システム Worker実行中.
      アクセス日時: ${new Date().toLocaleString('ja-JP')}`, 
      { 
        status: 200,
        headers: { "Content-Type": "text/plain; charset=utf-8" }
      }
    );
  },
};

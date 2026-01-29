// Cloudflare Workers types
interface Fetcher {
  fetch(request: Request | string, init?: any): Promise<Response>;
}

interface ExecutionContext {
  waitUntil(promise: Promise<any>): void;
  passThroughOnException(): void;
}

export interface Env {
  ASSETS: Fetcher;
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    // APIリクエストの処理（必要に応じて実装）
    if (url.pathname.startsWith("/api/")) {
       if (url.pathname === "/api/health") {
        return new Response(JSON.stringify({ status: "ok" }), {
          headers: { "Content-Type": "application/json" }
        });
      }
    }

    // 静的アセットの取得を試みる
    try {
      // ASSETSバインディングを使ってリクエストされたファイルを取得
      const response = await env.ASSETS.fetch(request);

      // ファイルが見つかった場合 (200 OK) や、304 Not Modified などの場合はそのまま返す
      if (response.status >= 200 && response.status < 400) {
        return response;
      }

      // 404の場合は、SPAのルーティングのために index.html を返す (Fallback)
      // ただし、/api/ などの意図的な404や、画像などのリソースに対する404は除外するのが一般的だが
      // ここではシンプルにHTMLリクエストっぽければindex.htmlを返す
      if (response.status === 404 && !url.pathname.startsWith("/api/")) {
        const indexRequest = new Request(new URL("/index.html", request.url), request);
        return await env.ASSETS.fetch(indexRequest);
      }

      return response;
    } catch (e) {
      // エラー発生時は500を返す
      return new Response("Internal Server Error", { status: 500 });
    }
  },
};
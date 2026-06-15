// Runtime proxy for all /api/* requests.
//
// We deliberately do NOT use next.config rewrites for this: rewrite
// destinations are baked into the build manifest at `next build` time, so a
// runtime BACKEND_URL (the embedded Express server uses a dynamic port) cannot
// be honored. A Route Handler runs on every request and reads process.env
// fresh, so it works with whatever port the desktop shell assigns.

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ path: string[] }> };

function backendBase(): string {
  return (process.env.BACKEND_URL ?? "http://127.0.0.1:3000").replace(
    /\/+$/,
    ""
  );
}

async function proxy(request: Request, path: string[]): Promise<Response> {
  const { search } = new URL(request.url);
  const target = `${backendBase()}/api/${path.join("/")}${search}`;

  const headers = new Headers(request.headers);
  // These are hop-by-hop / connection-specific and must be recomputed by fetch.
  headers.delete("host");
  headers.delete("connection");
  headers.delete("content-length");

  const init: RequestInit = {
    method: request.method,
    headers,
    redirect: "manual",
  };

  if (request.method !== "GET" && request.method !== "HEAD") {
    // Buffer the body so we don't need fetch's half-duplex streaming mode.
    init.body = await request.arrayBuffer();
  }

  let upstream: Response;
  try {
    upstream = await fetch(target, init);
  } catch (error) {
    return Response.json(
      {
        error: `Failed to reach backend at ${target}`,
        detail: error instanceof Error ? error.message : String(error),
      },
      { status: 502 }
    );
  }

  const responseHeaders = new Headers(upstream.headers);
  // fetch already decoded the body; drop framing headers so the client doesn't
  // try to re-decode an already-decoded payload.
  responseHeaders.delete("content-encoding");
  responseHeaders.delete("content-length");
  responseHeaders.delete("transfer-encoding");

  return new Response(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers: responseHeaders,
  });
}

export async function GET(request: Request, ctx: RouteContext) {
  return proxy(request, (await ctx.params).path);
}

export async function POST(request: Request, ctx: RouteContext) {
  return proxy(request, (await ctx.params).path);
}

export async function PUT(request: Request, ctx: RouteContext) {
  return proxy(request, (await ctx.params).path);
}

export async function PATCH(request: Request, ctx: RouteContext) {
  return proxy(request, (await ctx.params).path);
}

export async function DELETE(request: Request, ctx: RouteContext) {
  return proxy(request, (await ctx.params).path);
}

export async function OPTIONS(request: Request, ctx: RouteContext) {
  return proxy(request, (await ctx.params).path);
}

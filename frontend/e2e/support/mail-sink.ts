import http from "node:http";

export interface SentEmail {
  to: string[];
  subject: string;
  html: string;
}

/**
 * A stand-in for Resend. The backend's Resend SDK is pointed here (RESEND_API_URL), so tests
 * exercise the real "send a reset email" code path and then read what would have been delivered.
 *
 *   POST   /emails    what the SDK calls
 *   GET    /messages  everything received so far (optionally ?to=address)
 *   DELETE /messages  forget everything
 */
export function startMailSink(port: number): Promise<http.Server> {
  const inbox: SentEmail[] = [];

  const server = http.createServer((req, res) => {
    const url = new URL(req.url ?? "/", "http://sink");
    const json = (status: number, body: unknown) => {
      res.writeHead(status, { "content-type": "application/json" });
      res.end(JSON.stringify(body));
    };

    if (req.method === "POST" && url.pathname === "/emails") {
      let raw = "";
      req.on("data", (chunk) => (raw += chunk));
      req.on("end", () => {
        try {
          const body = JSON.parse(raw);
          inbox.push({ to: [body.to].flat(), subject: String(body.subject), html: String(body.html) });
          json(200, { id: `mock-${inbox.length}` });
        } catch {
          json(400, { message: "invalid JSON" });
        }
      });
      return;
    }

    if (req.method === "GET" && url.pathname === "/messages") {
      const to = url.searchParams.get("to");
      json(200, to ? inbox.filter((m) => m.to.includes(to)) : inbox);
      return;
    }

    if (req.method === "DELETE" && url.pathname === "/messages") {
      inbox.length = 0;
      json(200, { cleared: true });
      return;
    }

    json(404, { message: "not found" });
  });

  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, "0.0.0.0", () => resolve(server));
  });
}

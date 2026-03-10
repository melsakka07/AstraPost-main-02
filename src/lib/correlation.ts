export function getCorrelationId(req: Request): string {
  return req.headers.get("x-correlation-id") || crypto.randomUUID();
}


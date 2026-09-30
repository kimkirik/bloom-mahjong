const upstream = 'https://bloom-mahjong-garden.kimkirik.chatgpt.site';
const maxBodyBytes = 500000;

// Both deployments use the same replay-validated score database.
// Only these two public game endpoints are forwarded; no browser cookies are sent.
export function createHandler(fetcher = fetch) {
  return async function handler(request, response) {
    const send = (status, data) => {
      response.statusCode = status;
      response.setHeader('Content-Type', 'application/json; charset=utf-8');
      response.setHeader('Cache-Control', 'no-store');
      response.end(JSON.stringify(data));
    };
    const path = new URL(request.url, 'https://game.invalid').pathname;
    const allowed = path === '/api/sessions' ? ['POST'] : path === '/api/scores' ? ['GET', 'POST'] : [];
    if (!allowed.length) return send(404, { error: '없는 주소입니다.' });
    if (!allowed.includes(request.method)) {
      response.setHeader('Allow', allowed.join(', '));
      return send(405, { error: '허용되지 않은 요청입니다.' });
    }
    const origin = request.headers.origin;
    if (origin && origin !== `https://${request.headers.host}`) {
      return send(403, { error: '허용되지 않은 요청입니다.' });
    }
    try {
      const chunks = [];
      let bytes = 0;
      for await (const chunk of request) {
        const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
        bytes += buffer.length;
        if (bytes > maxBodyBytes) return send(413, { error: '기록이 너무 큽니다.' });
        chunks.push(buffer);
      }
      const result = await fetcher(upstream + path, {
        method: request.method,
        headers: { 'Content-Type': 'application/json', Origin: upstream, 'User-Agent': 'Mozilla/5.0 BLOOM-Vercel/1.0' },
        ...(request.method === 'POST' ? { body: Buffer.concat(chunks) } : {}),
        redirect: 'error',
        signal: AbortSignal.timeout(15000),
      });
      const data = await result.json();
      return send(result.status, data);
    } catch {
      return send(503, { error: '기록 서버에 연결하지 못했습니다. 잠시 후 다시 시도해 주세요.' });
    }
  };
}

export default createHandler();

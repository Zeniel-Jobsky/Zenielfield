// Direct Cloudflare demo hosting does not provide the Sites identity boundary.
// Keep the original Sites path intact and fail closed on external operational APIs.
export function prepareCloudflareDemoRequest(request: Request): Request | Response {
  const headers = new Headers(request.headers);
  for (const name of [...headers.keys()]) {
    if (name.startsWith('oai-authenticated-user-')) headers.delete(name);
  }
  const { pathname } = new URL(request.url);
  if (pathname.startsWith('/api/') || ['/signin-with-chatgpt', '/signout-with-chatgpt', '/callback'].includes(pathname)) {
    return Response.json({ error: '공유용 데모입니다. 실제 운영 데이터 연결과 로그인은 이 배포에서 제공하지 않습니다.' }, {
      status: 503,
      headers: { 'Cache-Control': 'no-store' },
    });
  }
  return new Request(request, { headers });
}

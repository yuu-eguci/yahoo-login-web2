// Minimal cookie-keeping HTTP client so that a test can behave like one browser session.
export const createClient = (origin: string) => {
  let cookie: string | undefined

  const request = async (path: string): Promise<Response> => {
    const headers: Record<string, string> = {}
    if (cookie !== undefined) {
      headers.cookie = cookie
    }
    const res = await fetch(new URL(path, origin), { headers, redirect: 'manual' })
    const setCookie = res.headers.getSetCookie()[0]
    if (setCookie !== undefined) {
      cookie = setCookie.split(';')[0]
    }
    return res
  }

  return {
    request,
    get cookie() {
      return cookie
    },
  }
}

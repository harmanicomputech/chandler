/** Base path of the Economic Development site: '/edo' on the shared dev host, '' on its own domain. */
export const EDO_BASE = process.env.NEXT_PUBLIC_EDO_BASE_PATH ?? '/edo';
export const edo = (p: string) => `${EDO_BASE}${p.startsWith('/') ? p : '/' + p}`;

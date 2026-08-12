export const EMAIL_CONFIRM_REDIRECT_URL = 'paly://confirm';
export const PASSWORD_RESET_REDIRECT_URL = 'paly://reset-password';

export type AuthLinkParams = Record<string, string>;

function decode(value: string): string {
  try {
    return decodeURIComponent(value.replace(/\+/g, ' '));
  } catch {
    return value;
  }
}

export function parseAuthLinkParams(url: string | null | undefined): AuthLinkParams {
  if (!url) return {};

  const params: AuthLinkParams = {};
  const [beforeHash, hash = ''] = url.split('#', 2);
  const queryIndex = beforeHash.indexOf('?');
  const query = queryIndex >= 0 ? beforeHash.slice(queryIndex + 1) : '';

  for (const section of [query, hash]) {
    if (!section) continue;

    for (const pair of section.split('&')) {
      const [rawKey, ...rawValue] = pair.split('=');
      if (!rawKey) continue;
      params[decode(rawKey)] = decode(rawValue.join('='));
    }
  }

  return params;
}

export function mergeAuthLinkParams(
  routeParams: Record<string, string | string[]>,
  url: string | null | undefined
): AuthLinkParams {
  const normalizedRouteParams = Object.fromEntries(
    Object.entries(routeParams).flatMap(([key, value]) => {
      const normalized = Array.isArray(value) ? value[0] : value;
      return normalized ? [[key, normalized]] : [];
    })
  );

  return { ...normalizedRouteParams, ...parseAuthLinkParams(url) };
}

function routeWithParams(route: '/confirm' | '/reset-password', url: URL): string {
  const search = url.search.startsWith('?') ? url.search.slice(1) : '';
  const hash = url.hash.startsWith('#') ? url.hash.slice(1) : '';
  const params = [search, hash].filter(Boolean).join('&');
  return params ? `${route}?${params}` : route;
}

export function authRouteFromDeepLink(path: string): string | null {
  try {
    const url = new URL(path);
    if (url.protocol !== 'paly:') return null;

    const host = url.hostname.toLowerCase();
    const pathname = url.pathname.replace(/^\/+|\/+$/g, '').toLowerCase();

    if (
      host === 'confirm' ||
      pathname === 'confirm' ||
      (host === 'auth' && pathname === 'callback')
    ) {
      return routeWithParams('/confirm', url);
    }

    if (host === 'reset-password' || pathname === 'reset-password') {
      return routeWithParams('/reset-password', url);
    }
  } catch {
    // Expo can pass a partially parsed URI while the app is waking up.
    if (path.startsWith('paly://confirm') || path.startsWith('paly:///confirm')) {
      return `/confirm${path.slice(path.indexOf('confirm') + 'confirm'.length)}`;
    }

    if (path.startsWith('paly://reset-password') || path.startsWith('paly:///reset-password')) {
      return `/reset-password${path.slice(path.indexOf('reset-password') + 'reset-password'.length)}`;
    }
  }

  return null;
}

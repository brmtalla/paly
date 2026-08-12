function resetPasswordPath(path: string): string | null {
  try {
    const url = new URL(path);
    if (url.protocol !== 'paly:') {
      return null;
    }

    const isResetHost = url.hostname === 'reset-password';
    const isResetPath = url.pathname === '/reset-password';
    if (!isResetHost && !isResetPath) {
      return null;
    }

    const hashParams = url.hash.startsWith('#') ? url.hash.slice(1) : '';
    const searchParams = url.search.startsWith('?') ? url.search.slice(1) : '';
    const params = [searchParams, hashParams].filter(Boolean).join('&');

    return params ? `/reset-password?${params}` : '/reset-password';
  } catch {
    if (path.startsWith('paly://reset-password')) {
      return `/reset-password${path.slice('paly://reset-password'.length)}`;
    }

    if (path.startsWith('paly:///reset-password')) {
      return `/reset-password${path.slice('paly:///reset-password'.length)}`;
    }

    return null;
  }
}

export function redirectSystemPath({ path }: { path: string; initial: boolean }) {
  return resetPasswordPath(path) ?? path;
}

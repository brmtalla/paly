import { authRouteFromDeepLink } from '../src/lib/authLinks';

export function redirectSystemPath({ path }: { path: string; initial: boolean }) {
  return authRouteFromDeepLink(path) ?? path;
}

import { authRouteFromDeepLink, mergeAuthLinkParams, parseAuthLinkParams } from '../lib/authLinks';

describe('auth deep links', () => {
  it('moves implicit-flow tokens from the URL fragment into the confirm route', () => {
    expect(
      authRouteFromDeepLink(
        'paly://confirm#access_token=access.jwt&refresh_token=refresh-token&type=signup'
      )
    ).toBe('/confirm?access_token=access.jwt&refresh_token=refresh-token&type=signup');
  });

  it('routes PKCE confirmation and password-reset links', () => {
    expect(authRouteFromDeepLink('paly:///confirm?code=confirmation-code')).toBe(
      '/confirm?code=confirmation-code'
    );
    expect(authRouteFromDeepLink('paly://reset-password?code=recovery-code')).toBe(
      '/reset-password?code=recovery-code'
    );
  });

  it('leaves non-Paly URLs alone', () => {
    expect(authRouteFromDeepLink('https://www.paly.study')).toBeNull();
  });

  it('parses encoded query and fragment values without losing equals signs', () => {
    expect(parseAuthLinkParams('paly://confirm?type=email#token_hash=abc%3D%3D')).toEqual({
      type: 'email',
      token_hash: 'abc==',
    });
  });

  it('merges Expo Router params with parameters from the original deep link', () => {
    expect(
      mergeAuthLinkParams({ type: 'signup', code: ['route-code'] }, 'paly://confirm?code=url-code')
    ).toEqual({ type: 'signup', code: 'url-code' });
  });
});

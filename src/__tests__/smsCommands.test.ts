import {
  classifyInbound,
  isValidLinkCode,
  normalizeInbound,
  normalizePhoneNumber,
  LINK_CODE_ALPHABET,
  LINK_CODE_LENGTH,
} from '../../supabase/functions/_shared/smsCommands';

describe('normalizePhoneNumber', () => {
  it('accepts the formats a handset or SendBlue might send', () => {
    expect(normalizePhoneNumber('+19293649402')).toBe('+19293649402');
    expect(normalizePhoneNumber('9293649402')).toBe('+19293649402');
    expect(normalizePhoneNumber('(929) 364-9402')).toBe('+19293649402');
    expect(normalizePhoneNumber('1-929-364-9402')).toBe('+19293649402');
  });

  it('refuses to guess at anything that is not a NANP number', () => {
    // Guessing a country code here would text a stranger.
    expect(normalizePhoneNumber('+442071234567')).toBeNull();
    expect(normalizePhoneNumber('12345')).toBeNull();
    expect(normalizePhoneNumber('')).toBeNull();
  });
});

describe('link codes', () => {
  it('excludes glyphs students confuse when retyping', () => {
    for (const ambiguous of ['0', '1', 'I', 'L', 'O', 'U']) {
      expect(LINK_CODE_ALPHABET).not.toContain(ambiguous);
    }
  });

  it('validates length and alphabet', () => {
    expect(isValidLinkCode('ABC234')).toBe(true);
    expect(isValidLinkCode('ABC23')).toBe(false);
    expect(isValidLinkCode('ABC2340')).toBe(false);
    expect(isValidLinkCode('ABC23O')).toBe(false);
    expect('ABC234'.length).toBe(LINK_CODE_LENGTH);
  });
});

describe('normalizeInbound', () => {
  it('strips punctuation and collapses whitespace', () => {
    expect(normalizeInbound('  stop!  ')).toBe('STOP');
    expect(normalizeInbound('Link my Paly account: ABC234')).toBe('LINK MY PALY ACCOUNT ABC234');
  });
});

describe('classifyInbound', () => {
  it('honours the CTIA opt-out keywords regardless of case or punctuation', () => {
    for (const word of [
      'STOP',
      'stop',
      'Stop.',
      ' STOPALL ',
      'unsubscribe',
      'quit',
      'End',
      'cancel',
    ]) {
      expect(classifyInbound(word).kind).toBe('stop');
    }
  });

  it('honours opt-in and help keywords', () => {
    expect(classifyInbound('start').kind).toBe('start');
    expect(classifyInbound('UNSTOP').kind).toBe('start');
    expect(classifyInbound('help').kind).toBe('help');
  });

  it('does not opt a student out mid-sentence', () => {
    // A student asking for help is not issuing a carrier keyword.
    expect(classifyInbound('I need help with stereoisomers').kind).not.toBe('help');
    expect(classifyInbound('can you stop sending these at 7am').kind).not.toBe('stop');
  });

  it('finds the link code anywhere in the body', () => {
    expect(classifyInbound('Link my Paly account: ABC234')).toEqual({
      kind: 'link',
      code: 'ABC234',
    });
    // Students edit the pre-filled message.
    expect(classifyInbound('hey! ABC234')).toEqual({ kind: 'link', code: 'ABC234' });
    expect(classifyInbound('ABC234')).toEqual({ kind: 'link', code: 'ABC234' });
  });

  it('falls back to unknown when there is no code and no keyword', () => {
    expect(classifyInbound('Hi').kind).toBe('unknown');
    expect(classifyInbound('').kind).toBe('unknown');
  });
});

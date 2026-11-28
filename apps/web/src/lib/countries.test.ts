import { describe, expect, it } from 'vitest';
import { countries, resolveCountry } from './countries';

describe('customer country flags', () => {
  it('uses the current German code rather than the obsolete DD alias', () => {
    for (const value of ['GERMANY', 'Germany', 'DE', 'DEU', 'Deutschland', 'DD']) {
      expect(resolveCountry(value)).toMatchObject({ code: 'DE', flag: '🇩🇪' });
    }
  });
  it('supports common country names and abbreviations', () => {
    expect(resolveCountry('U.A.E.')).toMatchObject({code:'AE',flag:'🇦🇪'});
    expect(resolveCountry('UK')).toMatchObject({code:'GB',flag:'🇬🇧'});
    expect(resolveCountry('KSA')).toMatchObject({code:'SA',flag:'🇸🇦'});
    expect(resolveCountry('USA')).toMatchObject({code:'US',flag:'🇺🇸'});
    expect(resolveCountry('ZZ')).toBeUndefined();
  });
  it('includes all 249 assigned ISO regions plus Kosovo', () => {
    expect(countries).toHaveLength(250);
    expect(new Set(countries.map(country => country.code)).size).toBe(250);
  });
});

/**
 * ISO 3166-1 alpha-2 codes. Names come from Intl.DisplayNames so this file
 * stays small and stays translated by the platform rather than by hand.
 */
const CODES = `AD AE AF AG AI AL AM AO AQ AR AS AT AU AW AX AZ
BA BB BD BE BF BG BH BI BJ BL BM BN BO BQ BR BS BT BV BW BY BZ
CA CC CD CF CG CH CI CK CL CM CN CO CR CU CV CW CX CY CZ
DE DJ DK DM DO DZ
EC EE EG EH ER ES ET
FI FJ FK FM FO FR
GA GB GD GE GF GG GH GI GL GM GN GP GQ GR GS GT GU GW GY
HK HM HN HR HT HU
ID IE IM IN IO IQ IR IS IT
JE JM JO JP
KE KG KH KI KM KN KP KR KW KY KZ
LA LB LC LI LK LR LS LT LU LV LY
MA MC MD ME MF MG MH MK ML MM MN MO MP MQ MR MS MT MU MV MW MX MY MZ
NA NC NE NF NG NI NL NO NP NR NU NZ
OM
PA PE PF PG PH PK PL PM PN PR PS PT PW PY
QA
RE RO RS RU RW
SA SB SC SD SE SG SH SI SJ SK SL SM SN SO SR SS ST SV SX SY SZ
TC TD TF TG TH TJ TK TL TM TN TO TR TT TV TW TZ
UA UG UM US UY UZ
VA VC VE VG VI VN VU
WF WS
YE YT
ZA ZM ZW`
  .split(/\s+/)
  .filter(Boolean);

export interface Country {
  code: string;
  name: string;
}

let cached: Country[] | null = null;
const nameCache = new Map<string, string>();

export function countryName(code: string): string {
  const key = code.trim().toUpperCase();
  if (!key) return "";
  const cachedName = nameCache.get(key);
  if (cachedName) return cachedName;
  let name = key;
  try {
    name = new Intl.DisplayNames(["en"], { type: "region" }).of(key) ?? key;
  } catch {
    name = key;
  }
  nameCache.set(key, name);
  return name;
}

// Operator-configured compliance exclusions. 'IL' excluded per operator legal counsel for Bangladesh distribution. Keep this list minimal, verify with counsel in writing, and mirror it in Play Console availability. Excluding countries can trigger Play policy review. Never silently remap one country code to another.
export const BLOCKED_COUNTRY_CODES = new Set<string>(['IL']);

export function countries(): Country[] {
  if (cached) return cached;
  cached = CODES.filter((code) => !BLOCKED_COUNTRY_CODES.has(code)).map((code) => ({ code, name: countryName(code) })).sort((a, b) =>
    a.name.localeCompare(b.name),
  );
  return cached;
}

export function isValidCountryCode(code: string): boolean {
  const key = code.trim().toUpperCase();
  if (BLOCKED_COUNTRY_CODES.has(key)) return false;
  return CODES.includes(key);
}

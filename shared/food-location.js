// ISO 3166-1 alpha-2 codes. Names come from the runtime's English CLDR data.
export const COUNTRY_CODES = ('AD AE AF AG AI AL AM AO AQ AR AS AT AU AW AX AZ BA BB BD BE BF BG BH BI BJ BL BM BN BO BQ BR BS BT BV BW BY BZ CA CC CD CF CG CH CI CK CL CM CN CO CR CU CV CW CX CY CZ DE DJ DK DM DO DZ EC EE EG EH ER ES ET FI FJ FK FM FO FR GA GB GD GE GF GG GH GI GL GM GN GP GQ GR GS GT GU GW GY HK HM HN HR HT HU ID IE IL IM IN IO IQ IR IS IT JE JM JO JP KE KG KH KI KM KN KP KR KW KY KZ LA LB LC LI LK LR LS LT LU LV LY MA MC MD ME MF MG MH MK ML MM MN MO MP MQ MR MS MT MU MV MW MX MY MZ NA NC NE NF NG NI NL NO NP NR NU NZ OM PA PE PF PG PH PK PL PM PN PR PS PT PW PY QA RE RO RS RU RW SA SB SC SD SE SG SH SI SJ SK SL SM SN SO SR SS ST SV SX SY SZ TC TD TF TG TH TJ TK TL TM TN TO TR TT TV TW TZ UA UG UM US UY UZ VA VC VE VG VI VN VU WF WS YE YT ZA ZM ZW').split(' ');
const countries = new Set(COUNTRY_CODES);
const names = typeof Intl.DisplayNames === 'function' ? new Intl.DisplayNames(['en'], { type: 'region' }) : null;

export function countryName(code) {
  return countries.has(code) ? names?.of(code) || code : '';
}

export function validFoodLocation(value) {
  const country = value?.countryCode;
  const region = value?.region;
  return (country === undefined || country === '' || countries.has(country)) &&
    (region === undefined || (typeof region === 'string' && region.length <= 80 && /^[\p{L}\p{M}\p{N} .,'’()&/-]*$/u.test(region))) &&
    (!region || countries.has(country));
}

export function normalizeFoodLocation(value) {
  const code = typeof value?.countryCode === 'string' ? value.countryCode.trim().toUpperCase() : '';
  const countryCode = countries.has(code) ? code : '';
  const region = countryCode && typeof value?.region === 'string'
    ? value.region.trim().slice(0, 80).replace(/[^\p{L}\p{M}\p{N} .,'’()&/-]/gu, '') : '';
  return { countryCode, region };
}

// Explicit edits in the shared health profile also apply to food planning.
export function resolveFoodLocation(dietProfile, demographics) {
  return normalizeFoodLocation(Object.prototype.hasOwnProperty.call(demographics || {}, 'countryCode') ? demographics : dietProfile);
}

export function formatFoodLocation(value) {
  const { countryCode, region } = normalizeFoodLocation(value);
  return [region, countryName(countryCode)].filter(Boolean).join(', ');
}

// ISO 3166-1 assigned alpha-2 and alpha-3 codes. Do not enumerate arbitrary
// letter pairs: ICU also recognizes obsolete aliases such as DD (East Germany).
const isoCodes = 'AW:ABW AF:AFG AO:AGO AI:AIA AX:ALA AL:ALB AD:AND AE:ARE AR:ARG AM:ARM AS:ASM AQ:ATA TF:ATF AG:ATG AU:AUS AT:AUT AZ:AZE BI:BDI BE:BEL BJ:BEN BQ:BES BF:BFA BD:BGD BG:BGR BH:BHR BS:BHS BA:BIH BL:BLM BY:BLR BZ:BLZ BM:BMU BO:BOL BR:BRA BB:BRB BN:BRN BT:BTN BV:BVT BW:BWA CF:CAF CA:CAN CC:CCK CH:CHE CL:CHL CN:CHN CI:CIV CM:CMR CD:COD CG:COG CK:COK CO:COL KM:COM CV:CPV CR:CRI CU:CUB CW:CUW CX:CXR KY:CYM CY:CYP CZ:CZE DE:DEU DJ:DJI DM:DMA DK:DNK DO:DOM DZ:DZA EC:ECU EG:EGY ER:ERI EH:ESH ES:ESP EE:EST ET:ETH FI:FIN FJ:FJI FK:FLK FR:FRA FO:FRO FM:FSM GA:GAB GB:GBR GE:GEO GG:GGY GH:GHA GI:GIB GN:GIN GP:GLP GM:GMB GW:GNB GQ:GNQ GR:GRC GD:GRD GL:GRL GT:GTM GF:GUF GU:GUM GY:GUY HK:HKG HM:HMD HN:HND HR:HRV HT:HTI HU:HUN ID:IDN IM:IMN IN:IND IO:IOT IE:IRL IR:IRN IQ:IRQ IS:ISL IL:ISR IT:ITA JM:JAM JE:JEY JO:JOR JP:JPN KZ:KAZ KE:KEN KG:KGZ KH:KHM KI:KIR KN:KNA KR:KOR KW:KWT LA:LAO LB:LBN LR:LBR LY:LBY LC:LCA LI:LIE LK:LKA LS:LSO LT:LTU LU:LUX LV:LVA MO:MAC MF:MAF MA:MAR MC:MCO MD:MDA MG:MDG MV:MDV MX:MEX MH:MHL MK:MKD ML:MLI MT:MLT MM:MMR ME:MNE MN:MNG MP:MNP MZ:MOZ MR:MRT MS:MSR MQ:MTQ MU:MUS MW:MWI MY:MYS YT:MYT NA:NAM NC:NCL NE:NER NF:NFK NG:NGA NI:NIC NU:NIU NL:NLD NO:NOR NP:NPL NR:NRU NZ:NZL OM:OMN PK:PAK PA:PAN PN:PCN PE:PER PH:PHL PW:PLW PG:PNG PL:POL PR:PRI KP:PRK PT:PRT PY:PRY PS:PSE PF:PYF QA:QAT RE:REU RO:ROU RU:RUS RW:RWA SA:SAU SD:SDN SN:SEN SG:SGP GS:SGS SH:SHN SJ:SJM SB:SLB SL:SLE SV:SLV SM:SMR SO:SOM PM:SPM RS:SRB SS:SSD ST:STP SR:SUR SK:SVK SI:SVN SE:SWE SZ:SWZ SX:SXM SC:SYC SY:SYR TC:TCA TD:TCD TG:TGO TH:THA TJ:TJK TK:TKL TM:TKM TL:TLS TO:TON TT:TTO TN:TUN TR:TUR TV:TUV TW:TWN TZ:TZA UG:UGA UA:UKR UM:UMI UY:URY US:USA UZ:UZB VA:VAT VC:VCT VE:VEN VG:VGB VI:VIR VN:VNM VU:VUT WF:WLF WS:WSM YE:YEM ZA:ZAF ZM:ZMB ZW:ZWE XK:XKX';

const displayNames = new Intl.DisplayNames(['en'], { type: 'region' });
const normalize = (value: string) => value.trim().toLowerCase().replace(/[.]/g, '').replace(/\s+/g, ' ');
export const countries = isoCodes.split(' ').map(pair => {
  const [code, alpha3] = pair.split(':');
  return { code, alpha3, name: displayNames.of(code) ?? code, flag: String.fromCodePoint(...Array.from(code, char => 0x1F1E6 + char.charCodeAt(0) - 65)) };
}).sort((a,b) => a.name.localeCompare(b.name, 'en'));

const byValue = new Map(countries.flatMap(country => [country.code, country.alpha3, country.name].map(value => [normalize(value), country] as const)));
const aliases: Record<string, string> = {
  uae: 'AE', emirates: 'AE', dubai: 'AE', 'abu dhabi': 'AE', uk: 'GB', 'great britain': 'GB', britain: 'GB', england: 'GB',
  america: 'US', 'united states of america': 'US', ksa: 'SA', 'saudi arabia': 'SA', 'south korea': 'KR', 'republic of korea': 'KR',
  'hong kong': 'HK', 'czech republic': 'CZ', vietnam: 'VN', russia: 'RU', turkey: 'TR', deutschland: 'DE', dd: 'DE',
  'federal republic of germany': 'DE', 'ivory coast': 'CI', 'the netherlands': 'NL', 'north korea': 'KP',
  'palestinian territories': 'PS', palestine: 'PS', 'cape verde': 'CV', swaziland: 'SZ', burma: 'MM',
};
for (const [alias, code] of Object.entries(aliases)) {
  const country = byValue.get(normalize(code));
  if (country) byValue.set(normalize(alias), country);
}

export function resolveCountry(value: unknown) {
  return typeof value === 'string' ? byValue.get(normalize(value)) : undefined;
}

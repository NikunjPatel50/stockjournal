import {
  getIndianSector,
  type IndianSector,
} from "@/lib/screener/indian-sectors";

/**
 * NSE-maintained sector & thematic indices — matches Definedge Rzone
 * "NSE All Sectors" (official NSE index returns, not stock baskets).
 */
export const NSE_ALL_SECTOR_IDS = [
  "nifty-50",
  // Sectoral indices
  "auto",
  "bank",
  "psu-bank",
  "private-bank",
  "financials",
  "fin-services-25-50",
  "fin-ex-bank",
  "midsmall-financial",
  "it",
  "midsmall-it-telecom",
  "fmcg",
  "consumer-durables",
  "pharma",
  "healthcare",
  "nifty500-healthcare",
  "midsmall-healthcare",
  "media",
  "metal",
  "cement",
  "chemicals",
  "energy",
  "oil-gas",
  "realty",
  "reits",
  "housing",
  "infra",
  "construction",
  "india-infra-logistics",
  "logistics",
  "commercial-transport",
  "mobility",
  "ev",
  "manufacturing",
  "defence",
  "railways-psu",
  "tourism",
  "services",
  "internet",
  "digital",
  "capital-markets",
  "mnc",
  "pse",
  "cpse",
  "rural",
  // Thematic / consumption
  "consumption",
  "midsmall-consumption",
  "noncyc-consumer",
  "india-new-age-consumption",
  "commodities",
] as const;

const NSE_SECTOR_LABELS: Record<string, string> = {
  "nifty-50": "Nifty 50",
  auto: "Nifty Auto",
  bank: "Nifty Bank",
  "psu-bank": "Nifty PSU Bank",
  "private-bank": "Nifty Private Bank",
  financials: "Nifty Financial Services",
  "fin-services-25-50": "Nifty Financial Services 25/50",
  "fin-ex-bank": "Nifty Financial Services Ex-Bank",
  "midsmall-financial": "Nifty MidSml Fin Services",
  it: "Nifty IT",
  "midsmall-it-telecom": "Nifty MidSml IT & Telecom",
  fmcg: "Nifty FMCG",
  "consumer-durables": "Nifty Consumer Durables",
  pharma: "Nifty Pharma",
  healthcare: "Nifty Healthcare",
  "nifty500-healthcare": "Nifty500 Health",
  "midsmall-healthcare": "Nifty MidSml Hlth",
  media: "Nifty Media",
  metal: "Nifty Metal",
  cement: "Nifty Cement",
  chemicals: "Nifty Chemicals",
  energy: "Nifty Energy",
  "oil-gas": "Nifty Oil & Gas",
  realty: "Nifty Realty",
  reits: "Nifty REITs & Realty",
  housing: "Nifty Housing",
  infra: "Nifty Infrastructure",
  construction: "Nifty Infrastructure",
  "india-infra-logistics": "Nifty India Infra & Logistics",
  logistics: "Nifty Transportation & Logistics",
  "commercial-transport": "Nifty Transportation & Logistics",
  mobility: "Nifty Mobility",
  ev: "Nifty EV & New Age Auto",
  manufacturing: "Nifty India Manufacturing",
  defence: "Nifty India Defence",
  "railways-psu": "Nifty RailwaysPSU",
  tourism: "Nifty Ind Tourism",
  services: "Nifty Serv Sector",
  internet: "Nifty India Internet",
  digital: "Nifty India Digital",
  "capital-markets": "Nifty Capital Markets",
  mnc: "Nifty MNC",
  pse: "Nifty PSE",
  cpse: "Nifty CPSE",
  rural: "Nifty Rural",
  consumption: "Nifty India Consumption",
  "midsmall-consumption": "Nifty MidSml Consumption",
  "noncyc-consumer": "Nifty Non-Cyclical Consumer",
  "india-new-age-consumption": "Nifty India New Age Consumption",
  commodities: "Nifty Commodities",
};

/** NSE `allIndices` indexSymbol for each sector row (official index returns). */
export const NSE_INDEX_SYMBOL_BY_SECTOR_ID: Partial<
  Record<(typeof NSE_ALL_SECTOR_IDS)[number], string>
> = {
  "nifty-50": "NIFTY 50",
  auto: "NIFTY AUTO",
  bank: "NIFTY BANK",
  "psu-bank": "NIFTY PSU BANK",
  "private-bank": "NIFTY PVT BANK",
  financials: "NIFTY FIN SERVICE",
  "fin-services-25-50": "NIFTY FINSRV25 50",
  "fin-ex-bank": "NIFTY FINSEREXBNK",
  "midsmall-financial": "NIFTY MS FIN SERV",
  it: "NIFTY IT",
  "midsmall-it-telecom": "NIFTY MS IT TELCM",
  fmcg: "NIFTY FMCG",
  "consumer-durables": "NIFTY CONSR DURBL",
  pharma: "NIFTY PHARMA",
  healthcare: "NIFTY HEALTHCARE",
  "nifty500-healthcare": "NIFTY500 HEALTH",
  "midsmall-healthcare": "NIFTY MIDSML HLTH",
  media: "NIFTY MEDIA",
  metal: "NIFTY METAL",
  cement: "NIFTY CEMENT",
  chemicals: "NIFTY CHEMICALS",
  energy: "NIFTY ENERGY",
  "oil-gas": "NIFTY OIL AND GAS",
  realty: "NIFTY REALTY",
  reits: "NIFTY REITS REALTY",
  housing: "NIFTY HOUSING",
  infra: "NIFTY INFRA",
  construction: "NIFTY INFRA",
  "india-infra-logistics": "NIFTY INFRALOG",
  logistics: "NIFTY TRANS LOGIS",
  "commercial-transport": "NIFTY TRANS LOGIS",
  mobility: "NIFTY MOBILITY",
  ev: "NIFTY EV",
  manufacturing: "NIFTY INDIA MFG",
  defence: "NIFTY IND DEFENCE",
  digital: "NIFTY IND DIGITAL",
  internet: "NIFTY INTERNET",
  "capital-markets": "NIFTY CAPITAL MKT",
  mnc: "NIFTY MNC",
  pse: "NIFTY PSE",
  cpse: "NIFTY CPSE",
  rural: "NIFTY RURAL",
  services: "NIFTY SERV SECTOR",
  tourism: "NIFTY IND TOURISM",
  "railways-psu": "NIFTY RAILWAYSPSU",
  consumption: "NIFTY CONSUMPTION",
  "midsmall-consumption": "NIFTY MS IND CONS",
  "noncyc-consumer": "NIFTY NONCYC CONS",
  "india-new-age-consumption": "NIFTY NEW CONSUMP",
  commodities: "NIFTY COMMODITIES",
};

const NSE_SECTOR_ID_SET = new Set<string>(NSE_ALL_SECTOR_IDS);

export function isNseAllSectorId(sectorId: string): boolean {
  return NSE_SECTOR_ID_SET.has(sectorId);
}

export function getNseSectorLabel(sectorId: string): string | null {
  return NSE_SECTOR_LABELS[sectorId] ?? null;
}

export function getNseSectorCatalog(): IndianSector[] {
  return NSE_ALL_SECTOR_IDS.flatMap((sectorId) => {
    const sector = getIndianSector(sectorId);
    return sector ? [sector] : [];
  });
}

export function hasNseIndexSymbol(sectorId: string): boolean {
  if (!isNseAllSectorId(sectorId)) return false;
  return Boolean(
    NSE_INDEX_SYMBOL_BY_SECTOR_ID[sectorId as (typeof NSE_ALL_SECTOR_IDS)[number]]
  );
}

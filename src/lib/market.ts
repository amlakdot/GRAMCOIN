export type PriceQuote = {
  usd: number;
  change24h: number | null;
  source: string;
  fetchedAt: number;
  stale: boolean;
  cached: boolean;
};

export type ChartPoint = { t: number; p: number };

type CacheBox<T> = { at: number; data: T };

let priceCache: CacheBox<PriceQuote> | null = null;
const chartCache: Record<string, CacheBox<ChartPoint[]>> = {};

const PRICE_TTL_MS = 45_000;
const CHART_TTL_MS = 5 * 60_000;

async function fetchJson(url: string, timeoutMs = 7000): Promise<unknown> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: { accept: "application/json" },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

async function fromBinance(): Promise<PriceQuote> {
  const json = (await fetchJson(
    "https://api.binance.com/api/v3/ticker/24hr?symbol=TONUSDT",
  )) as { lastPrice?: string; priceChangePercent?: string };
  const usd = Number(json.lastPrice);
  if (!usd) throw new Error("binance empty");
  return {
    usd,
    change24h: json.priceChangePercent ? Number(json.priceChangePercent) : null,
    source: "Binance",
    fetchedAt: Date.now(),
    stale: false,
    cached: false,
  };
}

async function fromCoinGecko(): Promise<PriceQuote> {
  const json = (await fetchJson(
    "https://api.coingecko.com/api/v3/simple/price?ids=the-open-network&vs_currencies=usd&include_24hr_change=true",
  )) as { "the-open-network"?: { usd?: number; usd_24h_change?: number } };
  const row = json["the-open-network"];
  if (!row?.usd) throw new Error("coingecko empty");
  return {
    usd: row.usd,
    change24h: row.usd_24h_change ?? null,
    source: "CoinGecko",
    fetchedAt: Date.now(),
    stale: false,
    cached: false,
  };
}

async function resolvePrice(): Promise<PriceQuote> {
  const errors: string[] = [];
  for (const fn of [fromBinance, fromCoinGecko]) {
    try {
      return await fn();
    } catch (e) {
      errors.push(e instanceof Error ? e.message : "fail");
    }
  }
  throw new Error(errors.join(" | "));
}

export async function getGramPrice(): Promise<PriceQuote> {
  const now = Date.now();
  if (priceCache && now - priceCache.at < PRICE_TTL_MS) {
    return { ...priceCache.data, cached: true };
  }
  try {
    const quote = await resolvePrice();
    priceCache = { at: now, data: quote };
    return quote;
  } catch {
    if (priceCache) {
      return { ...priceCache.data, stale: true, cached: true };
    }
    throw new Error("قیمت در دسترس نیست — همه منابع محدود یا قطع بودند");
  }
}

async function chartFromBinance(days: number): Promise<ChartPoint[]> {
  const interval = days <= 1 ? "15m" : days <= 7 ? "1h" : "4h";
  const limit = days <= 1 ? 96 : days <= 7 ? 168 : 180;
  const json = (await fetchJson(
    `https://api.binance.com/api/v3/klines?symbol=TONUSDT&interval=${interval}&limit=${limit}`,
    10000,
  )) as unknown[];
  if (!Array.isArray(json) || json.length === 0) throw new Error("no binance klines");
  return json.map((row) => {
    const r = row as [number, string, string, string, string];
    return { t: r[0], p: Number(r[4]) };
  });
}

async function chartFromGecko(days: number): Promise<ChartPoint[]> {
  const json = (await fetchJson(
    `https://api.coingecko.com/api/v3/coins/the-open-network/market_chart?vs_currency=usd&days=${days}`,
    10000,
  )) as { prices?: [number, number][] };
  if (!json.prices?.length) throw new Error("no gecko chart");
  return json.prices.map(([t, p]) => ({ t, p }));
}

export async function getGramChart(days: 1 | 7 | 30): Promise<ChartPoint[]> {
  const key = String(days);
  const now = Date.now();
  const hit = chartCache[key];
  if (hit && now - hit.at < CHART_TTL_MS) return hit.data;
  try {
    const points = await chartFromBinance(days);
    chartCache[key] = { at: now, data: points };
    return points;
  } catch {
    try {
      const points = await chartFromGecko(days);
      chartCache[key] = { at: now, data: points };
      return points;
    } catch {
      if (hit) return hit.data;
      throw new Error("نمودار در دسترس نیست");
    }
  }
}

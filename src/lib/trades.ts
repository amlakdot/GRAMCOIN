export type TradeType = "buy" | "sell";

export type Trade = {
  id: number;
  type: TradeType;
  date: string;
  gram: number;
  usdt: number;
  networkFee: number;
  dexFeePct: number;
  price: number;
};

export type TraderState = {
  totalGram: number;
  avgBuyPrice: number;
  investedUsdt: number;
  currentValue: number;
  unrealizedPnl: number;
  totalFeesGram: number;
  realizedPnl: number;
};

export const DEFAULT_NETWORK_FEE = 0.0082;
export const DEFAULT_DEX_FEE_PCT = 0.07;
export const ROUND_TRIP_FEE_PCT = 0.2;

export const SEED_TRADES: Trade[] = [
  {
    id: 1,
    type: "sell",
    date: "2026-09-12T22:37",
    gram: 75.364750959,
    usdt: 103.57,
    networkFee: 0.007902632,
    dexFeePct: 0.07,
    price: 103.57 / 75.364750959,
  },
  {
    id: 2,
    type: "buy",
    date: "2026-09-30T01:20",
    gram: 70.403801601,
    usdt: 106.06,
    networkFee: 0.008243583,
    dexFeePct: 0.07,
    price: 106.06 / 70.403801601,
  },
];

export const STORAGE_KEY = "gram_trades_v2";

export function calcState(trades: Trade[], livePrice: number | null): TraderState {
  let totalFeesGram = 0;
  let realizedPnl = 0;
  const inventory: { gram: number; costPer: number }[] = [];

  for (const t of trades) {
    totalFeesGram += t.networkFee || 0;
    if (t.type === "buy") {
      const netGram = t.gram * (1 - (t.dexFeePct || DEFAULT_DEX_FEE_PCT) / 100);
      const costPer = netGram > 0 ? t.usdt / netGram : t.price;
      inventory.push({ gram: netGram, costPer });
    } else {
      let remaining = t.gram;
      let costBasis = 0;
      while (remaining > 1e-9 && inventory.length) {
        const lot = inventory[0];
        const take = Math.min(remaining, lot.gram);
        costBasis += take * lot.costPer;
        lot.gram -= take;
        remaining -= take;
        if (lot.gram < 1e-9) inventory.shift();
      }
      if (remaining > 0) {
        const totalG = inventory.reduce((s, l) => s + l.gram, 0);
        const totalC = inventory.reduce((s, l) => s + l.gram * l.costPer, 0);
        const avg = totalG > 0 ? totalC / totalG : t.price;
        costBasis += remaining * avg;
      }
      realizedPnl += t.usdt - costBasis;
    }
  }

  let remainingGram = 0;
  let remainingCost = 0;
  for (const lot of inventory) {
    remainingGram += lot.gram;
    remainingCost += lot.gram * lot.costPer;
  }

  const avgBuy = remainingGram > 0 ? remainingCost / remainingGram : 0;
  const currentValue = livePrice ? remainingGram * livePrice : 0;

  return {
    totalGram: remainingGram,
    avgBuyPrice: avgBuy,
    investedUsdt: remainingCost,
    currentValue,
    unrealizedPnl: currentValue - remainingCost,
    totalFeesGram,
    realizedPnl,
  };
}

export function loadTrades(): Trade[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY) ?? localStorage.getItem("gram_trades_v1");
    if (!raw) return SEED_TRADES;
    const parsed = JSON.parse(raw) as Trade[];
    return Array.isArray(parsed) ? parsed : SEED_TRADES;
  } catch {
    return SEED_TRADES;
  }
}

export function saveTrades(trades: Trade[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(trades));
}

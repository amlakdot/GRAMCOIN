import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Download, RefreshCw, Trash2, Upload, Hexagon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { PriceChart } from "@/components/price-chart";
import { TelegramPanel } from "@/components/telegram-panel";
import { AlertWatcher } from "@/components/alert-watcher";
import { getGramPrice } from "@/lib/market";
import {
  DEFAULT_DEX_FEE_PCT,
  DEFAULT_NETWORK_FEE,
  ROUND_TRIP_FEE_PCT,
  calcState,
  loadTrades,
  saveTrades,
  type Trade,
  type TradeType,
} from "@/lib/trades";
import { loadTelegram, saveTelegram, type TelegramSettings } from "@/lib/telegram-settings";
import { cn, fmt, formatFaDate } from "@/lib/utils";

export function Dashboard() {
  const [hydrated, setHydrated] = useState(false);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [telegram, setTelegram] = useState<TelegramSettings>(DEFAULT_TG);
  const [tradeType, setTradeType] = useState<TradeType>("buy");
  const [date, setDate] = useState("");
  const [gram, setGram] = useState("");
  const [usdt, setUsdt] = useState("");
  const [fee, setFee] = useState(String(DEFAULT_NETWORK_FEE));
  const [dex, setDex] = useState(String(DEFAULT_DEX_FEE_PCT));
  const [simPrice, setSimPrice] = useState("");
  const [sim, setSim] = useState<{ usdt: number; profit: number; pct: number } | null>(null);
  const [confirm, setConfirm] = useState<null | { title: string; text: string; run: () => void }>(
    null,
  );

  const priceQ = useQuery({
    queryKey: ["gram-price"],
    queryFn: () => getGramPrice(),
    refetchInterval: 45_000,
    staleTime: 40_000,
    retry: 1,
  });

  const livePrice = priceQ.data?.usd ?? null;
  const state = useMemo(() => calcState(trades, livePrice), [trades, livePrice]);

  useEffect(() => {
    setTrades(loadTrades());
    setTelegram(loadTelegram());
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    setDate(now.toISOString().slice(0, 16));
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated) saveTrades(trades);
  }, [trades, hydrated]);

  useEffect(() => {
    if (hydrated) saveTelegram(telegram);
  }, [telegram, hydrated]);

  function addTrade() {
    const g = Number(gram);
    const u = Number(usdt);
    if (!date || !g || !u || g <= 0 || u <= 0) {
      toast.error("همه فیلدهای اصلی را پر کن");
      return;
    }
    setTrades((prev) => [
      ...prev,
      {
        id: Date.now(),
        type: tradeType,
        date,
        gram: g,
        usdt: u,
        networkFee: Number(fee) || DEFAULT_NETWORK_FEE,
        dexFeePct: Number(dex) || DEFAULT_DEX_FEE_PCT,
        price: u / g,
      },
    ]);
    setGram("");
    setUsdt("");
    toast.success("معامله ذخیره شد");
  }

  function exportData() {
    const blob = new Blob([JSON.stringify(trades, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `gram-trades-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("فایل خروجی آماده شد");
  }

  function importData(file: File) {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(String(reader.result));
        if (!Array.isArray(data)) throw new Error("bad");
        setTrades(data);
        toast.success("داده‌ها وارد شدند");
      } catch {
        toast.error("فرمت فایل نامعتبر است");
      }
    };
    reader.readAsText(file);
  }

  function runSim(price: number) {
    if (state.totalGram <= 0) {
      toast.error("موجودی GRAM نداری");
      return;
    }
    if (!price || price <= 0) {
      toast.error("قیمت معتبر وارد کن");
      return;
    }
    const usdtNet = state.totalGram * price * (1 - DEFAULT_DEX_FEE_PCT / 100);
    const profit = usdtNet - state.investedUsdt;
    const pct = state.investedUsdt > 0 ? (profit / state.investedUsdt) * 100 : 0;
    setSim({ usdt: usdtNet, profit, pct });
    setSimPrice(price.toFixed(4));
  }

  const change = priceQ.data?.change24h;
  const pnlPct =
    state.investedUsdt > 0 ? (state.unrealizedPnl / state.investedUsdt) * 100 : 0;

  const targets = [1, 2, 3, 5, 7, 10, 15, 20];

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 pb-16">
      <AlertWatcher settings={telegram} price={livePrice} state={state} />

      <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="grid size-11 place-items-center rounded-xl bg-primary text-primary-fg shadow-[0_8px_24px_rgba(20,184,166,0.28)]">
            <Hexagon className="size-5" />
          </div>
          <div>
            <h1 className="text-lg font-extrabold tracking-tight">GRAM Trader</h1>
            <p className="text-xs text-muted">نوسان‌گیری GRAM به USDT با کارمزد واقعی</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="secondary" onClick={() => priceQ.refetch()}>
            <RefreshCw className={cn("size-4", priceQ.isFetching && "animate-spin")} />
            قیمت
          </Button>
          <Button size="sm" variant="secondary" onClick={exportData}>
            <Download className="size-4" />
            خروجی
          </Button>
          <Button size="sm" variant="secondary" asChild>
            <label className="cursor-pointer">
              <Upload className="size-4" />
              ورود
              <input
                type="file"
                accept=".json"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) importData(f);
                  e.target.value = "";
                }}
              />
            </label>
          </Button>
        </div>
      </header>

      <Card className="mb-4">
        <p className="text-xs font-medium text-muted">قیمت لحظه‌ای GRAM</p>
        <div className="mt-1 flex flex-wrap items-end gap-3">
          <p className="text-3xl font-extrabold tabular-nums tracking-tight">
            {livePrice != null ? fmt(livePrice, 4) : priceQ.isError ? "—" : "…"}
          </p>
          {change != null ? (
            <span
              className={cn(
                "rounded-full px-2.5 py-1 text-xs font-semibold tabular-nums",
                change >= 0 ? "bg-profit/15 text-profit" : "bg-loss/15 text-loss",
              )}
            >
              {change >= 0 ? "▲" : "▼"} {Math.abs(change).toFixed(2)}٪
            </span>
          ) : null}
        </div>
        <p className="mt-2 text-xs text-muted">
          {priceQ.isError
            ? "اتصال لحظه‌ای قطع است؛ از کش یا منبع جایگزین استفاده می‌شود"
            : priceQ.data
              ? `${priceQ.data.source}${priceQ.data.cached ? " · کش ۴۵ ثانیه‌ای" : ""}${priceQ.data.stale ? " · داده قدیمی" : ""}`
              : "در حال دریافت قیمت…"}
        </p>
      </Card>

      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="موجودی GRAM" value={fmt(state.totalGram, 4)} />
        <Stat
          label="میانگین خرید"
          value={state.avgBuyPrice ? fmt(state.avgBuyPrice, 4) : "—"}
          hint="USDT / GRAM"
        />
        <Stat label="سرمایه فعلی" value={fmt(state.investedUsdt, 2)} hint="USDT" />
        <Stat
          label="ارزش لحظه‌ای"
          value={livePrice ? fmt(state.currentValue, 2) : "—"}
          hint={
            livePrice && state.totalGram > 0
              ? `${state.unrealizedPnl >= 0 ? "+" : ""}${fmt(state.unrealizedPnl, 2)} USDT`
              : undefined
          }
          hintClass={state.unrealizedPnl >= 0 ? "text-profit" : "text-loss"}
        />
      </div>

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Stat
          label="سود تحقق‌یافته"
          value={`${state.realizedPnl >= 0 ? "+" : ""}${fmt(state.realizedPnl, 2)}`}
          valueClass={state.realizedPnl >= 0 ? "text-profit" : "text-loss"}
        />
        <Stat label="کارمزد شبکه" value={fmt(state.totalFeesGram, 5)} hint="GRAM" />
        <Stat
          label="وضعیت پوزیشن"
          value={
            state.totalGram <= 0
              ? "بدون پوزیشن"
              : livePrice
                ? `${pnlPct >= 0 ? "در سود " : "در زیان "}${Math.abs(pnlPct).toFixed(2)}٪`
                : "در انتظار قیمت"
          }
          valueClass={
            state.totalGram > 0 && livePrice
              ? pnlPct >= 0
                ? "text-profit"
                : "text-loss"
              : undefined
          }
        />
      </div>

      <div className="mb-6">
        <PriceChart avgBuy={state.avgBuyPrice} />
      </div>

      <div className="mb-6">
        <TelegramPanel settings={telegram} onChange={setTelegram} />
      </div>

      <section className="mb-6">
        <h2 className="mb-3 text-base font-bold">ثبت معامله</h2>
        <Card>
          <div className="mb-4 grid grid-cols-2 gap-2 rounded-lg bg-surface-2 p-1 ring-1 ring-border">
            <button
              type="button"
              className={cn(
                "h-10 rounded-md text-sm font-semibold",
                tradeType === "buy" ? "bg-profit/15 text-profit" : "text-muted",
              )}
              onClick={() => setTradeType("buy")}
            >
              خرید GRAM
            </button>
            <button
              type="button"
              className={cn(
                "h-10 rounded-md text-sm font-semibold",
                tradeType === "sell" ? "bg-loss/15 text-loss" : "text-muted",
              )}
              onClick={() => setTradeType("sell")}
            >
              فروش GRAM
            </button>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label>تاریخ و ساعت</Label>
              <Input type="datetime-local" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div>
              <Label>
                {tradeType === "buy" ? "مقدار GRAM دریافتی" : "مقدار GRAM فروخته‌شده"}
              </Label>
              <Input
                inputMode="decimal"
                value={gram}
                onChange={(e) => setGram(e.target.value)}
                placeholder="70.40"
              />
            </div>
            <div>
              <Label>
                {tradeType === "buy" ? "مقدار USDT پرداختی" : "مقدار USDT دریافتی"}
              </Label>
              <Input
                inputMode="decimal"
                value={usdt}
                onChange={(e) => setUsdt(e.target.value)}
                placeholder="106.06"
              />
            </div>
            <div>
              <Label>کارمزد شبکه (GRAM)</Label>
              <Input inputMode="decimal" value={fee} onChange={(e) => setFee(e.target.value)} />
            </div>
            <div>
              <Label>کارمزد DEX ٪</Label>
              <Input inputMode="decimal" value={dex} onChange={(e) => setDex(e.target.value)} />
            </div>
          </div>
          <Button className="mt-4 w-full" onClick={addTrade}>
            ذخیره معامله
          </Button>
        </Card>
      </section>

      <section className="mb-6">
        <h2 className="mb-3 text-base font-bold">اهداف فروش</h2>
        <Card className="space-y-2 p-3 sm:p-5">
          {state.totalGram <= 0 || !state.avgBuyPrice ? (
            <p className="py-8 text-center text-sm text-muted">برای دیدن اهداف، ابتدا GRAM بخر</p>
          ) : (
            targets.map((pct) => {
              const needed =
                (state.avgBuyPrice * (1 + pct / 100)) / (1 - ROUND_TRIP_FEE_PCT / 100);
              const usdtOut = state.totalGram * needed * (1 - DEFAULT_DEX_FEE_PCT / 100);
              const net = usdtOut - state.investedUsdt;
              return (
                <button
                  key={pct}
                  type="button"
                  onClick={() => runSim(needed)}
                  className="grid w-full grid-cols-[4.5rem_1fr_auto] items-center gap-3 rounded-xl bg-surface-2 px-3 py-3 text-right ring-1 ring-border hover:ring-primary/40"
                >
                  <span className="font-bold text-profit">+{pct}٪</span>
                  <span>
                    <span className="block font-semibold tabular-nums">
                      {fmt(needed, 4)} USDT
                    </span>
                    <span className="text-xs text-muted">≈ {fmt(usdtOut, 2)} دریافتی</span>
                  </span>
                  <span className="font-bold tabular-nums text-profit">+{fmt(net, 2)}</span>
                </button>
              );
            })
          )}
        </Card>
      </section>

      <section className="mb-6">
        <h2 className="mb-3 text-base font-bold">شبیه‌ساز فروش</h2>
        <Card>
          <div className="flex flex-wrap items-end gap-3">
            <div className="min-w-40 flex-1">
              <Label>قیمت فروش فرضی</Label>
              <Input
                inputMode="decimal"
                value={simPrice}
                onChange={(e) => setSimPrice(e.target.value)}
                placeholder="1.55"
              />
            </div>
            <Button onClick={() => runSim(Number(simPrice))}>محاسبه</Button>
          </div>
          {sim ? (
            <div className="mt-4 grid grid-cols-3 gap-3 text-center">
              <div>
                <p className="text-lg font-extrabold tabular-nums">{fmt(sim.usdt, 2)}</p>
                <p className="text-xs text-muted">USDT خالص</p>
              </div>
              <div>
                <p
                  className={cn(
                    "text-lg font-extrabold tabular-nums",
                    sim.profit >= 0 ? "text-profit" : "text-loss",
                  )}
                >
                  {sim.profit >= 0 ? "+" : ""}
                  {fmt(sim.profit, 2)}
                </p>
                <p className="text-xs text-muted">سود/زیان</p>
              </div>
              <div>
                <p
                  className={cn(
                    "text-lg font-extrabold tabular-nums",
                    sim.pct >= 0 ? "text-profit" : "text-loss",
                  )}
                >
                  {sim.pct >= 0 ? "+" : ""}
                  {sim.pct.toFixed(2)}٪
                </p>
                <p className="text-xs text-muted">درصد</p>
              </div>
            </div>
          ) : null}
        </Card>
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-bold">تاریخچه</h2>
          <Button
            size="sm"
            variant="danger"
            onClick={() =>
              setConfirm({
                title: "پاک‌سازی کامل",
                text: "تمام معاملات حذف می‌شود.",
                run: () => {
                  setTrades([]);
                  toast.success("تاریخچه پاک شد");
                },
              })
            }
          >
            <Trash2 className="size-4" />
            پاک‌سازی
          </Button>
        </div>
        <Card className="space-y-2 p-3">
          {trades.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted">هنوز معامله‌ای نیست</p>
          ) : (
            [...trades].reverse().map((t) => (
              <div
                key={t.id}
                className="grid grid-cols-[auto_1fr_auto] items-center gap-3 rounded-xl bg-surface-2 px-3 py-3 ring-1 ring-border"
              >
                <span
                  className={cn(
                    "grid size-11 place-items-center rounded-lg text-xs font-bold",
                    t.type === "buy" ? "bg-profit/15 text-profit" : "bg-loss/15 text-loss",
                  )}
                >
                  {t.type === "buy" ? "خرید" : "فروش"}
                </span>
                <div>
                  <p className="text-sm font-semibold tabular-nums">
                    {fmt(t.gram, 4)} GRAM · {fmt(t.usdt, 2)} USDT
                  </p>
                  <p className="text-xs text-muted">
                    {formatFaDate(t.date)} · کارمزد {fmt(t.networkFee, 5)}
                  </p>
                </div>
                <div className="text-left">
                  <p className="text-sm font-semibold tabular-nums">{fmt(t.price, 4)}</p>
                  <button
                    type="button"
                    className="text-xs text-loss"
                    onClick={() =>
                      setConfirm({
                        title: "حذف معامله",
                        text: "این معامله حذف شود؟",
                        run: () => setTrades((prev) => prev.filter((x) => x.id !== t.id)),
                      })
                    }
                  >
                    حذف
                  </button>
                </div>
              </div>
            ))
          )}
        </Card>
      </section>

      <p className="mt-8 text-center text-xs text-muted">
        قیمت از Binance / CoinGecko با کش ۴۵ ثانیه · کارمزد DEX حدود ۰.۰۷٪
      </p>

      <Dialog open={!!confirm} onOpenChange={(o) => !o && setConfirm(null)}>
        <DialogContent>
          <DialogTitle>{confirm?.title}</DialogTitle>
          <DialogDescription>{confirm?.text}</DialogDescription>
          <div className="mt-5 flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setConfirm(null)}>
              انصراف
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                confirm?.run();
                setConfirm(null);
              }}
            >
              تأیید
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

const DEFAULT_TG: TelegramSettings = {
  token: "",
  chatId: "",
  enabled: false,
  alertAbove: "",
  alertBelow: "",
  alertTargetPct: "5",
};

function Stat({
  label,
  value,
  hint,
  hintClass,
  valueClass,
}: {
  label: string;
  value: string;
  hint?: string;
  hintClass?: string;
  valueClass?: string;
}) {
  return (
    <Card className="p-4">
      <p className="text-xs text-muted">{label}</p>
      <p className={cn("mt-1 text-lg font-bold tabular-nums tracking-tight", valueClass)}>
        {value}
      </p>
      {hint ? <p className={cn("mt-0.5 text-xs text-muted", hintClass)}>{hint}</p> : null}
    </Card>
  );
}

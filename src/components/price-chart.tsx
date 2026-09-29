import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { getGramChart } from "@/lib/market";
import { fmt, cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

type Days = 1 | 7 | 30;

export function PriceChart({ avgBuy }: { avgBuy: number }) {
  const [days, setDays] = useState<Days>(7);
  const q = useQuery({
    queryKey: ["gram-chart", days],
    queryFn: () => getGramChart(days),
    staleTime: 4 * 60_000,
    retry: 1,
  });

  const data = (q.data ?? []).map((p) => ({
    t: p.t,
    p: p.p,
    label: new Date(p.t).toLocaleString("fa-IR", {
      month: "2-digit",
      day: "2-digit",
      hour: days === 1 ? "2-digit" : undefined,
      minute: days === 1 ? "2-digit" : undefined,
    }),
  }));

  return (
    <Card>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold">نمودار قیمت GRAM</h2>
          <p className="text-xs text-muted">خط چین = میانگین قیمت خرید تو</p>
        </div>
        <div className="flex gap-1 rounded-lg bg-surface-2 p-1 ring-1 ring-border">
          {([1, 7, 30] as const).map((d) => (
            <Button
              key={d}
              size="sm"
              variant={days === d ? "default" : "ghost"}
              className={cn("h-8 px-3", days !== d && "text-muted")}
              onClick={() => setDays(d)}
            >
              {d === 1 ? "۲۴ ساعت" : d === 7 ? "۷ روز" : "۳۰ روز"}
            </Button>
          ))}
        </div>
      </div>
      <div className="h-56 w-full" dir="ltr">
        {q.isLoading ? (
          <div className="flex h-full items-center justify-center text-sm text-muted">
            در حال بارگذاری نمودار…
          </div>
        ) : q.isError ? (
          <div className="flex h-full items-center justify-center text-sm text-loss">
            نمودار در دسترس نیست — محدودیت API
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="gramFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--color-primary)" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="var(--color-primary)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
              <XAxis dataKey="label" tick={{ fill: "#6b7a8d", fontSize: 11 }} minTickGap={28} />
              <YAxis
                domain={["auto", "auto"]}
                tick={{ fill: "#6b7a8d", fontSize: 11 }}
                width={48}
                tickFormatter={(v: number) => v.toFixed(2)}
              />
              <Tooltip
                contentStyle={{
                  background: "#161c26",
                  border: "1px solid #243041",
                  borderRadius: 10,
                  fontSize: 12,
                }}
                formatter={(value) => [`${fmt(Number(value), 4)} USDT`, "قیمت"]}
              />
              {avgBuy > 0 ? (
                <ReferenceLine
                  y={avgBuy}
                  stroke="#f59e0b"
                  strokeDasharray="4 4"
                  label={{ value: "میانگین خرید", fill: "#f59e0b", fontSize: 11 }}
                />
              ) : null}
              <Area
                type="monotone"
                dataKey="p"
                stroke="var(--color-primary)"
                fill="url(#gramFill)"
                strokeWidth={2}
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </Card>
  );
}

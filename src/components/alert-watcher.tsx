import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { sendTelegram } from "@/lib/telegram";
import {
  loadAlertMem,
  saveAlertMem,
  type AlertKind,
  type TelegramSettings,
} from "@/lib/telegram-settings";
import { fmt } from "@/lib/utils";
import type { TraderState } from "@/lib/trades";

const COOLDOWN_MS = 20 * 60_000;

export function AlertWatcher({
  settings,
  price,
  state,
}: {
  settings: TelegramSettings;
  price: number | null;
  state: TraderState;
}) {
  const inflight = useRef(false);

  useEffect(() => {
    if (!settings.enabled || !price || !settings.token || !settings.chatId) return;
    if (inflight.current) return;

    const above = Number(settings.alertAbove);
    const below = Number(settings.alertBelow);
    const targetPct = Number(settings.alertTargetPct);
    const mem = loadAlertMem();
    const now = Date.now();

    function recently(kind: AlertKind) {
      return mem?.kind === kind && now - mem.at < COOLDOWN_MS;
    }

    let kind: AlertKind | null = null;
    let text = "";

    if (Number.isFinite(above) && above > 0 && price >= above && !recently("above")) {
      kind = "above";
      text = `GRAM به ${fmt(price, 4)} رسید (سقف ${fmt(above, 4)})`;
    } else if (Number.isFinite(below) && below > 0 && price <= below && !recently("below")) {
      kind = "below";
      text = `GRAM به ${fmt(price, 4)} رسید (کف ${fmt(below, 4)})`;
    } else if (
      Number.isFinite(targetPct) &&
      targetPct > 0 &&
      state.investedUsdt > 0 &&
      (state.unrealizedPnl / state.investedUsdt) * 100 >= targetPct &&
      !recently("target")
    ) {
      kind = "target";
      const pct = (state.unrealizedPnl / state.investedUsdt) * 100;
      text = `هدف سود ${targetPct}٪ رسید. سود فعلی ${pct.toFixed(2)}٪ · قیمت ${fmt(price, 4)}`;
    }

    if (!kind) return;

    inflight.current = true;
    saveAlertMem({ kind, at: now });
    sendTelegram({
      token: settings.token.trim(),
      chatId: settings.chatId.trim(),
      text,
    })
      .then(() => toast.success("هشدار تلگرام ارسال شد"))
      .catch((e) => toast.error(e instanceof Error ? e.message : "هشدار ارسال نشد"))
      .finally(() => {
        inflight.current = false;
      });
  }, [settings, price, state]);

  return null;
}

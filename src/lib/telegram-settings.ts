export type TelegramSettings = {
  token: string;
  chatId: string;
  enabled: boolean;
  alertAbove: string;
  alertBelow: string;
  alertTargetPct: string;
};

export const TELEGRAM_KEY = "gram_telegram_v1";

export const DEFAULT_TELEGRAM: TelegramSettings = {
  token: "",
  chatId: "",
  enabled: false,
  alertAbove: "",
  alertBelow: "",
  alertTargetPct: "5",
};

export function loadTelegram(): TelegramSettings {
  try {
    const raw = localStorage.getItem(TELEGRAM_KEY);
    if (!raw) return DEFAULT_TELEGRAM;
    return { ...DEFAULT_TELEGRAM, ...(JSON.parse(raw) as TelegramSettings) };
  } catch {
    return DEFAULT_TELEGRAM;
  }
}

export function saveTelegram(s: TelegramSettings) {
  localStorage.setItem(TELEGRAM_KEY, JSON.stringify(s));
}

export type AlertKind = "above" | "below" | "target";

export type AlertMemory = {
  kind: AlertKind;
  at: number;
};

export const ALERT_MEM_KEY = "gram_alert_mem_v1";

export function loadAlertMem(): AlertMemory | null {
  try {
    const raw = localStorage.getItem(ALERT_MEM_KEY);
    return raw ? (JSON.parse(raw) as AlertMemory) : null;
  } catch {
    return null;
  }
}

export function saveAlertMem(m: AlertMemory) {
  localStorage.setItem(ALERT_MEM_KEY, JSON.stringify(m));
}

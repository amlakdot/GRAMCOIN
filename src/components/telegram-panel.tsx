import { useState } from "react";
import { Bell, Send, Search } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { discoverTelegramChat, sendTelegram } from "@/lib/telegram";
import type { TelegramSettings } from "@/lib/telegram-settings";

export function TelegramPanel({
  settings,
  onChange,
}: {
  settings: TelegramSettings;
  onChange: (s: TelegramSettings) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [chats, setChats] = useState<Array<{ id: string; label: string }>>([]);

  function patch(p: Partial<TelegramSettings>) {
    onChange({ ...settings, ...p });
  }

  async function testSend() {
    if (!settings.token || !settings.chatId) {
      toast.error("توکن ربات و Chat ID را وارد کن");
      return;
    }
    setBusy(true);
    try {
      await sendTelegram({
        token: settings.token.trim(),
        chatId: settings.chatId.trim(),
        text: "GRAM Trader متصل شد. هشدار قیمت از این به بعد اینجا می‌آید.",
      });
      toast.success("پیام تست ارسال شد");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "ارسال ناموفق");
    } finally {
      setBusy(false);
    }
  }

  async function findChat() {
    if (!settings.token) {
      toast.error("اول توکن ربات را بگذار");
      return;
    }
    setBusy(true);
    try {
      const found = await discoverTelegramChat(settings.token.trim());
      setChats(found);
      if (!found.length) {
        toast.error("هیچ پیامی پیدا نشد. اول به ربات /start بزن، بعد دوباره امتحان کن");
      } else {
        toast.success(`${found.length} چت پیدا شد`);
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "توکن نامعتبر");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-base font-bold">
            <Bell className="size-4 text-primary" />
            هشدار تلگرام
          </h2>
          <p className="mt-1 text-xs text-pretty text-muted">
            یک ربات از BotFather بساز، توکن را اینجا بگذار، بعد به ربات پیام بده تا Chat ID پیدا
            شود. (در حالت dev با پروکسی Vite کار می‌کند)
          </p>
        </div>
        <div className="flex items-center gap-2 pt-1">
          <span className="text-xs text-muted">فعال</span>
          <Switch
            checked={settings.enabled}
            onCheckedChange={(v) => patch({ enabled: v })}
            aria-label="فعال‌سازی هشدار"
          />
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <Label htmlFor="tg-token">توکن ربات</Label>
          <Input
            id="tg-token"
            type="password"
            autoComplete="off"
            value={settings.token}
            onChange={(e) => patch({ token: e.target.value })}
            placeholder="123456:ABC..."
          />
        </div>
        <div>
          <Label htmlFor="tg-chat">Chat ID</Label>
          <Input
            id="tg-chat"
            value={settings.chatId}
            onChange={(e) => patch({ chatId: e.target.value })}
            placeholder="مثلاً 123456789"
          />
        </div>
        <div>
          <Label htmlFor="tg-above">هشدار اگر قیمت بالاتر از</Label>
          <Input
            id="tg-above"
            inputMode="decimal"
            value={settings.alertAbove}
            onChange={(e) => patch({ alertAbove: e.target.value })}
            placeholder="مثلاً 1.60"
          />
        </div>
        <div>
          <Label htmlFor="tg-below">هشدار اگر قیمت پایین‌تر از</Label>
          <Input
            id="tg-below"
            inputMode="decimal"
            value={settings.alertBelow}
            onChange={(e) => patch({ alertBelow: e.target.value })}
            placeholder="مثلاً 1.40"
          />
        </div>
        <div>
          <Label htmlFor="tg-pct">هشدار سود هدف (٪)</Label>
          <Input
            id="tg-pct"
            inputMode="decimal"
            value={settings.alertTargetPct}
            onChange={(e) => patch({ alertTargetPct: e.target.value })}
            placeholder="5"
          />
        </div>
      </div>

      {chats.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {chats.map((c) => (
            <Button
              key={c.id}
              size="sm"
              variant={settings.chatId === c.id ? "default" : "secondary"}
              onClick={() => patch({ chatId: c.id })}
            >
              {c.label} · {c.id}
            </Button>
          ))}
        </div>
      ) : null}

      <div className="mt-4 flex flex-wrap gap-2">
        <Button variant="secondary" onClick={findChat} disabled={busy}>
          <Search className="size-4" />
          پیدا کردن Chat ID
        </Button>
        <Button onClick={testSend} disabled={busy}>
          <Send className="size-4" />
          پیام تست
        </Button>
      </div>
    </Card>
  );
}

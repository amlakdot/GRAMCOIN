/**
 * در حالت dev از پروکسی Vite (/tg-api) استفاده می‌شود تا CORS دور زده شود.
 * در production (GitHub Pages) تلگرام مستقیم کار نمی‌کند مگر یک backend/proxy داشته باشی.
 */
function botBase(token: string) {
  const isDev = import.meta.env.DEV;
  return isDev
    ? `/tg-api/bot${token}`
    : `https://api.telegram.org/bot${token}`;
}

export async function sendTelegram(opts: {
  token: string;
  chatId: string;
  text: string;
}): Promise<{ ok: true }> {
  const res = await fetch(`${botBase(opts.token)}/sendMessage`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      chat_id: opts.chatId,
      text: opts.text,
      disable_web_page_preview: true,
    }),
  });
  const json = (await res.json()) as { ok?: boolean; description?: string };
  if (!json.ok) {
    throw new Error(json.description || "ارسال تلگرام ناموفق بود");
  }
  return { ok: true };
}

export async function discoverTelegramChat(
  token: string,
): Promise<Array<{ id: string; label: string }>> {
  const res = await fetch(`${botBase(token)}/getUpdates?limit=20`);
  const json = (await res.json()) as {
    ok?: boolean;
    description?: string;
    result?: Array<{
      message?: {
        chat?: {
          id?: number;
          title?: string;
          username?: string;
          first_name?: string;
        };
      };
    }>;
  };
  if (!json.ok) {
    throw new Error(json.description || "توکن ربات نامعتبر است");
  }
  const chats = new Map<string, string>();
  for (const item of json.result ?? []) {
    const chat = item.message?.chat;
    if (chat?.id == null) continue;
    const label = chat.title || chat.username || chat.first_name || String(chat.id);
    chats.set(String(chat.id), label);
  }
  return Array.from(chats.entries()).map(([id, label]) => ({ id, label }));
}

import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { Bell, CheckCheck } from "lucide-react";
import { useSignalR } from "@/hooks/useSignalR";
import { API_URL, getNotifications, markAllNotificationsRead, markNotificationRead } from "@/services/api";
import type { NotificationItem } from "@/types/notification";

export default function NotificationsBell() {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const panelRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    try {
      const result = await getNotifications();
      setNotifications(result.items);
      setUnreadCount(result.unreadCount);
      setError("");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Não foi possível carregar as notificações.");
    }
  }, []);

  const eventsRef = useRef<Record<string, (payload: unknown) => void>>({});
  eventsRef.current = { NotificationCreated: () => { void load(); } };
  useSignalR(`${API_URL.replace(/\/api$/, "")}/hubs/notificacoes`, eventsRef.current);

  useEffect(() => {
    void load();
    const interval = window.setInterval(() => void load(), 30_000);
    return () => window.clearInterval(interval);
  }, [load]);

  useEffect(() => {
    if (!open) return;
    const closeOnOutsideClick = (event: MouseEvent) => {
      if (!panelRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", closeOnOutsideClick);
    return () => document.removeEventListener("mousedown", closeOnOutsideClick);
  }, [open]);

  const openNotification = async (notification: NotificationItem) => {
    try {
      if (!notification.readAt) {
        await markNotificationRead(notification.id);
        setNotifications((current) =>
          current.map((item) => item.id === notification.id ? { ...item, readAt: new Date().toISOString() } : item),
        );
        setUnreadCount((count) => Math.max(0, count - 1));
      }
      setOpen(false);
      navigate(notification.href);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Não foi possível marcar a notificação como lida.");
    }
  };

  const markAllRead = async () => {
    try {
      await markAllNotificationsRead();
      const now = new Date().toISOString();
      setNotifications((current) => current.map((item) => ({ ...item, readAt: item.readAt ?? now })));
      setUnreadCount(0);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Não foi possível marcar as notificações como lidas.");
    }
  };

  return (
    <div className="relative" ref={panelRef}>
      <button
        type="button"
        aria-label={`Notificações${unreadCount ? `, ${unreadCount} não lidas` : ""}`}
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className="relative inline-flex h-10 w-10 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <Bell className="h-5 w-5" aria-hidden="true" />
        {unreadCount > 0 ? (
          <span className="absolute right-0.5 top-0.5 min-w-4 rounded-full bg-destructive px-1 text-center text-[10px] font-semibold leading-4 text-destructive-foreground">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        ) : null}
      </button>
      {open ? (
        <section
          aria-label="Central de notificações"
          className="absolute right-0 z-50 mt-2 max-h-[min(70vh,32rem)] w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-lg border bg-popover text-popover-foreground shadow-lg"
        >
          <header className="flex items-center justify-between border-b px-4 py-3">
            <h2 className="font-semibold">Notificações</h2>
            <button
              type="button"
              onClick={() => void markAllRead()}
              disabled={unreadCount === 0}
              className="inline-flex min-h-9 items-center gap-1 rounded px-2 text-xs text-primary hover:bg-accent disabled:opacity-50"
            >
              <CheckCheck className="h-4 w-4" aria-hidden="true" />
              Marcar lidas
            </button>
          </header>
          {error ? <p role="alert" className="px-4 py-3 text-sm text-destructive">{error}</p> : null}
          <div className="max-h-[calc(min(70vh,32rem)-3.5rem)] overflow-y-auto">
            {notifications.length === 0 && !error ? (
              <p className="px-4 py-8 text-center text-sm text-muted-foreground">Nenhuma notificação por enquanto.</p>
            ) : notifications.map((notification) => (
              <button
                type="button"
                key={notification.id}
                aria-label={`${notification.title}. ${notification.message}. ${notification.readAt ? "Lida" : "Não lida"}.`}
                onClick={() => void openNotification(notification)}
                className={`block w-full border-b px-4 py-3 text-left hover:bg-accent ${notification.readAt ? "" : "bg-primary/5"}`}
              >
                <span className="flex items-start gap-2">
                  <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${notification.readAt ? "bg-transparent" : "bg-primary"}`} />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium">{notification.title}</span>
                    <span className="mt-1 block text-sm text-muted-foreground">{notification.message}</span>
                    <time className="mt-1 block text-xs text-muted-foreground">
                      {new Date(notification.createdAt).toLocaleString("pt-BR")}
                    </time>
                  </span>
                </span>
              </button>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}

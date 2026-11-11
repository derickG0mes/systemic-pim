export interface NotificationItem {
  id: number;
  type: string;
  title: string;
  message: string;
  href: string;
  link?: string;
  createdAt: string;
  readAt: string | null;
}

export interface NotificationList {
  items: NotificationItem[];
  unreadCount: number;
}

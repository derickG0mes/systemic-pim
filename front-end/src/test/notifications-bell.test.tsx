import React from "react";
import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, useLocation } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import NotificationsBell from "@/components/NotificationsBell";

const api = vi.hoisted(() => ({
  getNotifications: vi.fn(),
  markNotificationRead: vi.fn(),
  markAllNotificationsRead: vi.fn(),
}));

vi.mock("@/services/api", () => ({
  API_URL: "http://localhost:8080/api",
  getNotifications: api.getNotifications,
  markNotificationRead: api.markNotificationRead,
  markAllNotificationsRead: api.markAllNotificationsRead,
}));

vi.mock("@/hooks/useSignalR", () => ({ useSignalR: vi.fn() }));

function CurrentPath() {
  const location = useLocation();
  return <output data-testid="path">{location.pathname}</output>;
}

describe("NotificationsBell", () => {
  beforeEach(() => {
    api.getNotifications.mockResolvedValue({
      items: [{
        id: 11,
        type: "pedido_novo",
        title: "Novo pedido para a cozinha",
        message: "Comanda #15 · Mesa 3.",
        href: "/orders",
        createdAt: "2026-11-08T19:00:00Z",
        readAt: null,
      }],
      unreadCount: 1,
    });
    api.markNotificationRead.mockResolvedValue(null);
    api.markAllNotificationsRead.mockResolvedValue(null);
  });

  it("shows unread notifications and marks an item read before navigating", async () => {
    render(
      <MemoryRouter>
        <NotificationsBell />
        <CurrentPath />
      </MemoryRouter>,
    );

    expect(await screen.findByRole("button", { name: "Notificações, 1 não lidas" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Notificações, 1 não lidas" }));
    fireEvent.click(await screen.findByRole("button", { name: /Novo pedido para a cozinha/ }));

    await waitFor(() => expect(api.markNotificationRead).toHaveBeenCalledWith(11));
    expect(screen.getByTestId("path")).toHaveTextContent("/orders");
  });
});

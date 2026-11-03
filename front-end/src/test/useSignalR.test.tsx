import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useSignalR } from "@/hooks/useSignalR";

const signalRMock = vi.hoisted(() => {
  const handlers: {
    events: Map<string, (payload: unknown) => void>;
    reconnecting?: () => void;
    reconnected?: () => void;
    close?: () => void;
  } = {
    events: new Map(),
  };
  const connection = {
    state: "Disconnected",
    start: vi.fn(),
    stop: vi.fn().mockResolvedValue(undefined),
    on: vi.fn((name: string, handler: (payload: unknown) => void) => {
      handlers.events.set(name, handler);
    }),
    onreconnecting: vi.fn((handler: () => void) => {
      handlers.reconnecting = handler;
    }),
    onreconnected: vi.fn((handler: () => void) => {
      handlers.reconnected = handler;
    }),
    onclose: vi.fn((handler: () => void) => {
      handlers.close = handler;
    }),
  };
  const builder = {
    withUrl: vi.fn(),
    configureLogging: vi.fn(),
    withAutomaticReconnect: vi.fn(),
    build: vi.fn(() => connection),
  };
  return { builder, connection, handlers };
});

vi.mock("@microsoft/signalr", () => ({
  HubConnectionBuilder: vi.fn(function () {
    return signalRMock.builder;
  }),
  LogLevel: { Warning: 3 },
}));

vi.mock("@/services/api", () => ({
  hasAuthSession: () => true,
}));

describe("useSignalR", () => {
  beforeEach(() => {
    signalRMock.connection.state = "Disconnected";
    signalRMock.connection.start.mockImplementation(async () => {
      signalRMock.connection.state = "Connected";
    });
    signalRMock.connection.stop.mockResolvedValue(undefined);
    signalRMock.handlers.events.clear();
    signalRMock.handlers.reconnecting = undefined;
    signalRMock.handlers.reconnected = undefined;
    signalRMock.handlers.close = undefined;
    signalRMock.builder.withUrl.mockReturnValue(signalRMock.builder);
    signalRMock.builder.configureLogging.mockReturnValue(signalRMock.builder);
    signalRMock.builder.withAutomaticReconnect.mockReturnValue(signalRMock.builder);
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("restabelece estado e recebe eventos após reconexão", async () => {
    const onPedidoNovo = vi.fn();
    const { result } = renderHook(() =>
      useSignalR("http://localhost/hubs/cozinha", {
        PedidoNovo: onPedidoNovo,
      }),
    );

    await waitFor(() => expect(result.current.connected).toBe(true));
    expect(signalRMock.builder.withAutomaticReconnect).toHaveBeenCalledWith([
      0,
      2000,
      10000,
      30000,
    ]);

    act(() => signalRMock.handlers.reconnecting?.());
    expect(result.current.connected).toBe(false);

    act(() => signalRMock.handlers.reconnected?.());
    expect(result.current.connected).toBe(true);

    const payload = { idComanda: 17, idMesa: 4 };
    act(() => signalRMock.handlers.events.get("PedidoNovo")?.(payload));
    expect(onPedidoNovo).toHaveBeenCalledWith(payload);
  });
});

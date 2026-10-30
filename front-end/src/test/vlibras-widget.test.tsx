import React from "react";
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/contexts/useAccessibility", () => ({
  useAccessibility: () => ({ vlibrasEnabled: true }),
}));

import VLibrasWidget from "@/components/VLibrasWidget";

afterEach(() => {
  cleanup();
  document.getElementById("vlibras-plugin-script")?.remove();
  document.querySelectorAll("div[vw]").forEach((element) => element.remove());
  delete window.__systemicVLibrasInitialized;
  delete window.VLibras;
});

describe("VLibrasWidget", () => {
  it("loads the script once and reports a load failure without crashing", async () => {
    const firstRender = render(<VLibrasWidget />);
    const script = document.getElementById("vlibras-plugin-script");

    expect(script).toBeInTheDocument();
    expect(document.querySelectorAll("#vlibras-plugin-script")).toHaveLength(1);

    script?.dispatchEvent(new Event("error"));
    expect(await screen.findByRole("status")).toHaveTextContent(
      "VLibras indisponível no momento.",
    );

    firstRender.unmount();
    render(<VLibrasWidget />);

    expect(document.querySelectorAll("#vlibras-plugin-script")).toHaveLength(1);
    expect(await screen.findByRole("status")).toHaveTextContent(
      "VLibras indisponível no momento.",
    );
  });
});

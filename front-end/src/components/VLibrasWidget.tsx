import { useEffect, useRef, useState } from "react";
import { useAccessibility } from "@/contexts/useAccessibility";

declare global {
  interface Window {
    VLibras?: {
      Widget: new (url: string) => object;
    };
    __systemicVLibrasInitialized?: boolean;
  }
}

const SCRIPT_ID = "vlibras-plugin-script";
const SCRIPT_SRC = "https://vlibras.gov.br/app/vlibras-plugin.js";
let scriptLoadPromise: Promise<void> | null = null;

function loadVLibrasScript(): Promise<void> {
  if (window.VLibras) return Promise.resolve();
  if (scriptLoadPromise) return scriptLoadPromise;

  const existingScript = document.getElementById(SCRIPT_ID) as HTMLScriptElement | null;
  const script = existingScript ?? document.createElement("script");

  scriptLoadPromise = new Promise((resolve, reject) => {
    script.addEventListener(
      "load",
      () => {
        script.dataset.loadState = "loaded";
        resolve();
      },
      { once: true },
    );
    script.addEventListener(
      "error",
      () => {
        script.dataset.loadState = "failed";
        reject(new Error("Não foi possível carregar o serviço VLibras."));
      },
      { once: true },
    );

    if (script.dataset.loadState === "loaded") {
      if (window.VLibras) resolve();
      else reject(new Error("O serviço VLibras não foi inicializado."));
    } else if (!existingScript) {
      script.id = SCRIPT_ID;
      script.src = SCRIPT_SRC;
      script.async = true;
      document.body.appendChild(script);
    }
  });

  return scriptLoadPromise;
}

export default function VLibrasWidget() {
  const { vlibrasEnabled } = useAccessibility();
  const initializedRef = useRef(false);
  const [unavailable, setUnavailable] = useState(false);

  useEffect(() => {
    if (!vlibrasEnabled) {
      document.querySelectorAll("div[vw]").forEach((el) => {
        (el as HTMLElement).style.display = "none";
      });
      return;
    } else {
      document.querySelectorAll("div[vw]").forEach((el) => {
        (el as HTMLElement).style.display = "";
      });
    }

    if (!document.querySelector("div[vw]")) {
      const wrapper = document.createElement("div");
      wrapper.setAttribute("vw", "");
      wrapper.className = "enabled";
      wrapper.innerHTML = `
        <div vw-access-button class="active"></div>
        <div vw-plugin-wrapper>
          <div class="vw-plugin-top-wrapper"></div>
        </div>
      `;
      document.body.appendChild(wrapper);
    }

    let active = true;
    setUnavailable(false);

    void loadVLibrasScript()
      .then(() => {
        if (!active || initializedRef.current || window.__systemicVLibrasInitialized) return;
        if (!window.VLibras) {
          throw new Error("O serviço VLibras não foi inicializado.");
        }

        try {
          // eslint-disable-next-line new-cap
          new window.VLibras.Widget("https://vlibras.gov.br/app");
          initializedRef.current = true;
          window.__systemicVLibrasInitialized = true;
        } catch (error) {
          console.error("[VLibras] Falha ao inicializar:", error);
          if (active) setUnavailable(true);
        }
      })
      .catch((error: unknown) => {
        console.error("[VLibras] Falha ao carregar o serviço:", error);
        if (active) setUnavailable(true);
      });

    return () => {
      active = false;
    };
  }, [vlibrasEnabled]);

  if (!vlibrasEnabled || !unavailable) return null;

  return (
    <p
      role="status"
      aria-live="polite"
      className="fixed bottom-3 right-3 z-[100] rounded-md border bg-background/95 px-3 py-2 text-xs text-muted-foreground shadow-sm"
    >
      VLibras indisponível no momento.
    </p>
  );
}

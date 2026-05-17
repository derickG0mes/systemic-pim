import { useEffect, useRef } from "react";
import { useAccessibility } from "@/contexts/AccessibilityContext";

declare global {
  interface Window {
    VLibras?: any;
  }
}

const SCRIPT_ID = "vlibras-plugin-script";
const SCRIPT_SRC = "https://vlibras.gov.br/app/vlibras-plugin.js";

export default function VLibrasWidget() {
  const { vlibrasEnabled } = useAccessibility();
  const initializedRef = useRef(false);

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

    const init = () => {
      try {
        if (window.VLibras && !initializedRef.current) {
          // eslint-disable-next-line new-cap
          new window.VLibras.Widget("https://vlibras.gov.br/app");
          initializedRef.current = true;
        }
      } catch (err) {
        console.error("[VLibras] Falha ao inicializar:", err);
      }
    };

    let script = document.getElementById(SCRIPT_ID) as HTMLScriptElement | null;
    if (!script) {
      script = document.createElement("script");
      script.id = SCRIPT_ID;
      script.src = SCRIPT_SRC;
      script.async = true;
      script.onload = init;
      document.body.appendChild(script);
    } else {
      init();
    }
  }, [vlibrasEnabled]);

  return null;
}

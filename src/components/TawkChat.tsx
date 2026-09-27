import { useEffect } from "react";

/**
 * Tawk.to live chat widget.
 * Client-only: injects the embed script after hydration so it can never block
 * initial render. Guards against double-injection (React strict mode, route
 * changes) via the script id check.
 */
export function TawkChat() {
  useEffect(() => {
    if (typeof window === "undefined") return;

    const w = window as typeof window & {
      Tawk_API?: Record<string, unknown> & { onLoad?: () => void };
      Tawk_LoadStart?: Date;
    };

    if (document.getElementById("tawk-to-embed-script")) return;

    w.Tawk_API = w.Tawk_API || {};
    w.Tawk_LoadStart = new Date();

    const s1 = document.createElement("script");
    s1.id = "tawk-to-embed-script";
    s1.async = true;
    s1.src = "https://embed.tawk.to/6ab88397f3b8723446c758eb/1k3gc427b";
    s1.charset = "UTF-8";
    s1.setAttribute("crossorigin", "*");

    const s0 = document.getElementsByTagName("script")[0];
    if (s0 && s0.parentNode) s0.parentNode.insertBefore(s1, s0);
    else document.head.appendChild(s1);
  }, []);

  return null;
}

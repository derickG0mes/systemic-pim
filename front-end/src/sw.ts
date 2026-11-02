import { clientsClaim, skipWaiting } from "workbox-core";
import { matchPrecache, precacheAndRoute } from "workbox-precaching";
import { registerRoute } from "workbox-routing";

declare global {
  interface Window {
    __WB_MANIFEST: Array<string | { url: string; revision?: string | null }>;
  }
}

skipWaiting();
clientsClaim();
precacheAndRoute(self.__WB_MANIFEST);

registerRoute(
  ({ request, url }) =>
    request.mode === "navigate" &&
    url.origin === self.location.origin &&
    url.pathname !== "/api" &&
    !url.pathname.startsWith("/api/"),
  async ({ request }) => {
    try {
      return await fetch(request);
    } catch {
      return (await matchPrecache("/offline.html")) ?? Response.error();
    }
  },
);

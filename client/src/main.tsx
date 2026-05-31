import { trpc } from "@/lib/trpc";
import { UNAUTHED_ERR_MSG } from '@shared/const';
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpBatchLink, TRPCClientError } from "@trpc/client";
import { createRoot } from "react-dom/client";
import superjson from "superjson";
import App from "./App";
import { getLoginUrl } from "./const";
import "./index.css";

const queryClient = new QueryClient();

const redirectToLoginIfUnauthorized = (error: unknown) => {
  if (!(error instanceof TRPCClientError)) return;
  if (typeof window === "undefined") return;

  const isUnauthorized = error.message === UNAUTHED_ERR_MSG;

  if (!isUnauthorized) return;

  window.location.href = getLoginUrl();
};

queryClient.getQueryCache().subscribe(event => {
  if (event.type === "updated" && event.action.type === "error") {
    const error = event.query.state.error;
    redirectToLoginIfUnauthorized(error);
    console.error("[API Query Error]", error);
  }
});

queryClient.getMutationCache().subscribe(event => {
  if (event.type === "updated" && event.action.type === "error") {
    const error = event.mutation.state.error;
    redirectToLoginIfUnauthorized(error);
    console.error("[API Mutation Error]", error);
  }
});

// When running as a native Capacitor app (Android/iOS), the WebView serves
// files from capacitor://localhost or https://localhost, so relative URLs
// would resolve to localhost instead of the real server.
// Detect native context by checking if the origin is localhost (Capacitor WebView)
// or if window.androidBridge / window.webkit.messageHandlers.bridge is present.
const isNativeApp = (): boolean => {
  const origin = window.location.origin;
  // Capacitor Android uses https://localhost, Capacitor iOS uses capacitor://localhost
  if (origin === 'https://localhost' || origin === 'capacitor://localhost' || origin === 'http://localhost') {
    return true;
  }
  // Also check for the native bridge objects as a fallback
  const win = window as unknown as Record<string, unknown>;
  if (win.androidBridge) return true;
  const webkit = win.webkit as { messageHandlers?: { bridge?: unknown } } | undefined;
  if (webkit?.messageHandlers?.bridge) return true;
  return false;
};

const API_BASE_URL = isNativeApp()
  ? "https://contactapp-2llv2cmp.manus.space/api/trpc"
  : "/api/trpc";

const trpcClient = trpc.createClient({
  links: [
    httpBatchLink({
      url: API_BASE_URL,
      transformer: superjson,
      fetch(input, init) {
        return globalThis.fetch(input, {
          ...(init ?? {}),
          credentials: "include",
        });
      },
    }),
  ],
});

createRoot(document.getElementById("root")!).render(
  <trpc.Provider client={trpcClient} queryClient={queryClient}>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </trpc.Provider>
);

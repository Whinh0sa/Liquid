import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { setBaseUrl, setAuthTokenGetter } from "@workspace/api-client-react";

// ─── Wire API client to the backend ──────────────────────────────────────────
// Point all API calls at the Express server (local or deployed).
const apiBase = import.meta.env.VITE_API_BASE_URL ?? "";
if (apiBase) setBaseUrl(apiBase);

// Every API request automatically includes the Clerk session token.
// Clerk's getToken() is async, so we use a lazy getter resolved at request time.
// The actual getter is registered in App.tsx after ClerkProvider mounts —
// this is just the no-op default until then.
let _clerkGetToken: (() => Promise<string | null>) | null = null;

export function registerClerkTokenGetter(getter: () => Promise<string | null>) {
  _clerkGetToken = getter;
}

setAuthTokenGetter(async () => {
  if (!_clerkGetToken) return null;
  return _clerkGetToken();
});

createRoot(document.getElementById("root")!).render(<App />);

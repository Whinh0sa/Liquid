import { Switch, Route, Router as WouterRouter } from "wouter";
import { useEffect } from "react";
import { ClerkProvider, SignedIn, SignedOut, RedirectToSignIn, useAuth } from "@clerk/clerk-react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import NotFound from "@/pages/not-found";
import Landing from "@/pages/landing";
import Home from "@/pages/home";
import Analysis from "@/pages/analysis";
import Rings from "@/pages/rings";
import Alerts from "@/pages/alerts";
import { registerClerkTokenGetter } from "./main";
import { initTelemetry } from "@/lib/telemetry";

initTelemetry();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 2, // 2 minutes
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

if (!PUBLISHABLE_KEY) {
  throw new Error("Missing Publishable Key");
}

function ProtectedRoute({ component: Component }: { component: any }) {
  return (
    <>
      <SignedIn>
        <ErrorBoundary name="RouteBoundary">
          <Component />
        </ErrorBoundary>
      </SignedIn>
      <SignedOut>
        <RedirectToSignIn />
      </SignedOut>
    </>
  );
}

/**
 * Runs inside ClerkProvider — registers the Clerk session token getter
 * into the API client so every fetch automatically includes Authorization.
 */
function ClerkTokenRegistrar() {
  const { getToken } = useAuth();
  useEffect(() => {
    registerClerkTokenGetter(() => getToken());
  }, [getToken]);
  return null;
}

function Router() {
  return (
    <ErrorBoundary name="GlobalRouter">
      <Switch>
        {/* Public marketing surface */}
        <Route path="/" component={Landing} />

        {/* App shell — dashboard + sub-pages */}
        <Route path="/dashboard"><ProtectedRoute component={Home} /></Route>
        <Route path="/app"><ProtectedRoute component={Home} /></Route>
        <Route path="/analysis"><ProtectedRoute component={Analysis} /></Route>
        <Route path="/rings"><ProtectedRoute component={Rings} /></Route>
        <Route path="/alerts"><ProtectedRoute component={Alerts} /></Route>

        <Route component={NotFound} />
      </Switch>
    </ErrorBoundary>
  );
}

function App() {
  return (
    <ClerkProvider publishableKey={PUBLISHABLE_KEY} afterSignOutUrl="/">
      <ClerkTokenRegistrar />
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <Router />
          </WouterRouter>
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    </ClerkProvider>
  );
}

export default App;

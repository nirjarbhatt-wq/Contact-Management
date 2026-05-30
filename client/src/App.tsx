import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { useAuth } from "./_core/hooks/useAuth";
import { getLoginUrl } from "./const";
import DashboardLayout from "./components/DashboardLayout";
import NotFound from "./pages/NotFound";

// Pages
import AddContacts from "./pages/AddContacts";
import MyUploads from "./pages/MyUploads";
import AllContacts from "./pages/AllContacts";
import Reports from "./pages/Reports";
import AdminPanel from "./pages/AdminPanel";
import AuditLog from "./pages/AuditLog";

function AuthGate({ children }: { children: React.ReactNode }) {
  const { loading, isAuthenticated } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          <p className="text-muted-foreground text-sm font-medium">Loading…</p>
        </div>
      </div>
    );
  }
  if (!isAuthenticated) {
    window.location.href = getLoginUrl();
    return null;
  }
  return <>{children}</>;
}

function AppRoutes() {
  return (
    <AuthGate>
      <DashboardLayout>
        <Switch>
          <Route path="/" component={AddContacts} />
          <Route path="/add-contacts" component={AddContacts} />
          <Route path="/my-uploads" component={MyUploads} />
          <Route path="/all-contacts" component={AllContacts} />
          <Route path="/reports" component={Reports} />
          <Route path="/admin" component={AdminPanel} />
          <Route path="/audit-log" component={AuditLog} />
          <Route component={NotFound} />
        </Switch>
      </DashboardLayout>
    </AuthGate>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster richColors position="top-right" />
          <AppRoutes />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;

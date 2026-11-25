import { useEffect, useState } from "react";
import { ensureCsrf, fetchCurrentUser, logout } from "./api/auth.js";
import AppShell from "./components/AppShell.jsx";
import AuthLayout from "./components/AuthLayout.jsx";
import DashboardPage from "./pages/DashboardPage.jsx";
import LoginPage from "./pages/LoginPage.jsx";
import ProductsPage from "./pages/ProductsPage.jsx";
import SignupPage from "./pages/SignupPage.jsx";

function getAuthModeFromPath(pathname) {
  return pathname === "/signup" ? "signup" : "login";
}

function getWorkspaceRouteFromPath(pathname) {
  return pathname === "/products" ? "products" : "dashboard";
}

export default function App() {
  const [authMode, setAuthMode] = useState(() =>
    getAuthModeFromPath(window.location.pathname)
  );
  const [workspaceRoute, setWorkspaceRoute] = useState(() =>
    getWorkspaceRouteFromPath(window.location.pathname)
  );
  const [user, setUser] = useState(null);
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  useEffect(() => {
    const handlePopState = () => {
      setAuthMode(getAuthModeFromPath(window.location.pathname));
      setWorkspaceRoute(getWorkspaceRouteFromPath(window.location.pathname));
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  useEffect(() => {
    let active = true;

    async function bootstrapSession() {
      try {
        await ensureCsrf();
        const currentUser = await fetchCurrentUser();
        if (active) {
          setUser(currentUser);
        }
      } catch {
        if (active) {
          setUser(null);
        }
      } finally {
        if (active) {
          setIsCheckingSession(false);
        }
      }
    }

    bootstrapSession();
    return () => {
      active = false;
    };
  }, []);

  function navigateAuth(nextMode) {
    setAuthMode(nextMode);
    const nextPath = nextMode === "signup" ? "/signup" : "/login";
    if (window.location.pathname !== nextPath) {
      window.history.pushState({}, "", nextPath);
    }
  }

  function navigateWorkspace(nextRoute) {
    setWorkspaceRoute(nextRoute);
    const nextPath = nextRoute === "products" ? "/products" : "/dashboard";
    if (window.location.pathname !== nextPath) {
      window.history.pushState({}, "", nextPath);
    }
  }

  function handleAuthSuccess(authenticatedUser) {
    setUser(authenticatedUser);
    navigateWorkspace("dashboard");
  }

  async function handleLogout() {
    setIsLoggingOut(true);
    try {
      await logout();
    } finally {
      setUser(null);
      setIsLoggingOut(false);
      navigateAuth("login");
    }
  }

  if (isCheckingSession) {
    return (
      <div className="sf-loading-state" role="status" aria-live="polite">
        Verifying workspace session...
      </div>
    );
  }

  if (user) {
    return (
      <AppShell
        user={user}
        activeRoute={workspaceRoute}
        onNavigate={navigateWorkspace}
        onLogout={handleLogout}
        isLoggingOut={isLoggingOut}
      >
        {workspaceRoute === "products" ? (
          <ProductsPage />
        ) : (
          <DashboardPage onOpenInventory={() => navigateWorkspace("products")} />
        )}
      </AppShell>
    );
  }

  return (
    <AuthLayout mode={authMode} onSwitchMode={navigateAuth}>
      {authMode === "signup" ? (
        <SignupPage
          onSuccess={handleAuthSuccess}
          onNavigateLogin={() => navigateAuth("login")}
        />
      ) : (
        <LoginPage
          onSuccess={handleAuthSuccess}
          onNavigateSignup={() => navigateAuth("signup")}
        />
      )}
    </AuthLayout>
  );
}

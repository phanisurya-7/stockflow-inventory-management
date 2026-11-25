import { useEffect, useState } from "react";
import { ensureCsrf, fetchCurrentUser, logout } from "./api/auth.js";
import AuthLayout from "./components/AuthLayout.jsx";
import LoginPage from "./pages/LoginPage.jsx";
import SignupPage from "./pages/SignupPage.jsx";

function getModeFromPath(pathname) {
  return pathname === "/signup" ? "signup" : "login";
}

export default function App() {
  const [mode, setMode] = useState(() => getModeFromPath(window.location.pathname));
  const [user, setUser] = useState(null);
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  useEffect(() => {
    const handlePopState = () => {
      setMode(getModeFromPath(window.location.pathname));
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

  function navigateToMode(nextMode) {
    setMode(nextMode);
    const nextPath = nextMode === "signup" ? "/signup" : "/login";
    if (window.location.pathname !== nextPath) {
      window.history.pushState({}, "", nextPath);
    }
  }

  async function handleLogout() {
    setIsLoggingOut(true);
    try {
      await logout();
    } finally {
      setUser(null);
      setIsLoggingOut(false);
      navigateToMode("login");
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
      <div className="sf-session-shell">
        <header className="sf-topbar">
          <div className="sf-brand-lockup">
            <span className="sf-brand-mark" aria-hidden="true" />
            <span className="sf-brand-name">StockFlow</span>
          </div>

          <div className="sf-topbar-right">
            <span className="sf-status-pill">Session active</span>
            <button
              type="button"
              className="sf-signout-btn"
              onClick={handleLogout}
              disabled={isLoggingOut}
            >
              {isLoggingOut ? "Signing out..." : "Sign out"}
            </button>
          </div>
        </header>

        <main className="sf-session-main">
          <section className="sf-session-card" aria-label="Authenticated workspace confirmation">
            <p className="sf-session-kicker">Authenticated Workspace</p>
            <h1 className="sf-session-title">
              {user.organization ? user.organization.name : "Workspace ready"}
            </h1>
            <p className="sf-session-desc">
              Your session is verified and scoped to your organization. Inventory
              management modules will be connected here in the next milestone.
            </p>

            <div className="sf-details-grid">
              <div className="sf-detail-row">
                <span className="sf-detail-label">Account Email</span>
                <span className="sf-detail-value">{user.email}</span>
              </div>
              <div className="sf-detail-row">
                <span className="sf-detail-label">Organization</span>
                <span className="sf-detail-value">
                  {user.organization ? user.organization.name : "—"}
                </span>
              </div>
            </div>
          </section>
        </main>
      </div>
    );
  }

  return (
    <AuthLayout mode={mode} onSwitchMode={navigateToMode}>
      {mode === "signup" ? (
        <SignupPage
          onSuccess={(authenticatedUser) => setUser(authenticatedUser)}
          onNavigateLogin={() => navigateToMode("login")}
        />
      ) : (
        <LoginPage
          onSuccess={(authenticatedUser) => setUser(authenticatedUser)}
          onNavigateSignup={() => navigateToMode("signup")}
        />
      )}
    </AuthLayout>
  );
}

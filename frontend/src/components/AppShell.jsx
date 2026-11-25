export default function AppShell({
  user,
  activeRoute,
  onNavigate,
  onLogout,
  isLoggingOut,
  children,
}) {
  return (
    <div className="sf-workspace">
      <aside className="sf-sidebar" aria-label="Workspace navigation">
        <div className="sf-sidebar-top">
          <div className="sf-brand-lockup">
            <span className="sf-brand-mark" aria-hidden="true" />
            <span className="sf-brand-name">StockFlow</span>
          </div>

          <div className="sf-org-block">
            <span className="sf-org-kicker">Organization</span>
            <span className="sf-org-name">
              {user.organization ? user.organization.name : "Workspace"}
            </span>
          </div>

          <nav className="sf-nav" aria-label="Primary sections">
            <button
              type="button"
              className="sf-nav-item"
              aria-current={activeRoute === "dashboard" ? "page" : undefined}
              onClick={() => onNavigate("dashboard")}
            >
              <span>Overview</span>
              {activeRoute === "dashboard" && (
                <span className="sf-nav-dot" aria-hidden="true" />
              )}
            </button>
            <button
              type="button"
              className="sf-nav-item"
              aria-current={activeRoute === "products" ? "page" : undefined}
              onClick={() => onNavigate("products")}
            >
              <span>Inventory</span>
              {activeRoute === "products" && (
                <span className="sf-nav-dot" aria-hidden="true" />
              )}
            </button>
          </nav>
        </div>

        <div className="sf-sidebar-footer">
          <p className="sf-user-email" title={user.email}>
            {user.email}
          </p>
          <button
            type="button"
            className="sf-signout-btn"
            onClick={onLogout}
            disabled={isLoggingOut}
          >
            {isLoggingOut ? "Signing out..." : "Sign out"}
          </button>
        </div>
      </aside>

      <main className="sf-workspace-main">{children}</main>
    </div>
  );
}

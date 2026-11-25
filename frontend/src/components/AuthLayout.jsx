export default function AuthLayout({ mode, onSwitchMode, children }) {
  return (
    <div className="sf-auth-shell">
      <aside className="sf-auth-rail" aria-label="StockFlow overview">
        <div className="sf-brand-lockup">
          <span className="sf-brand-mark" aria-hidden="true" />
          <span className="sf-brand-name">StockFlow</span>
        </div>

        <div className="sf-rail-body">
          <p className="sf-rail-kicker">Workspace Access</p>
          <h1 className="sf-rail-headline">
            Inventory clarity, <em>structured</em> by organization.
          </h1>
          <p className="sf-rail-copy">
            Every account provisions an isolated workspace so your catalog,
            stock counts, and operational records stay scoped to your team.
          </p>
        </div>

        <div className="sf-spec-list">
          <div className="sf-spec-row">
            <span className="sf-spec-key">Tenancy</span>
            <span className="sf-spec-val">Organization-scoped records</span>
          </div>
          <div className="sf-spec-row">
            <span className="sf-spec-key">Authentication</span>
            <span className="sf-spec-val">HttpOnly session + CSRF</span>
          </div>
          <div className="sf-spec-row">
            <span className="sf-spec-key">Identifier</span>
            <span className="sf-spec-val">Verified email address</span>
          </div>
        </div>
      </aside>

      <main className="sf-auth-main">
        <section className="sf-auth-card" aria-label="Authentication form">
          <div className="sf-mode-switch" role="tablist" aria-label="Authentication mode">
            <button
              type="button"
              role="tab"
              aria-selected={mode === "login"}
              className="sf-mode-btn"
              onClick={() => onSwitchMode("login")}
            >
              Sign in
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mode === "signup"}
              className="sf-mode-btn"
              onClick={() => onSwitchMode("signup")}
            >
              Create workspace
            </button>
          </div>

          {children}
        </section>
      </main>
    </div>
  );
}

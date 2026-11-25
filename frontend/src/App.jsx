export default function App() {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "grid",
        gridTemplateRows: "auto 1fr",
      }}
    >
      <header
        style={{
          backgroundColor: "var(--color-nav-bg)",
          color: "var(--color-nav-text)",
          padding: "16px 32px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          borderBottom: "1px solid var(--color-nav-surface)",
        }}
      >
        <span
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "1.25rem",
            letterSpacing: "-0.01em",
          }}
        >
          StockFlow
        </span>
        <span
          style={{
            backgroundColor: "var(--color-accent-lime)",
            color: "var(--color-accent-lime-ink)",
            fontSize: "0.75rem",
            fontWeight: 600,
            padding: "4px 10px",
            borderRadius: "var(--radius-pill)",
          }}
        >
          Initialized
        </span>
      </header>

      <main
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "48px 24px",
        }}
      >
        <section
          style={{
            maxWidth: "520px",
            width: "100%",
            backgroundColor: "var(--color-bg-surface)",
            border: "1px solid var(--color-border-hairline)",
            borderRadius: "var(--radius-lg)",
            padding: "32px",
            boxShadow: "var(--shadow-subtle)",
          }}
        >
          <p
            style={{
              margin: "0 0 8px",
              fontSize: "0.75rem",
              fontWeight: 600,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: "var(--color-ink-muted)",
            }}
          >
            Milestone 1
          </p>
          <h1
            style={{
              margin: "0 0 12px",
              fontFamily: "var(--font-display)",
              fontSize: "1.75rem",
              fontWeight: 400,
              color: "var(--color-ink-primary)",
            }}
          >
            Project shell ready.
          </h1>
          <p
            style={{
              margin: 0,
              fontSize: "0.95rem",
              lineHeight: 1.6,
              color: "var(--color-ink-secondary)",
            }}
          >
            React + Vite frontend initialized with StockFlow editorial design
            tokens.
          </p>
        </section>
      </main>
    </div>
  );
}

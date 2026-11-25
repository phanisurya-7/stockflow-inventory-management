import { useState } from "react";
import { login } from "../api/auth.js";
import { ApiError } from "../api/client.js";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function LoginPage({ onSuccess, onNavigateSignup }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [formError, setFormError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  function validate() {
    const errors = {};
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      errors.email = "Email address is required.";
    } else if (!EMAIL_PATTERN.test(trimmedEmail)) {
      errors.email = "Enter a valid email address.";
    }
    if (!password) {
      errors.password = "Password is required.";
    }
    return errors;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setFormError("");
    const clientErrors = validate();
    setFieldErrors(clientErrors);
    if (Object.keys(clientErrors).length > 0) {
      return;
    }

    setIsSubmitting(true);
    try {
      const user = await login({ email: email.trim(), password });
      onSuccess(user);
    } catch (error) {
      if (error instanceof ApiError) {
        setFieldErrors(error.fieldErrors || {});
        setFormError(error.message);
      } else {
        setFormError("Unable to reach the server. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <>
      <h2 className="sf-card-title">Welcome back</h2>
      <p className="sf-card-subtitle">
        Sign in with your organization email and password to resume your session.
      </p>

      {formError && (
        <div className="sf-alert-error" role="alert">
          {formError}
        </div>
      )}

      <form className="sf-form" onSubmit={handleSubmit} noValidate>
        <div className="sf-field">
          <label className="sf-label" htmlFor="login-email">
            Work email
          </label>
          <input
            id="login-email"
            type="email"
            autoComplete="email"
            className="sf-input"
            placeholder="name@company.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            aria-invalid={Boolean(fieldErrors.email)}
            disabled={isSubmitting}
          />
          {fieldErrors.email && <p className="sf-field-error">{fieldErrors.email}</p>}
        </div>

        <div className="sf-field">
          <label className="sf-label" htmlFor="login-password">
            Password
          </label>
          <input
            id="login-password"
            type="password"
            autoComplete="current-password"
            className="sf-input"
            placeholder="Enter your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            aria-invalid={Boolean(fieldErrors.password)}
            disabled={isSubmitting}
          />
          {fieldErrors.password && <p className="sf-field-error">{fieldErrors.password}</p>}
        </div>

        <button type="submit" className="sf-submit-btn" disabled={isSubmitting}>
          <span className="sf-submit-dot" aria-hidden="true" />
          {isSubmitting ? "Signing in..." : "Sign in to workspace"}
        </button>
      </form>

      <p className="sf-card-footer">
        New to StockFlow?{" "}
        <button type="button" className="sf-link-btn" onClick={onNavigateSignup}>
          Create an organization
        </button>
      </p>
    </>
  );
}

import { useState } from "react";
import { signup } from "../api/auth.js";
import { ApiError } from "../api/client.js";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function SignupPage({ onSuccess, onNavigateLogin }) {
  const [organizationName, setOrganizationName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [formError, setFormError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  function validate() {
    const errors = {};
    const trimmedOrg = organizationName.trim();
    const trimmedEmail = email.trim();

    if (!trimmedOrg) {
      errors.organization_name = "Organization name is required.";
    } else if (trimmedOrg.length < 2) {
      errors.organization_name = "Organization name must be at least 2 characters.";
    }

    if (!trimmedEmail) {
      errors.email = "Email address is required.";
    } else if (!EMAIL_PATTERN.test(trimmedEmail)) {
      errors.email = "Enter a valid email address.";
    }

    if (!password) {
      errors.password = "Password is required.";
    } else if (password.length < 8) {
      errors.password = "Password must be at least 8 characters.";
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
      const user = await signup({
        organization_name: organizationName.trim(),
        email: email.trim(),
        password,
      });
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
      <h2 className="sf-card-title">Create your workspace</h2>
      <p className="sf-card-subtitle">
        Register your email and organization to provision a private inventory workspace.
      </p>

      {formError && (
        <div className="sf-alert-error" role="alert">
          {formError}
        </div>
      )}

      <form className="sf-form" onSubmit={handleSubmit} noValidate>
        <div className="sf-field">
          <label className="sf-label" htmlFor="signup-org">
            Organization name
          </label>
          <input
            id="signup-org"
            type="text"
            autoComplete="organization"
            className="sf-input"
            placeholder="Acme Supply Co."
            value={organizationName}
            onChange={(e) => setOrganizationName(e.target.value)}
            aria-invalid={Boolean(fieldErrors.organization_name)}
            disabled={isSubmitting}
          />
          {fieldErrors.organization_name && (
            <p className="sf-field-error">{fieldErrors.organization_name}</p>
          )}
        </div>

        <div className="sf-field">
          <label className="sf-label" htmlFor="signup-email">
            Work email
          </label>
          <input
            id="signup-email"
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
          <label className="sf-label" htmlFor="signup-password">
            Password
          </label>
          <input
            id="signup-password"
            type="password"
            autoComplete="new-password"
            className="sf-input"
            placeholder="Minimum 8 characters"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            aria-invalid={Boolean(fieldErrors.password)}
            disabled={isSubmitting}
          />
          {fieldErrors.password ? (
            <p className="sf-field-error">{fieldErrors.password}</p>
          ) : (
            <p className="sf-field-hint">
              Use at least 8 characters with a mix of letters and numbers.
            </p>
          )}
        </div>

        <button type="submit" className="sf-submit-btn" disabled={isSubmitting}>
          <span className="sf-submit-dot" aria-hidden="true" />
          {isSubmitting ? "Creating workspace..." : "Create workspace"}
        </button>
      </form>

      <p className="sf-card-footer">
        Already have an account?{" "}
        <button type="button" className="sf-link-btn" onClick={onNavigateLogin}>
          Sign in
        </button>
      </p>
    </>
  );
}

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { resetPassword } from "../api/auth.api.js";

export const ResetPasswordPage = () => {
  const { token } = useParams();
  const [form, setForm] = useState({ newPassword: "", confirmPassword: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const update = (event) => {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  };

  const submit = async (event) => {
    event.preventDefault();
    setError("");
    setMessage("");

    if (form.newPassword !== form.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setIsSubmitting(true);

    try {
      await resetPassword({ token, newPassword: form.newPassword });
      setMessage("Password reset successfully. You can now log in with your new password.");
      setForm({ newPassword: "", confirmPassword: "" });
    } catch (err) {
      setError(err.response?.data?.message || "Unable to reset password. The link may be expired.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="auth-page">
      <form className="auth-panel" onSubmit={submit}>
        <p className="eyebrow">CareerTrack AI</p>
        <h1>Create a new password</h1>
        <label>
          New password
          <span className="password-field">
            <input
              name="newPassword"
              type={showPassword ? "text" : "password"}
              value={form.newPassword}
              onChange={update}
              minLength="8"
              required
            />
            <button
              className="icon-button ghost-button"
              type="button"
              onClick={() => setShowPassword((current) => !current)}
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </span>
        </label>
        <label>
          Confirm password
          <span className="password-field">
            <input
              name="confirmPassword"
              type={showConfirmPassword ? "text" : "password"}
              value={form.confirmPassword}
              onChange={update}
              minLength="8"
              required
            />
            <button
              className="icon-button ghost-button"
              type="button"
              onClick={() => setShowConfirmPassword((current) => !current)}
              aria-label={showConfirmPassword ? "Hide password confirmation" : "Show password confirmation"}
            >
              {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </span>
        </label>
        {message ? <p className="success">{message}</p> : null}
        {error ? <p className="error">{error}</p> : null}
        <button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Saving..." : "Reset password"}
        </button>
        <p>
          Ready to continue? <Link to="/login">Log in</Link>
        </p>
      </form>
    </main>
  );
};

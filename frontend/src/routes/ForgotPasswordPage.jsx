import { useState } from "react";
import { Link } from "react-router-dom";
import { forgotPassword } from "../api/auth.api.js";

const successMessage = "If an account exists with this email, a reset link has been sent.";

export const ForgotPasswordPage = () => {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    setError("");
    setMessage("");
    setIsSubmitting(true);

    try {
      await forgotPassword({ email });
      setMessage(successMessage);
    } catch (err) {
      setError(err.response?.data?.message || "Unable to send reset link right now.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="auth-page">
      <form className="auth-panel" onSubmit={submit}>
        <p className="eyebrow">CareerTrack AI</p>
        <h1>Reset your password</h1>
        <p className="muted">Enter your account email and we will send a secure reset link.</p>
        <label>
          Email
          <input name="email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
        </label>
        {message ? <p className="success">{message}</p> : null}
        {error ? <p className="error">{error}</p> : null}
        <button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Sending..." : "Send reset link"}
        </button>
        <p>
          Remembered it? <Link to="/login">Back to login</Link>
        </p>
      </form>
    </main>
  );
};

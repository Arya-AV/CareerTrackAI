import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider.jsx";

export const LoginPage = () => {
  const { signIn } = useAuth();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const update = (event) => {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  };

  const submit = async (event) => {
    event.preventDefault();
    setError("");

    try {
      await signIn(form);
    } catch (err) {
      setError(err.response?.data?.message || "Unable to log in");
    }
  };

  return (
    <main className="auth-page">
      <form className="auth-panel" onSubmit={submit}>
        <p className="eyebrow">CareerTrack AI</p>
        <h1>Log in</h1>
        <label>
          Email
          <input name="email" type="email" value={form.email} onChange={update} required />
        </label>
        <label>
          Password
          <span className="password-field">
            <input
              name="password"
              type={showPassword ? "text" : "password"}
              value={form.password}
              onChange={update}
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
        {error ? <p className="error">{error}</p> : null}
        <Link className="auth-secondary-link" to="/forgot-password">
          Forgot password?
        </Link>
        <button type="submit">Log in</button>
        <p>
          New here? <Link to="/signup">Create an account</Link>
        </p>
      </form>
    </main>
  );
};

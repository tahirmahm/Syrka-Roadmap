"use client";
import { useState } from "react";
import Link from "next/link";
import { Brand } from "./brand";
import { getSupabase } from "@/lib/supabase";
export function SignIn() {
  const [email, setEmail] = useState(""),
    [password, setPassword] = useState(""),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false);
  const client = getSupabase();
  return (
    <main className="auth-page">
      <div className="auth-card">
        <Brand wordmark />
        <span className="eyebrow">FIND YOUR DIRECTION</span>
        <h1>Welcome to Roadmaps.</h1>
        <p>
          {client
            ? "Sign in with your Roadmaps account. Campus and Workspace authentication remain separate."
            : "Account access is not configured yet. The public demo works without an account; progress is stored in your browser."}
        </p>
        {client && (
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              setBusy(true);
              try {
                const { error } = await client.auth.signInWithPassword({
                  email,
                  password,
                });
                setMessage(
                  error
                    ? "Sign-in failed. Check your credentials and try again."
                    : "Signed in. Opening your private Roadmaps workspace…",
                );
                if (!error)
                  window.location.assign(
                    (process.env.NEXT_PUBLIC_BASE_PATH || "") + "/",
                  );
              } catch {
                setMessage(
                  "Authentication is unavailable. Please try again later.",
                );
              } finally {
                setBusy(false);
              }
            }}
          >
            <label>
              Email
              <input
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </label>
            <label>
              Password
              <input
                type="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </label>
            <button className="primary" disabled={busy}>
              {busy ? "Signing in…" : "Sign in"}
            </button>
          </form>
        )}
        {message && <p role="status">{message}</p>}
        <Link href="/">Explore the working demo →</Link>
      </div>
    </main>
  );
}

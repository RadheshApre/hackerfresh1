"use client";
import { useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";

export default function Login() {
  const [email, setEmail] = useState(""); const [password, setPassword] = useState(""); const [msg, setMsg] = useState(""); const [busy, setBusy] = useState(false);
  async function go(kind: "in" | "up") {
    setBusy(true); setMsg("");
    const sb = supabaseBrowser();
    const r = kind === "in" ? await sb.auth.signInWithPassword({ email, password }) : await sb.auth.signUp({ email, password, options: { emailRedirectTo: `${location.origin}/dashboard` } });
    setBusy(false);
    if (r.error) setMsg(r.error.message);
    else if (kind === "up") setMsg("Account created. Check your email to verify, then log in.");
    else { const next = new URLSearchParams(location.search).get("next"); location.href = next && next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard"; }
  }
  return (
    <main className="container"><div className="card formbox">
      <h1 style={{ marginTop: 0 }}>Welcome to HackerFresh</h1><p className="note">Log in or create a free account to download your resume.</p>
      <div className="field"><label>Email<input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" /></label></div>
      <div className="field"><label>Password<input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" /></label></div>
      <div style={{ display: "flex", gap: 10, marginTop: 16 }}><button className="btn btn-primary" disabled={busy} onClick={() => go("in")}>Log in</button><button className="btn" disabled={busy} onClick={() => go("up")}>Create account</button></div>
      {msg && <p role="status" className="warn" style={{ marginTop: 14 }}>{msg}</p>}
    </div></main>);
}

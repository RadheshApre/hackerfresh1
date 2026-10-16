import Logo from "./Logo";
import { supabaseServer } from "@/lib/supabase/server";

export default async function Navbar() {
  let signedIn = false;
  try { signedIn = !!(await (await supabaseServer()).auth.getUser()).data.user; } catch {}
  return (
    <header className="nav"><div className="container">
      <Logo />
      <nav className="nav-links" aria-label="Main">
        <a href="/builder">Resume Builder</a><a href="/pricing">Pricing</a>
        {signedIn ? <a href="/dashboard" className="btn btn-primary btn-sm">Dashboard</a> : <><a href="/login">Log in</a><a href="/builder" className="btn btn-primary btn-sm">Build free</a></>}
      </nav>
    </div></header>);
}

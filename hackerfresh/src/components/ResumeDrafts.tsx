"use client";
import { useEffect, useState } from "react";
export default function ResumeDrafts() {
  const [name, setName] = useState<string | null | undefined>(undefined);
  useEffect(() => { try { const raw = localStorage.getItem("hf_resume_v1"); setName(raw ? (JSON.parse(raw).data?.name || "Untitled resume") : null); } catch { setName(null); } }, []);
  if (name === undefined) return null;
  return name ? <p>Saved draft: <b>{name}</b> <a className="btn btn-sm" href="/builder">Continue editing</a></p> : <p className="note">No saved draft on this device yet.</p>;
}

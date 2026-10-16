"use client";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
export default function AutoRefresh({ active }: { active: boolean }) {
  const r = useRouter();
  useEffect(() => { if (!active) return; const t = setInterval(() => r.refresh(), 4000); return () => clearInterval(t); }, [active, r]);
  return null;
}

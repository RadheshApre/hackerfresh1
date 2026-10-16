"use client";
import { usePathname } from "next/navigation";
import { useEffect } from "react";

export default function Tracker() {
  const path = usePathname();
  useEffect(() => {
    if (path.startsWith("/admin")) return;
    fetch("/api/track", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ path }), keepalive: true }).catch(() => {});
  }, [path]);
  return null;
}

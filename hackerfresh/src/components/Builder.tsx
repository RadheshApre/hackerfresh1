"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { RESUME_CSS, renderResumeHtml } from "@/lib/resume/render";
import { analyze } from "@/lib/resume/ats";
import { SAMPLE_RESUME } from "@/lib/resume/sample";
import { TEMPLATES, emptyResume, type ResumeData, type TemplateId, type Exp, type Edu, type Proj } from "@/lib/resume/types";

const KEY = "hf_resume_v1";
type Notice = null | { kind: "limit" | "error"; text: string };

export default function Builder() {
  const router = useRouter();
  const [data, setData] = useState<ResumeData>(emptyResume());
  const [tpl, setTpl] = useState<TemplateId>("classic");
  const [jd, setJd] = useState("");
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<Notice>(null);
  const [info, setInfo] = useState<string | null>(null);

  useEffect(() => { // restore draft from this browser only
    try { const raw = localStorage.getItem(KEY); if (raw) { const j = JSON.parse(raw); if (j.data) setData({ ...emptyResume(), ...j.data }); if (j.tpl) setTpl(j.tpl); } } catch {}
    setReady(true);
  }, []);
  useEffect(() => { if (ready) try { localStorage.setItem(KEY, JSON.stringify({ data, tpl })); } catch {} }, [data, tpl, ready]);

  const html = useMemo(() => renderResumeHtml(data, tpl), [data, tpl]);
  const report = useMemo(() => analyze(data, jd), [data, jd]);
  const set = <K extends keyof ResumeData>(k: K, v: ResumeData[K]) => setData((d) => ({ ...d, [k]: v }));
  const upd = <T extends Exp | Edu | Proj>(k: "experience" | "education" | "projects", i: number, patch: Partial<T>) =>
    setData((d) => ({ ...d, [k]: (d[k] as T[]).map((x, j) => (j === i ? { ...x, ...patch } : x)) }));
  const add = (k: "experience" | "education" | "projects") => setData((d) => ({ ...d, [k]: [...d[k], (emptyResume()[k] as unknown[])[0]] } as ResumeData));
  const del = (k: "experience" | "education" | "projects", i: number) => setData((d) => ({ ...d, [k]: d[k].filter((_, j) => j !== i) } as ResumeData));

  async function exportPdf() {
    setNotice(null); setInfo(null); setBusy(true);
    const w = window.open("", "_blank"); // open synchronously so the popup isn't blocked
    try {
      const res = await fetch("/api/resume/export", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ resume: data, template: tpl }) });
      const j = await res.json().catch(() => ({}));
      if (res.status === 401) { w?.close(); router.push("/login?next=/builder"); return; } // draft is already saved locally
      if (res.status === 402 || res.status === 429) { w?.close(); setNotice({ kind: "limit", text: res.status === 402 ? "You’ve used your free downloads." : "You’ve reached this month’s download limit." }); return; }
      if (!res.ok || !j.html) { w?.close(); setNotice({ kind: "error", text: j.error ?? "Could not create the PDF. Please check your details and try again." }); return; }
      if (!w) { setNotice({ kind: "error", text: "Your browser blocked the download window. Allow pop-ups for this site and try again." }); return; }
      w.document.open(); w.document.write(j.html); w.document.close();
      setInfo("Choose “Save as PDF” in the print window." + (typeof j.remaining === "number" ? ` Downloads left: ${j.remaining}.` : ""));
    } catch { w?.close(); setNotice({ kind: "error", text: "Network error. Please try again." }); }
    finally { setBusy(false); }
  }

  const F = (label: string, value: string, on: (v: string) => void, ph = "", type = "text") => (<div className="field"><label>{label}<input type={type} value={value} placeholder={ph} onChange={(e) => on(e.target.value)} /></label></div>);
  const T = (label: string, value: string, on: (v: string) => void, ph = "") => (<div className="field"><label>{label}<textarea value={value} placeholder={ph} onChange={(e) => on(e.target.value)} /></label></div>);

  return (
    <div className="container builder">
      <style>{RESUME_CSS}</style>
      <div className="panel">
        <div className="card">
          <b>Template</b>
          <div className="tpl" style={{ marginTop: 8 }}>{TEMPLATES.map((t) => <button key={t.id} className={`btn btn-sm ${tpl === t.id ? "on" : ""}`} onClick={() => setTpl(t.id)} aria-pressed={tpl === t.id}>{t.name}</button>)}</div>
          <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
            <button className="btn btn-sm" onClick={() => { if (confirm("Replace your current resume with the sample?")) setData(SAMPLE_RESUME); }}>Load sample</button>
            <button className="btn btn-sm" onClick={() => { if (confirm("Clear everything?")) setData(emptyResume()); }}>Clear</button>
          </div>
        </div>

        <details className="sec" open><summary>Contact</summary>
          <div className="g2">{F("Full name", data.name, (v) => set("name", v), "Aarav Sharma")}{F("Target role", data.title, (v) => set("title", v), "Junior Python Developer")}</div>
          <div className="g2">{F("Email", data.email, (v) => set("email", v), "you@example.com", "email")}{F("Phone", data.phone, (v) => set("phone", v), "+91 …", "tel")}</div>
          {F("Location", data.location, (v) => set("location", v), "City, State")}{F("Links (LinkedIn, GitHub)", data.links, (v) => set("links", v), "linkedin.com/in/… | github.com/…")}
        </details>
        <details className="sec" open><summary>Summary &amp; skills</summary>
          {T("Summary (2–3 lines)", data.summary, (v) => set("summary", v), "Final-year B.Tech student with … seeking …")}
          {T("Skills (comma separated)", data.skills, (v) => set("skills", v), "Python, SQL, Git, Flask")}
        </details>
        <details className="sec"><summary>Experience / internships</summary>
          {data.experience.map((e, i) => (<div key={i} style={{ borderBottom: "1px solid var(--line)", paddingBottom: 10 }}>
            <div className="g2">{F("Role", e.role, (v) => upd<Exp>("experience", i, { role: v }))}{F("Company", e.company, (v) => upd<Exp>("experience", i, { company: v }))}</div>
            <div className="g2">{F("Start", e.start, (v) => upd<Exp>("experience", i, { start: v }), "Jan 2026")}{F("End", e.end, (v) => upd<Exp>("experience", i, { end: v }), "Present")}</div>
            {F("Location", e.location, (v) => upd<Exp>("experience", i, { location: v }))}
            {T("Achievements (one per line)", e.bullets, (v) => upd<Exp>("experience", i, { bullets: v }), "Built … that …")}
            <button className="btn btn-sm" onClick={() => del("experience", i)}>Remove</button></div>))}
          <p><button className="btn btn-sm" onClick={() => add("experience")}>+ Add experience</button></p>
        </details>
        <details className="sec"><summary>Projects</summary>
          {data.projects.map((p, i) => (<div key={i} style={{ borderBottom: "1px solid var(--line)", paddingBottom: 10 }}>
            {F("Project name", p.name, (v) => upd<Proj>("projects", i, { name: v }))}{F("Tech used", p.tech, (v) => upd<Proj>("projects", i, { tech: v }), "Python, Flask")}
            {T("What you did (one per line)", p.bullets, (v) => upd<Proj>("projects", i, { bullets: v }))}
            <button className="btn btn-sm" onClick={() => del("projects", i)}>Remove</button></div>))}
          <p><button className="btn btn-sm" onClick={() => add("projects")}>+ Add project</button></p>
        </details>
        <details className="sec"><summary>Education</summary>
          {data.education.map((e, i) => (<div key={i} style={{ borderBottom: "1px solid var(--line)", paddingBottom: 10 }}>
            {F("Degree", e.degree, (v) => upd<Edu>("education", i, { degree: v }), "B.Tech, Computer Science")}{F("Institution", e.school, (v) => upd<Edu>("education", i, { school: v }))}
            <div className="g2">{F("Years", e.year, (v) => upd<Edu>("education", i, { year: v }), "2022 – 2026")}{F("Details", e.details, (v) => upd<Edu>("education", i, { details: v }), "CGPA 8.2/10")}</div>
            <button className="btn btn-sm" onClick={() => del("education", i)}>Remove</button></div>))}
          <p><button className="btn btn-sm" onClick={() => add("education")}>+ Add education</button></p>
        </details>
      </div>

      <div className="sticky" style={{ display: "grid", gap: 14 }}>
        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <button className="btn btn-primary" onClick={exportPdf} disabled={busy}>{busy ? "Preparing…" : "⬇ Download PDF"}</button>
          <span className="note">Sign-in needed. {`Free accounts get 3 downloads.`}</span>
        </div>
        {info && <p className="note" role="status">{info}</p>}
        {notice?.kind === "limit" && <div className="warn" role="alert">{notice.text} <a href="/pricing">Upgrade to Starter (₹99/month)</a> to keep downloading. Your resume is saved and still editable.</div>}
        {notice?.kind === "error" && <div className="warn" role="alert">{notice.text}</div>}
        <div className="paper" aria-label="Resume preview" dangerouslySetInnerHTML={{ __html: html }} />
        <div className="card" id="checker">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}><b>Resume checker</b><span className="score">{report.score}<small style={{ fontSize: 16, color: "var(--mute)" }}>/100</small></span></div>
          <p className="note" style={{ marginTop: 0 }}>Estimate of resume basics from 10 simple checks. Not an official ATS score, and no guarantee of interviews.</p>
          {report.checks.map((c) => <div className="chk" key={c.label}><span className={c.pass ? "ok" : "no"}>{c.pass ? "✓" : "✗"}</span><span>{c.label}{!c.pass && <span className="note"> — {c.tip}</span>}</span></div>)}
          <div className="field"><label>Paste a job description to check keywords<textarea value={jd} onChange={(e) => setJd(e.target.value)} placeholder="Paste the job post here…" /></label></div>
          {report.keywordMatch !== null && <><p><b>Keyword match: {report.keywordMatch}%</b> <span className="note">(top keywords from the job post found in your resume)</span></p>
            <div>{report.matched.map((k) => <span className="pill g" key={k}>{k}</span>)}{report.missing.map((k) => <span className="pill" key={k}>{k}</span>)}</div>
            <p className="note">Red = not found. Add a keyword only if it truthfully describes your experience.</p></>}
        </div>
      </div>
    </div>);
}

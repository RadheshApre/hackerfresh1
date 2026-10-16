import type { ResumeData, TemplateId } from "./types";

export const esc = (v: string) => v.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] as string));
const lines = (t: string) => t.split("\n").map((l) => l.replace(/^[\s\-•*]+/, "").trim()).filter(Boolean);
const ul = (t: string) => { const l = lines(t); return l.length ? `<ul>${l.map((x) => `<li>${esc(x)}</li>`).join("")}</ul>` : ""; };
const has = (...v: string[]) => v.some((x) => x.trim());

// ATS-friendly by construction: single column, real text, standard headings, no tables/images/icons.
export const RESUME_CSS = `
.rs{font-family:Arial,Helvetica,sans-serif;color:#111;background:#fff;padding:30px 34px;font-size:11.5px;line-height:1.45;text-align:left}
.rs *{box-sizing:border-box}
.rs h1{font-size:23px;margin:0 0 2px;letter-spacing:.2px}
.rs .ttl{font-size:12.5px;margin:0 0 4px}
.rs .contact{font-size:11px;color:#222}
.rs h2{font-size:11.5px;text-transform:uppercase;letter-spacing:.08em;border-bottom:1px solid #111;margin:14px 0 6px;padding-bottom:2px}
.rs .row{display:flex;justify-content:space-between;gap:12px;margin-top:6px}
.rs .row b{font-size:11.5px}.rs .sub{color:#333;font-style:italic;margin:0}
.rs ul{margin:3px 0 0;padding-left:16px}.rs li{margin:1px 0}.rs p{margin:2px 0}
.rs-classic .hd{text-align:center}
.rs-modern h1,.rs-modern h2{color:#3b2fd1}.rs-modern h2{border-color:#3b2fd1}
.rs-compact{font-size:10.3px;padding:22px 26px;line-height:1.35}.rs-compact h1{font-size:20px}.rs-compact h2{margin:9px 0 4px}
`;

export function renderResumeHtml(d: ResumeData, t: TemplateId): string {
  const contact = [d.email, d.phone, d.location, d.links].filter((x) => x.trim()).map(esc).join(" | ");
  const exp = d.experience.filter((e) => has(e.role, e.company, e.bullets)).map((e) =>
    `<div class="row"><b>${esc([e.role, e.company].filter(Boolean).join(", "))}</b><span>${esc([e.start, e.end].filter(Boolean).join(" – "))}</span></div>${e.location ? `<p class="sub">${esc(e.location)}</p>` : ""}${ul(e.bullets)}`).join("");
  const edu = d.education.filter((e) => has(e.degree, e.school)).map((e) =>
    `<div class="row"><b>${esc([e.degree, e.school].filter(Boolean).join(", "))}</b><span>${esc(e.year)}</span></div>${e.details ? `<p>${esc(e.details)}</p>` : ""}`).join("");
  const proj = d.projects.filter((p) => has(p.name, p.bullets)).map((p) =>
    `<div class="row"><b>${esc(p.name)}</b></div>${p.tech ? `<p class="sub">${esc(p.tech)}</p>` : ""}${ul(p.bullets)}`).join("");
  const sec = (h: string, body: string) => (body ? `<h2>${h}</h2>${body}` : "");
  return `<div class="rs rs-${t}"><div class="hd"><h1>${esc(d.name || "Your Name")}</h1>${d.title ? `<p class="ttl">${esc(d.title)}</p>` : ""}<div class="contact">${contact}</div></div>` +
    sec("Summary", d.summary.trim() ? `<p>${esc(d.summary)}</p>` : "") + sec("Skills", d.skills.trim() ? `<p>${esc(d.skills)}</p>` : "") +
    sec("Experience", exp) + sec("Projects", proj) + sec("Education", edu) + `</div>`;
}

export function exportDocument(d: ResumeData, t: TemplateId): string {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>${esc(d.name || "Resume")} – Resume</title><style>${RESUME_CSS}@page{size:A4;margin:10mm}body{margin:0}</style></head><body>${renderResumeHtml(d, t)}<script>window.onload=function(){setTimeout(function(){window.print()},300)}</script></body></html>`;
}

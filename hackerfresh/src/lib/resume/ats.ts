import type { ResumeData } from "./types";

export interface Check { label: string; pass: boolean; tip: string }
export interface AtsReport { score: number; checks: Check[]; keywordMatch: number | null; missing: string[]; matched: string[] }

const VERBS = "developed built designed implemented led managed created improved reduced increased analyzed analysed automated deployed optimized optimised launched collaborated delivered maintained tested migrated integrated configured wrote engineered achieved organized organised coordinated presented trained researched resolved streamlined supported".split(" ");
const STOP = new Set("the and for with you your our are will from that this have has was were not but all any can who per etc job role work team years year experience ability strong good including using use able must should such more than also their they them its into over out about across within preferred required requirements responsibilities skills knowledge candidate company looking join".split(" "));

const allText = (d: ResumeData) => [d.name, d.title, d.summary, d.skills, ...d.experience.flatMap((e) => [e.role, e.company, e.bullets]), ...d.projects.flatMap((p) => [p.name, p.tech, p.bullets]), ...d.education.flatMap((e) => [e.degree, e.school, e.details])].join(" ");
const bulletLines = (d: ResumeData) => [...d.experience.map((e) => e.bullets), ...d.projects.map((p) => p.bullets)].flatMap((b) => b.split("\n")).map((l) => l.replace(/^[\s\-•*]+/, "").trim()).filter(Boolean);

/** Transparent heuristic: 10 checks x 10 points. This is an ESTIMATE of resume hygiene, not an official ATS score. */
export function analyze(d: ResumeData, jobDescription = ""): AtsReport {
  const bl = bulletLines(d); const words = allText(d).split(/\s+/).filter(Boolean).length;
  const verbStart = bl.filter((l) => VERBS.includes(l.split(/\s+/)[0]?.toLowerCase().replace(/[^a-z]/g, "") ?? "")).length;
  const numeric = bl.filter((l) => /\d/.test(l)).length;
  const checks: Check[] = [
    { label: "Email address present", pass: /\S+@\S+\.\S+/.test(d.email), tip: "Add a professional email address." },
    { label: "Phone number present", pass: d.phone.replace(/\D/g, "").length >= 10, tip: "Add a phone number recruiters can call." },
    { label: "Summary of 30–600 characters", pass: d.summary.trim().length >= 30 && d.summary.length <= 600, tip: "Write a 2–3 line summary of your goal and strongest skills." },
    { label: "At least 5 skills listed", pass: d.skills.split(",").filter((s) => s.trim()).length >= 5, tip: "List 5+ skills separated by commas, using the names used in job posts." },
    { label: "Experience or projects included", pass: bl.length >= 2, tip: "Add internships, jobs or projects with bullet points." },
    { label: "Education included", pass: d.education.some((e) => e.degree.trim() && e.school.trim()), tip: "Add your degree and institution." },
    { label: "Bullets start with action verbs", pass: bl.length > 0 && verbStart / bl.length >= 0.5, tip: "Start bullets with verbs like Built, Developed, Reduced." },
    { label: "Includes numbers / measurable results", pass: numeric >= 2, tip: "Add numbers where true (e.g. 'reduced load time by 30%')." },
    { label: "Reasonable length (250–900 words)", pass: words >= 250 && words <= 900, tip: "Aim for one page (about 300–600 words) as a fresher." },
    { label: "Name and target title present", pass: d.name.trim().length > 1 && d.title.trim().length > 1, tip: "Add your name and the role you are targeting." },
  ];
  const score = checks.filter((c) => c.pass).length * 10;

  let keywordMatch: number | null = null; let missing: string[] = []; let matched: string[] = [];
  if (jobDescription.trim().length > 20) {
    const freq = new Map<string, number>();
    for (const w of jobDescription.toLowerCase().match(/[a-z][a-z+#.]{2,}/g) ?? []) if (!STOP.has(w)) freq.set(w, (freq.get(w) ?? 0) + 1);
    const kws = [...freq.entries()].sort((a, b) => b[1] - a[1]).slice(0, 25).map(([w]) => w);
    const text = allText(d).toLowerCase();
    matched = kws.filter((k) => text.includes(k)); missing = kws.filter((k) => !text.includes(k));
    keywordMatch = kws.length ? Math.round((matched.length / kws.length) * 100) : null;
  }
  return { score, checks, keywordMatch, missing, matched };
}

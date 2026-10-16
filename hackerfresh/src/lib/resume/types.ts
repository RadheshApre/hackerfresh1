export interface Exp { role: string; company: string; location: string; start: string; end: string; bullets: string }
export interface Edu { degree: string; school: string; year: string; details: string }
export interface Proj { name: string; tech: string; bullets: string }
export interface ResumeData {
  name: string; title: string; email: string; phone: string; location: string; links: string;
  summary: string; skills: string; experience: Exp[]; education: Edu[]; projects: Proj[];
}
export type TemplateId = "classic" | "modern" | "compact";
export const TEMPLATES: { id: TemplateId; name: string; blurb: string }[] = [
  { id: "classic", name: "Classic", blurb: "Centered header, black & white. Safest for any ATS." },
  { id: "modern", name: "Modern", blurb: "Left-aligned with a subtle accent colour. Still single-column." },
  { id: "compact", name: "Compact", blurb: "Smaller type to fit more on one page." },
];
export const emptyResume = (): ResumeData => ({
  name: "", title: "", email: "", phone: "", location: "", links: "", summary: "", skills: "",
  experience: [{ role: "", company: "", location: "", start: "", end: "", bullets: "" }],
  education: [{ degree: "", school: "", year: "", details: "" }],
  projects: [{ name: "", tech: "", bullets: "" }],
});

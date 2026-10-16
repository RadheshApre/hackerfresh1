import { z } from "zod";
const s = (n: number) => z.string().max(n);
export const resumeSchema = z.object({
  name: s(80), title: s(80), email: s(120), phone: s(40), location: s(80), links: s(300), summary: s(800), skills: s(600),
  experience: z.array(z.object({ role: s(80), company: s(80), location: s(80), start: s(30), end: s(30), bullets: s(1500) }).strict()).max(8),
  education: z.array(z.object({ degree: s(120), school: s(120), year: s(30), details: s(300) }).strict()).max(5),
  projects: z.array(z.object({ name: s(80), tech: s(150), bullets: s(1200) }).strict()).max(8),
}).strict();
export const exportBody = z.object({ resume: resumeSchema, template: z.enum(["classic", "modern", "compact"]) }).strict();

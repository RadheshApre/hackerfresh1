import type { ResumeData } from "./types";
// Clearly fictional demonstration data.
export const SAMPLE_RESUME: ResumeData = {
  name: "Aarav Sharma", title: "Junior Python Developer", email: "aarav.sample@example.com", phone: "+91 90000 00000",
  location: "Pune, Maharashtra", links: "linkedin.com/in/sample-profile | github.com/sample-profile",
  summary: "B.Tech Computer Science graduate with hands-on Python and SQL experience from internships and projects. Looking for an entry-level backend developer role.",
  skills: "Python, SQL, Flask, Git, REST APIs, PostgreSQL, Linux, Data Structures",
  experience: [{ role: "Software Intern", company: "Sample Tech Pvt Ltd", location: "Pune", start: "Jan 2026", end: "Jun 2026",
    bullets: "Built 6 REST API endpoints in Flask used by an internal dashboard\nReduced report generation time by 35% by optimising SQL queries\nWrote unit tests that raised coverage from 40% to 75%" }],
  education: [{ degree: "B.Tech, Computer Science", school: "Sample Institute of Technology", year: "2022 – 2026", details: "CGPA 8.2/10" }],
  projects: [{ name: "Expense Tracker API", tech: "Python, Flask, PostgreSQL", bullets: "Designed a REST API with JWT authentication and 12 endpoints\nDeployed on a cloud VM with automated daily backups" }],
};

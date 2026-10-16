import Thumb from "@/components/Thumb";
import { TEMPLATES } from "@/lib/resume/types";
import { PLANS, FREE_LIFETIME_USES } from "@/lib/plans";

const FEATURES = [
  ["📄", "ATS-friendly templates", "Single-column layouts with real text and standard headings, the way applicant tracking systems read best."],
  ["✅", "Resume checker", "10 transparent checks plus keyword match against any job description. An estimate, not an official ATS score."],
  ["⚡", "Live preview", "See your resume update as you type. Switch templates in one click without losing a word."],
  ["⬇️", "One-click PDF", "Download a clean A4 PDF with selectable text, ready to upload to job portals."],
  ["🔒", "Your data stays yours", "Your draft is saved in your own browser. We only receive it when you export."],
  ["🇮🇳", "Made for freshers", "Prompts for projects, internships and skills, so a fresh graduate’s resume doesn’t look empty."],
];
const FAQ = [
  ["Is it really free to start?", `Yes. Build and preview as much as you like, and get ${FREE_LIFETIME_USES} free PDF downloads with a free account. After that, Starter is ₹${PLANS.starter_monthly.amountPaise / 100}/month.`],
  ["Will this get me past every ATS?", "No tool can promise that. We use simple, widely compatible layouts and check common issues, but employers’ systems differ. Treat the checker score as guidance."],
  ["Do you write false experience for me?", "No. You enter your real details, and the checker only gives suggestions. Please keep your resume truthful."],
  ["How do I pay?", "By UPI. Pay to the UPI QR on the pricing page and submit your reference number. We verify it and activate your plan."],
];

export default function Home() {
  return (
    <main>
      <div className="container">
        <section className="hero">
          <div>
            <span className="badge">✨ Free to start · No card needed</span>
            <h1 className="big">Build a resume that <span className="grad">recruiters can actually read.</span></h1>
            <p className="lead">Pick a clean ATS-friendly template, fill in your details, check your resume against a job description, and download a PDF in minutes.</p>
            <div className="cta"><a className="btn btn-primary" href="/builder">Build my resume free →</a><a className="btn" href="#templates">See templates</a></div>
            <p className="note">{FREE_LIFETIME_USES} free downloads with a free account. Building and previewing is always free.</p>
          </div>
          <div className="float"><Thumb template="modern" scale={0.62} /></div>
        </section>

        <section className="section" id="features"><h2>Everything you need for a first resume</h2><p className="sub">No design skills required.</p>
          <div className="grid3">{FEATURES.map(([i, t, d]) => <div className="card" key={t}><div className="ico">{i}</div><h3>{t}</h3><p>{d}</p></div>)}</div></section>

        <section className="section" id="templates"><h2>Templates</h2><p className="sub">All three are single-column and use standard fonts. Previews use sample data.</p>
          <div className="thumbs">{TEMPLATES.map((t) => <div key={t.id}><Thumb template={t.id} scale={0.34} /><h3 style={{ marginBottom: 2 }}>{t.name}</h3><p className="note" style={{ marginTop: 0 }}>{t.blurb}</p></div>)}</div></section>

        <section className="section"><h2>How it works</h2><p className="sub">From blank page to PDF in three steps.</p>
          <div className="grid3">{[["STEP 1", "Fill in your details", "Add contact info, skills, internships, projects and education."], ["STEP 2", "Check and improve", "Paste a job description to see which keywords you’re missing."], ["STEP 3", "Download", "Export a clean A4 PDF and apply with confidence."]].map(([s, t, d]) => <div className="card" key={s}><div className="step">{s}</div><h3>{t}</h3><p>{d}</p></div>)}</div></section>

        <section className="section" id="pricing"><h2>Simple pricing</h2><p className="sub">Try first. Pay only if it helps.</p>
          <div className="price">
            <div className="card"><h3>Free</h3><div className="amt">₹0</div><ul className="ticks"><li>Unlimited editing &amp; live preview</li><li>All 3 templates</li><li>Resume checker</li><li>{FREE_LIFETIME_USES} PDF downloads</li></ul><a className="btn" href="/builder">Start free</a></div>
            <div className="card hl"><h3>Starter</h3><div className="amt">₹{PLANS.starter_monthly.amountPaise / 100}<small> / month</small></div><ul className="ticks"><li>Up to {PLANS.starter_monthly.monthlyToolUses} PDF downloads per month</li><li>Everything in Free</li><li>Pay by UPI</li></ul><a className="btn btn-primary" href="/pricing">Get Starter</a></div>
          </div></section>

        <section className="section"><h2>Questions</h2><div style={{ maxWidth: 760, marginTop: 20 }}>{FAQ.map(([q, a]) => <details className="faq" key={q}><summary>{q}</summary><p>{a}</p></details>)}</div></section>
      </div>
    </main>);
}

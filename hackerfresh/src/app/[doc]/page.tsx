import { notFound } from "next/navigation";

const DOCS: Record<string, { title: string; body: string[] }> = {
  privacy: { title: "Privacy Policy", body: [
    "DRAFT — have this reviewed by a qualified professional before relying on it.",
    "Your resume draft is stored in your own browser. When you download a PDF, your resume details are sent to our server to generate the file and are not stored by the export feature.",
    "We store your account email, plan and payment-submission records. We count visitors with a random cookie id and the page visited; we do not store IP addresses.",
    "Payments are made by UPI. We never see your UPI PIN. Contact us to delete your account and data."] },
  terms: { title: "Terms of Service", body: [
    "DRAFT — have this reviewed by a qualified professional before relying on it.",
    "HackerFresh provides resume-building tools. We do not guarantee interviews, jobs, or any result from applicant tracking systems. The resume checker is an estimate.",
    "You are responsible for the accuracy of your resume. Plans have fair-use monthly limits and are not unlimited."] },
  refunds: { title: "Refund & Cancellation Policy", body: [
    "DRAFT — set your own policy and have it reviewed before launch.",
    "Starter is a one-month purchase and does not renew automatically in manual UPI mode.",
    "If you were charged but your plan was not activated, contact us with your UTR number and we will fix it or refund you."] },
};
export function generateStaticParams() { return Object.keys(DOCS).map((doc) => ({ doc })); }
export const dynamicParams = false;

export default async function Doc({ params }: { params: Promise<{ doc: string }> }) {
  const { doc } = await params; const d = DOCS[doc]; if (!d) notFound();
  return <main className="container section" style={{ maxWidth: 760 }}><h1>{d.title}</h1>{d.body.map((p, i) => <p key={i} className={i === 0 ? "warn" : ""}>{p}</p>)}</main>;
}

import QRCode from "qrcode";
import { upiDetails, upiLink } from "@/lib/manual-upi";
import { getPlan } from "@/lib/plans";
import UtrForm from "./UtrForm";

export default async function ManualPay({ planId }: { planId: string }) {
  const plan = getPlan(planId); const link = upiLink(planId); const { vpa, payee } = upiDetails();
  if (!plan || !link) return <p role="status">UPI payment details are not configured yet.</p>;
  const qr = await QRCode.toDataURL(link, { margin: 1, width: 220 });
  return (
    <details style={{ marginTop: 8 }}>
      <summary style={{ cursor: "pointer", fontWeight: 600 }}>Pay ₹{(plan.amountPaise / 100).toLocaleString("en-IN")} with UPI</summary>
      <ol style={{ paddingLeft: 18 }}>
        <li>Scan this QR with any UPI app (the amount is pre-filled), or on mobile <a href={link}>open your UPI app</a>.</li>
        <li>Or pay manually to <b>{vpa}</b> (name: {payee}). Pay exactly ₹{(plan.amountPaise / 100).toLocaleString("en-IN")}.</li>
        <li>After paying, enter the 12-digit <b>UTR / UPI reference number</b> from your app below.</li>
      </ol>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={qr} alt={`UPI QR for ${plan.label}`} width={220} height={220} style={{ background: "white", borderRadius: 8 }} />
      <UtrForm planId={planId} />
      <p style={{ fontSize: 12, opacity: 0.75 }}>Access is switched on after we verify the payment in our bank/UPI records, usually within a few hours. This is a manual process.</p>
    </details>
  );
}

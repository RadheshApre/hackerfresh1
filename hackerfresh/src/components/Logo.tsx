export default function Logo() {
  return (
    <a href="/" className="logo" aria-label="HackerFresh home">
      <svg width="30" height="30" viewBox="0 0 32 32" aria-hidden="true"><defs><linearGradient id="lg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#7c5cff" /><stop offset="1" stopColor="#22d3ee" /></linearGradient></defs>
        <rect width="32" height="32" rx="9" fill="url(#lg)" /><path d="M10 9v14M22 9v14M10 16h12" stroke="#fff" strokeWidth="3" strokeLinecap="round" /></svg>
      <span>Hacker<b>Fresh</b></span>
    </a>);
}

export default function Footer() {
  return (
    <footer className="footer"><div className="container">
      <div>© {new Date().getFullYear()} HackerFresh. We can’t guarantee interviews, jobs or any ATS result.</div>
      <div><a href="/privacy">Privacy</a><a href="/terms">Terms</a><a href="/refunds">Refunds</a><a href="/pricing">Pricing</a></div>
    </div></footer>);
}

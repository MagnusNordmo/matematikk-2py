import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Oppgaver og hint – Matematikk 2PY",
  description: "Kontrollapp for gjennomgang av oppgaver, hint og fasiter.",
};

export default function Kontrollapp() {
  return (
    <main className="review-shell">
      <iframe
        className="review-frame"
        src="/oppgaver-og-hint.html"
        title="Oppgavegjennomgang for matematikk 2PY"
      />
    </main>
  );
}

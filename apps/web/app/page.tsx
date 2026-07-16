import Link from 'next/link';
import { Button } from '@/components/ui';

export default function LandingPage() {
  return (
    <div className="relative overflow-hidden">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,_rgba(14,116,144,0.18),_transparent_55%),linear-gradient(180deg,#f8fafc_0%,#eef6f8_100%)]" />
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <span className="font-display text-2xl text-primary">CloserAI</span>
        <Link href="/login" className="text-sm font-medium text-slate-700 hover:text-primary">
          Sign in
        </Link>
      </header>

      <section className="mx-auto grid max-w-6xl gap-10 px-6 pb-20 pt-10 lg:grid-cols-2 lg:items-center">
        <div>
          <h1 className="font-display text-5xl leading-tight tracking-tight text-slate-900 md:text-6xl">
            CloserAI
          </h1>
          <p className="mt-4 max-w-xl text-lg text-slate-600">
            An AI sales representative that calls leads, qualifies prospects, handles objections,
            books meetings, and delivers structured call intelligence — powered exclusively by
            Retell AI.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/login">
              <Button className="h-11 px-5">Start Demo</Button>
            </Link>
            <a href="#capabilities">
              <Button variant="secondary" className="h-11 px-5">
                See capabilities
              </Button>
            </a>
          </div>
        </div>
        <div className="relative min-h-[320px] overflow-hidden rounded-2xl border border-slate-200 bg-slate-900 shadow-xl">
          <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(14,116,144,0.45),rgba(15,118,110,0.25))]" />
          <div className="relative space-y-4 p-8 text-slate-100">
            <p className="text-sm uppercase tracking-[0.2em] text-teal-200">Live call intelligence</p>
            <p className="font-display text-3xl">Qualify. Adapt. Close.</p>
            <ul className="space-y-3 text-sm text-slate-200">
              <li>Outbound voice conversations via Retell</li>
              <li>BANT qualification & objection capture</li>
              <li>Meeting booking and human handoff</li>
              <li>Post-call analytics for sales managers</li>
            </ul>
          </div>
        </div>
      </section>

      <section id="capabilities" className="border-t border-slate-200 bg-white/70 py-16">
        <div className="mx-auto grid max-w-6xl gap-8 px-6 md:grid-cols-3">
          {[
            {
              title: 'AI-led outbound calls',
              body: 'Retell manages telephony, turn-taking, and consultative sales conversation flow.',
            },
            {
              title: 'Objection intelligence',
              body: 'Structured objection categories, resolution tracking, and competitor mentions.',
            },
            {
              title: 'Meeting booking & handoff',
              body: 'Book demos mid-call or warm-transfer high-intent prospects to a human rep.',
            },
          ].map((item) => (
            <div key={item.title}>
              <h2 className="font-display text-xl text-slate-900">{item.title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">{item.body}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

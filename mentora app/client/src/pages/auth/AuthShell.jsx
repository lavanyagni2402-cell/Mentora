import { Logo } from '../../components/Layout';

export default function AuthShell({ title, sub, children }) {
  return (
    <div className="grid min-h-full md:grid-cols-2">
      <section className="flex flex-col justify-between gap-8 bg-accent px-6 py-8 text-on-accent md:px-14 md:py-12">
        <Logo inverted />
        <div className="hidden md:block">
          <p className="eyebrow mb-3 !text-on-accent/80">Your study workspace</p>
          <h1 className="text-[clamp(2.4rem,1.6rem+3vw,4rem)] leading-none">Plan it. Study it. Track it.</h1>
        </div>
        <ul className="hidden max-w-[36ch] gap-3 font-medium md:grid">
          <li>Every assignment and deadline, organised by subject</li>
          <li>AI that tells you what to study next, and why</li>
          <li>Focus sessions and progress you can see</li>
        </ul>
      </section>
      <section className="flex w-full max-w-[460px] flex-col justify-center gap-5 justify-self-center px-4 py-10 md:px-8">
        <div><h2 className="text-[1.7rem]">{title}</h2>{sub && <p className="mt-1.5 text-muted">{sub}</p>}</div>
        {children}
      </section>
    </div>
  );
}

import Link from "next/link";
import { buyCredits } from "@/app/actions/credits";
import { requireUser } from "@/lib/auth/user";
import {
  CREDIT_PACKS,
  CREDITS_PER_APPLICATION,
  FREE_CREDITS,
  RUPEES_PER_CREDIT,
  applicationsFor,
  creditHistory,
  getCredits,
  rupees,
} from "@/lib/credits";

export default async function CreditsPage({ searchParams }: PageProps<"/credits">) {
  const user = await requireUser();
  const { bought, needed } = await searchParams;
  const [credits, history] = await Promise.all([getCredits(user.id), creditHistory(user.id)]);
  const date = (d: Date) => d.toLocaleDateString("en", { day: "numeric", month: "short", year: "numeric" });

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold">Credits</h1>
        <p className="text-muted">
          Each job JobPilot applies to uses {CREDITS_PER_APPLICATION} credits. One credit costs ₹{RUPEES_PER_CREDIT}.
          Everyone starts with {FREE_CREDITS} free credits.
        </p>
      </div>

      {bought && (
        <p className="rounded-lg bg-accent-soft px-3 py-2 text-sm">
          Added {bought} credits to your account.{" "}
          <Link href="/jobs?auto=1" className="underline">Apply to jobs</Link>
        </p>
      )}
      {needed && !bought && (
        <p className="rounded-lg bg-warn-soft px-3 py-2 text-sm text-warn">
          You need at least {CREDITS_PER_APPLICATION} credits for JobPilot to apply to a job. Buy more below.
        </p>
      )}

      <div className="card flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm text-muted">Your balance</p>
          <p className="text-4xl font-bold">{credits}</p>
          <p className="text-sm text-muted">
            Enough for {applicationsFor(credits)} {applicationsFor(credits) === 1 ? "application" : "applications"}
          </p>
        </div>
        {credits < CREDITS_PER_APPLICATION && (
          <p className="rounded-lg bg-warn-soft px-3 py-2 text-sm text-warn">
            Auto-apply is paused until you buy more credits.
          </p>
        )}
      </div>

      <div className="flex flex-col gap-3">
        <div>
          <h2 className="text-lg font-semibold">Buy credits</h2>
          <p className="rounded-lg bg-accent-soft px-3 py-2 text-sm">
            <span className="font-semibold">Test mode:</span> no money is taken. Pressing Buy adds the credits straight
            away, so you can try the whole flow. Real payments come later.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {CREDIT_PACKS.map((pack) => (
            <form key={pack} action={buyCredits} className="card flex flex-col items-center gap-1 p-4 text-center">
              <input type="hidden" name="credits" value={pack} />
              <p className="text-2xl font-bold">{pack}</p>
              <p className="text-sm text-muted">credits</p>
              <p className="text-xs text-muted">{applicationsFor(pack)} applications</p>
              <button className="btn mt-2 w-full whitespace-nowrap px-2 py-1.5">Buy for {rupees(pack)}</button>
            </form>
          ))}
        </div>
      </div>

      <div className="card flex flex-col gap-3">
        <h2 className="font-semibold">History</h2>
        <ul className="flex flex-col divide-y divide-line text-sm">
          {history.map((t) => (
            <li key={t.id} className="flex items-center justify-between gap-3 py-2">
              <div className="min-w-0">
                <p className="truncate">{t.kind === "application" ? `Applied: ${t.description}` : t.description}</p>
                <p className="text-xs text-muted">{date(t.createdAt)}</p>
              </div>
              <span className={`font-semibold ${t.amount < 0 ? "text-warn" : "text-accent"}`}>
                {t.amount > 0 ? `+${t.amount}` : t.amount}
              </span>
            </li>
          ))}
          <li className="flex items-center justify-between gap-3 py-2">
            <p>Free credits when you joined</p>
            <span className="font-semibold text-accent">+{FREE_CREDITS}</span>
          </li>
        </ul>
      </div>
    </div>
  );
}

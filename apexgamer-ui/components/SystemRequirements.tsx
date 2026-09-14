"use client";

import { useState } from "react";
import { RequirementRow, SystemRequirements as Requirements } from "@/lib/types";

const OS_ORDER = ["windows", "mac", "linux"] as const;

type OsKey = (typeof OS_ORDER)[number];

const OS_LABELS: Record<OsKey, string> = {
  windows: "Windows",
  mac: "macOS",
  linux: "Linux",
};

export default function SystemRequirements({
  platforms,
  requirements,
}: {
  platforms: string[];
  requirements: Requirements | null;
}) {
  const availableOs = OS_ORDER.filter((os) => requirements?.[os]);
  const [activeOs, setActiveOs] = useState<OsKey>(availableOs[0] ?? "windows");

  if (!platforms.length && !availableOs.length) return null;

  // A game can drop off Steam (or never have been on it) while RAWG still
  // knows its console platforms, so the two halves render independently.
  const tier = requirements?.[availableOs.includes(activeOs) ? activeOs : availableOs[0]];

  return (
    <section className="mb-8">
      <h2 className="mb-3.5 text-[1.1rem] font-bold">System Requirements</h2>

      {platforms.length > 0 && (
        <div className="mb-4">
          <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-text-dim">
            Available on
          </h3>
          <div className="flex flex-wrap gap-2">
            {platforms.map((platform) => (
              <span
                key={platform}
                className="rounded-full border border-border bg-surface px-3 py-1 text-[0.76rem] font-semibold text-text-dim"
              >
                {platform}
              </span>
            ))}
          </div>
        </div>
      )}

      {availableOs.length > 0 && tier ? (
        <>
          {availableOs.length > 1 && (
            <div className="mb-3 flex gap-2">
              {availableOs.map((os) => (
                <button
                  key={os}
                  onClick={() => setActiveOs(os)}
                  aria-pressed={os === activeOs}
                  className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors ${
                    os === activeOs
                      ? "border-accent-soft bg-accent-soft text-accent-text"
                      : "border-border bg-surface text-text-dim hover:bg-surface-hover hover:text-text"
                  }`}
                >
                  {OS_LABELS[os]}
                </button>
              ))}
            </div>
          )}

          <div
            className={`grid grid-cols-1 gap-4 ${tier.recommended?.length ? "sm:grid-cols-2" : ""}`}
          >
            {tier.minimum?.length ? <SpecList title="Minimum" rows={tier.minimum} /> : null}
            {tier.recommended?.length ? (
              <SpecList title="Recommended" rows={tier.recommended} />
            ) : null}
          </div>
        </>
      ) : (
        <p className="text-sm text-text-dim">
          No published PC requirements for this game.
        </p>
      )}
    </section>
  );
}

function SpecList({ title, rows }: { title: string; rows: RequirementRow[] }) {
  // Steam's "Additional Notes" ranges from a one-line caveat to several
  // paragraphs of licensing boilerplate, so it is split out below the specs
  // and clamped rather than sitting inline at full length.
  const specs = rows.filter((row) => row.label && !isNote(row));
  const notes = rows.filter((row) => !row.label || isNote(row));

  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <h3 className="mb-2.5 text-xs font-bold uppercase tracking-wide text-text-dim">{title}</h3>
      <dl className="space-y-2 text-sm">
        {specs.map((row, i) => (
          <div key={i} className="grid grid-cols-[minmax(72px,auto)_1fr] gap-3">
            <dt className="text-text-dim">{row.label}</dt>
            <dd className="font-medium leading-snug">{row.value}</dd>
          </div>
        ))}
      </dl>
      {notes.length > 0 && (
        <div className="mt-3 border-t border-border pt-3">
          {notes.map((row, i) => (
            <p key={i} className="line-clamp-3 text-xs leading-relaxed text-text-dim">
              {row.value}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}

const isNote = (row: RequirementRow) => row.label?.toLowerCase().includes("note") ?? false;


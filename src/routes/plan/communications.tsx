import { usePlanStore } from "@/lib/store/plan";
import type { PaceMethod } from "@/types/plan";

const PACE_TIERS: { key: "primary" | "alternate" | "contingency" | "emergency"; label: string }[] = [
  { key: "primary", label: "Primary" },
  { key: "alternate", label: "Alternate" },
  { key: "contingency", label: "Contingency" },
  { key: "emergency", label: "Emergency" },
];

function PaceTierCard({ label, tier }: { label: string; tier: PaceMethod }) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <p className="text-sm font-medium text-muted-foreground mb-2">{label}</p>
      <p className="font-medium text-foreground">{tier.method}</p>
      {tier.contact && (
        <p className="text-sm text-muted-foreground mt-1">
          Contact: {tier.contact}
        </p>
      )}
      {tier.notes && (
        <p className="text-sm text-muted-foreground mt-1">{tier.notes}</p>
      )}
    </div>
  );
}

export default function CommunicationsPage() {
  const plan = usePlanStore((s) => s.repo.communicationPlan);

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-foreground mb-6">
        Communications Plan
      </h1>

      {!plan ? (
        <p className="text-muted-foreground">No communications plan data yet.</p>
      ) : (
        <div className="space-y-6">
          <div>
            <h2 className="text-lg font-semibold text-foreground mb-3">
              PACE Tiers
            </h2>
            <div className="space-y-3">
              {PACE_TIERS.map(({ key, label }) => (
                <PaceTierCard key={key} label={label} tier={plan[key]} />
              ))}
            </div>
          </div>

          {plan.outOfTownContact && (
            <div className="rounded-lg border border-border bg-card p-4">
              <p className="text-sm font-medium text-muted-foreground mb-2">
                Out-of-Town Contact
              </p>
              <p className="font-medium text-foreground">
                {plan.outOfTownContact.name}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                {plan.outOfTownContact.phone}
              </p>
              {plan.outOfTownContact.relation && (
                <p className="text-sm text-muted-foreground">
                  {plan.outOfTownContact.relation}
                </p>
              )}
            </div>
          )}

          {plan.radioFrequency && (
            <div className="rounded-lg border border-border bg-card p-4">
              <p className="text-sm font-medium text-muted-foreground mb-1">
                Radio Frequency
              </p>
              <p className="text-foreground">{plan.radioFrequency}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

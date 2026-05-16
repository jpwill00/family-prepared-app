import { usePlanStore } from "@/lib/store/plan";
import type { UtilityShutoff } from "@/types/plan";

const UTILITY_LABELS: Record<UtilityShutoff["utility"], string> = {
  water: "Water",
  gas: "Gas",
  electric: "Electric",
  other: "Other",
};

function ShutoffCard({ shutoff }: { shutoff: UtilityShutoff }) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <p className="font-medium text-foreground">
        {UTILITY_LABELS[shutoff.utility]}
      </p>
      <p className="text-sm text-muted-foreground mt-1">
        Location: {shutoff.location}
      </p>
      {shutoff.instructions && (
        <p className="text-sm text-muted-foreground mt-1">
          {shutoff.instructions}
        </p>
      )}
      {shutoff.toolRequired && (
        <p className="text-sm text-muted-foreground mt-1">
          Tool required: {shutoff.toolRequired}
        </p>
      )}
    </div>
  );
}

export default function UtilitiesPage() {
  const utilityShutoffs = usePlanStore((s) => s.repo.utilityShutoffs);

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-foreground mb-6">
        Utility Shutoffs
      </h1>

      {!utilityShutoffs ? (
        <p className="text-muted-foreground">No utility shutoff data yet.</p>
      ) : (
        <div className="space-y-6">
          {utilityShutoffs.utilityProvider && (
            <div className="rounded-lg border border-border bg-card p-4">
              <p className="text-sm font-medium text-muted-foreground mb-2">
                Utility Providers
              </p>
              <div className="space-y-1">
                {utilityShutoffs.utilityProvider.water && (
                  <p className="text-sm text-foreground">
                    Water: {utilityShutoffs.utilityProvider.water}
                  </p>
                )}
                {utilityShutoffs.utilityProvider.gas && (
                  <p className="text-sm text-foreground">
                    Gas: {utilityShutoffs.utilityProvider.gas}
                  </p>
                )}
                {utilityShutoffs.utilityProvider.electric && (
                  <p className="text-sm text-foreground">
                    Electric: {utilityShutoffs.utilityProvider.electric}
                  </p>
                )}
              </div>
            </div>
          )}

          {utilityShutoffs.shutoffs.length === 0 ? (
            <p className="text-muted-foreground">No shutoffs added yet.</p>
          ) : (
            <div className="space-y-4">
              {utilityShutoffs.shutoffs.map((shutoff) => (
                <ShutoffCard key={shutoff.id} shutoff={shutoff} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

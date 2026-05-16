import { usePlanStore } from "@/lib/store/plan";
import type { EvacuationRoute, RendezvousPoint } from "@/types/plan";

function RouteCard({ label, route }: { label: string; route: EvacuationRoute }) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <p className="text-sm font-medium text-muted-foreground mb-2">{label}</p>
      <p className="font-medium text-foreground">{route.label}</p>
      {route.description && (
        <p className="text-sm text-muted-foreground mt-1">{route.description}</p>
      )}
      {route.destinationAddress && (
        <p className="text-sm text-muted-foreground mt-1">
          Destination: {route.destinationAddress}
        </p>
      )}
    </div>
  );
}

function RendezvousCard({ point }: { point: RendezvousPoint }) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <p className="font-medium text-foreground">{point.label}</p>
      {point.address && (
        <p className="text-sm text-muted-foreground mt-1">{point.address}</p>
      )}
      {point.notes && (
        <p className="text-sm text-muted-foreground mt-1">{point.notes}</p>
      )}
    </div>
  );
}

export default function EvacuationPage() {
  const plan = usePlanStore((s) => s.repo.evacuationPlan);

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-foreground mb-6">
        Evacuation Plan
      </h1>

      {!plan ? (
        <p className="text-muted-foreground">No evacuation plan data yet.</p>
      ) : (
        <div className="space-y-6">
          <div>
            <h2 className="text-lg font-semibold text-foreground mb-3">Routes</h2>
            <div className="space-y-3">
              <RouteCard label="Primary Route" route={plan.primaryRoute} />
              {plan.alternateRoute && (
                <RouteCard label="Alternate Route" route={plan.alternateRoute} />
              )}
            </div>
          </div>

          <div>
            <h2 className="text-lg font-semibold text-foreground mb-3">
              Rendezvous Points
            </h2>
            {plan.rendezvousPoints.length === 0 ? (
              <p className="text-muted-foreground">No rendezvous points added yet.</p>
            ) : (
              <div className="space-y-3">
                {plan.rendezvousPoints.map((point, i) => (
                  <RendezvousCard key={i} point={point} />
                ))}
              </div>
            )}
          </div>

          {plan.outOfAreaContact && (
            <div className="rounded-lg border border-border bg-card p-4">
              <p className="text-sm font-medium text-muted-foreground mb-2">
                Out-of-Area Contact
              </p>
              <p className="font-medium text-foreground">
                {plan.outOfAreaContact.name}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                {plan.outOfAreaContact.phone}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

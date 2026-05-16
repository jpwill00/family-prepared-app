import { usePlanStore } from "@/lib/store/plan";
import type { HouseholdMember } from "@/types/plan";

function MemberCard({ member }: { member: HouseholdMember }) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <p className="font-medium text-foreground">{member.name}</p>
      {member.role && (
        <p className="text-sm text-muted-foreground">{member.role}</p>
      )}
    </div>
  );
}

export default function HouseholdPage() {
  const household = usePlanStore((s) => s.repo.household);

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-foreground mb-6">Household</h1>

      {!household ? (
        <p className="text-muted-foreground">No household data yet.</p>
      ) : (
        <div className="space-y-6">
          {household.homeAddress && (
            <div className="rounded-lg border border-border bg-card p-4">
              <p className="text-sm font-medium text-muted-foreground mb-1">
                Home Address
              </p>
              <p className="text-foreground">{household.homeAddress}</p>
            </div>
          )}

          {typeof household.petCount === "number" && (
            <div className="rounded-lg border border-border bg-card p-4">
              <p className="text-sm font-medium text-muted-foreground mb-1">
                Pets
              </p>
              <p className="text-foreground">{household.petCount}</p>
            </div>
          )}

          <div>
            <h2 className="text-lg font-semibold text-foreground mb-3">
              Members
            </h2>
            {household.members.length === 0 ? (
              <p className="text-muted-foreground">No members added yet.</p>
            ) : (
              <div className="space-y-3">
                {household.members.map((member) => (
                  <MemberCard key={member.id} member={member} />
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

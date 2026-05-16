import { usePlanStore } from "@/lib/store/plan";
import type { InventoryItem } from "@/types/plan";

const CATEGORY_LABELS: Record<InventoryItem["category"], string> = {
  "go-bag": "Go Bag",
  water: "Water",
  food: "Food",
  medication: "Medication",
  equipment: "Equipment",
  other: "Other",
};

function ItemRow({ item }: { item: InventoryItem }) {
  return (
    <div className="flex items-start justify-between py-3 border-b border-border last:border-0">
      <div>
        <p className="font-medium text-foreground">{item.name}</p>
        {item.expirationDate && (
          <p className="text-sm text-muted-foreground">
            Expires: {item.expirationDate}
          </p>
        )}
      </div>
      <div className="text-right ml-4">
        <p className="text-foreground">
          {item.quantity}
          {item.unit ? ` ${item.unit}` : ""}
        </p>
      </div>
    </div>
  );
}

export default function InventoryPage() {
  const inventory = usePlanStore((s) => s.repo.resourceInventory);

  if (!inventory) {
    return (
      <div className="p-6 max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold text-foreground mb-6">
          Resource Inventory
        </h1>
        <p className="text-muted-foreground">No inventory data yet.</p>
      </div>
    );
  }

  const categories = Object.keys(CATEGORY_LABELS) as InventoryItem["category"][];
  const grouped = categories
    .map((cat) => ({
      category: cat,
      label: CATEGORY_LABELS[cat],
      items: inventory.items.filter((item) => item.category === cat),
    }))
    .filter((g) => g.items.length > 0);

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-foreground mb-6">
        Resource Inventory
      </h1>

      <div className="space-y-6">
        {inventory.waterGallonsPerPersonPerDay !== undefined && (
          <div className="rounded-lg border border-border bg-card p-4">
            <p className="text-sm font-medium text-muted-foreground mb-1">
              Water per person per day
            </p>
            <p className="text-foreground">
              {inventory.waterGallonsPerPersonPerDay} gallons
            </p>
          </div>
        )}

        {grouped.length === 0 ? (
          <p className="text-muted-foreground">No items added yet.</p>
        ) : (
          grouped.map(({ category, label, items }) => (
            <div key={category} className="rounded-lg border border-border bg-card p-4">
              <h2 className="text-lg font-semibold text-foreground mb-2">
                {label}
              </h2>
              {items.map((item) => (
                <ItemRow key={item.id} item={item} />
              ))}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

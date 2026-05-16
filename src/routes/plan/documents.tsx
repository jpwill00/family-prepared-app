import { usePlanStore } from "@/lib/store/plan";
import type { LegalDocument } from "@/types/plan";

const DOCUMENT_TYPE_LABELS: Record<LegalDocument["type"], string> = {
  passport: "Passport",
  "birth-certificate": "Birth Certificate",
  "drivers-license": "Driver's License",
  insurance: "Insurance",
  will: "Will",
  "medical-power-of-attorney": "Medical Power of Attorney",
  deed: "Deed",
  "vehicle-title": "Vehicle Title",
  other: "Other",
};

function DocumentCard({ doc }: { doc: LegalDocument }) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <p className="font-medium text-foreground">
        {DOCUMENT_TYPE_LABELS[doc.type]}
      </p>
      {doc.owner && (
        <p className="text-sm text-muted-foreground mt-1">Owner: {doc.owner}</p>
      )}
      {doc.location && (
        <p className="text-sm text-muted-foreground mt-1">
          Location: {doc.location}
        </p>
      )}
      {doc.expirationDate && (
        <p className="text-sm text-muted-foreground mt-1">
          Expires: {doc.expirationDate}
        </p>
      )}
      {doc.notes && (
        <p className="text-sm text-muted-foreground mt-1">{doc.notes}</p>
      )}
    </div>
  );
}

export default function DocumentsPage() {
  const legalDocuments = usePlanStore((s) => s.repo.legalDocuments);

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-foreground mb-6">
        Important Documents
      </h1>

      {!legalDocuments ? (
        <p className="text-muted-foreground">No documents data yet.</p>
      ) : (
        <div className="space-y-4">
          {legalDocuments.safeLocation && (
            <div className="rounded-lg border border-border bg-card p-4">
              <p className="text-sm font-medium text-muted-foreground mb-1">
                Safe location
              </p>
              <p className="text-foreground">{legalDocuments.safeLocation.value}</p>
            </div>
          )}

          {legalDocuments.documents.length === 0 ? (
            <p className="text-muted-foreground">No documents added yet.</p>
          ) : (
            legalDocuments.documents.map((doc) => (
              <DocumentCard key={doc.id} doc={doc} />
            ))
          )}
        </div>
      )}
    </div>
  );
}

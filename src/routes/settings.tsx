import DriveConnect from "@/components/settings/DriveConnect";
import PassphraseForm from "@/components/settings/PassphraseForm";

export default function SettingsPage() {
  return (
    <div className="max-w-xl p-6">
      <h1 className="mb-6 text-2xl font-bold text-foreground">Settings</h1>
      <div className="flex flex-col gap-4">
        <PassphraseForm />
        <DriveConnect />
      </div>
    </div>
  );
}

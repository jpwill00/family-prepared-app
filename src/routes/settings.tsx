import DriveConnect from "@/components/settings/DriveConnect";

export default function SettingsPage() {
  return (
    <div className="max-w-xl p-6">
      <h1 className="mb-6 text-2xl font-bold text-foreground">Settings</h1>
      <DriveConnect />
    </div>
  );
}

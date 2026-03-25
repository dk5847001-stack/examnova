import { useEffect, useState } from "react";
import { EmptyStateCard } from "../../components/ui/EmptyStateCard.jsx";
import { FormSwitchRow } from "../../components/ui/FormSwitchRow.jsx";
import { LoadingCard } from "../../components/ui/LoadingCard.jsx";
import { SectionHeader } from "../../components/ui/SectionHeader.jsx";
import { useAuth } from "../../hooks/useAuth.js";

export function AdminSettingsPage() {
  const { user, updateSettings } = useAuth();
  const [settings, setSettings] = useState({
    emailNotifications: true,
    productUpdates: true,
    marketplaceAlerts: true,
  });
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState({ type: "", message: "" });

  useEffect(() => {
    setSettings({
      emailNotifications: user?.preferences?.emailNotifications ?? true,
      productUpdates: user?.preferences?.productUpdates ?? true,
      marketplaceAlerts: user?.preferences?.marketplaceAlerts ?? true,
    });
  }, [user]);

  async function handleSubmit(event) {
    event.preventDefault();
    setFeedback({ type: "", message: "" });
    setIsSaving(true);

    try {
      await updateSettings(settings);
      setFeedback({ type: "success", message: "Admin settings saved successfully." });
    } catch (error) {
      setFeedback({ type: "error", message: error.message || "Unable to save admin settings." });
    } finally {
      setIsSaving(false);
    }
  }

  if (!user) {
    return <LoadingCard message="Loading admin settings..." />;
  }

  return (
    <section className="stack-section">
      <SectionHeader
        eyebrow="Admin settings"
        title="Operational preferences"
        description="Control how ExamNova AI notifies you about platform operations, marketplace movement, and product updates."
      />
      <form className="detail-card settings-form" onSubmit={handleSubmit}>
        <FormSwitchRow
          label="Email notifications"
          description="Receive important admin account, security, and platform notices by email."
          checked={settings.emailNotifications}
          name="emailNotifications"
          onChange={(event) => setSettings((current) => ({ ...current, emailNotifications: event.target.checked }))}
        />
        <FormSwitchRow
          label="Product updates"
          description="Get alerts when major product capabilities or admin workflows change."
          checked={settings.productUpdates}
          name="productUpdates"
          onChange={(event) => setSettings((current) => ({ ...current, productUpdates: event.target.checked }))}
        />
        <FormSwitchRow
          label="Marketplace alerts"
          description="Stay informed about buying, selling, listing, and operational marketplace events."
          checked={settings.marketplaceAlerts}
          name="marketplaceAlerts"
          onChange={(event) => setSettings((current) => ({ ...current, marketplaceAlerts: event.target.checked }))}
        />
        {feedback.message ? (
          <p className={feedback.type === "error" ? "form-error" : "form-success"}>{feedback.message}</p>
        ) : null}
        <button className="button primary" disabled={isSaving} type="submit">
          {isSaving ? "Saving..." : "Save admin settings"}
        </button>
      </form>
      <div className="two-column-grid">
        <EmptyStateCard
          title="Moderation rules"
          description="Centralized moderation policies, auto-review thresholds, and trust safeguards can expand here in a future phase."
        />
        <EmptyStateCard
          title="Finance operations"
          description="Dedicated admin payout controls and finance automation settings can live here as ExamNova AI grows."
        />
      </div>
    </section>
  );
}

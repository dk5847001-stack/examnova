import { useEffect, useState } from "react";
import { PageHero } from "../../components/ui/PageHero.jsx";
import { InfoGridCard } from "../../components/ui/InfoGridCard.jsx";
import { LoadingCard } from "../../components/ui/LoadingCard.jsx";
import { SectionHeader } from "../../components/ui/SectionHeader.jsx";
import { useAuth } from "../../hooks/useAuth.js";

export function ProfilePage() {
  const { user, accessToken, refreshProfile, updateProfile } = useAuth();
  const [form, setForm] = useState({
    name: "",
    phone: "",
    avatarUrl: "",
    bio: "",
    university: "",
    branch: "",
    year: "",
    semester: "",
  });
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState({ type: "", message: "" });

  useEffect(() => {
    refreshProfile().catch(() => {});
  }, [accessToken]);

  useEffect(() => {
    setForm({
      name: user?.name || "",
      phone: user?.phone || "",
      avatarUrl: user?.avatarUrl || "",
      bio: user?.bio || "",
      university: user?.academicProfile?.university || "",
      branch: user?.academicProfile?.branch || "",
      year: user?.academicProfile?.year || "",
      semester: user?.academicProfile?.semester || "",
    });
  }, [user]);

  async function handleSubmit(event) {
    event.preventDefault();
    setFeedback({ type: "", message: "" });
    setIsSaving(true);

    try {
      await updateProfile(form);
      setFeedback({ type: "success", message: "Profile updated successfully." });
    } catch (error) {
      setFeedback({ type: "error", message: error.message || "Unable to update profile." });
    } finally {
      setIsSaving(false);
    }
  }

  if (!user) {
    return <LoadingCard message="Loading profile..." />;
  }

  return (
    <section className="stack-section">
      <PageHero
        eyebrow="Profile"
        title="Account overview"
        description="View and edit your profile basics, academic details, and account identity in one place."
        metrics={[
          { label: "Role", value: user?.role || "student" },
          { label: "Status", value: user?.status || "active" },
          { label: "Verified", value: user?.isEmailVerified ? "Yes" : "Pending" },
        ]}
      />
      <div className="two-column-grid">
        <form className="detail-card profile-form" onSubmit={handleSubmit}>
          <SectionHeader
            eyebrow="Edit"
            title="Profile details"
            description="These details shape your account identity and academic categorization."
          />
          <label className="field">
            <span>Full name</span>
            <input className="input" value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} />
          </label>
          <label className="field">
            <span>Phone</span>
            <input className="input" value={form.phone} onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))} />
          </label>
          <label className="field">
            <span>Avatar URL</span>
            <input className="input" value={form.avatarUrl} onChange={(event) => setForm((current) => ({ ...current, avatarUrl: event.target.value }))} />
          </label>
          <label className="field">
            <span>Bio</span>
            <textarea className="input textarea" value={form.bio} onChange={(event) => setForm((current) => ({ ...current, bio: event.target.value }))} />
          </label>
          <div className="two-column-grid compact">
            <label className="field">
              <span>University</span>
              <input className="input" value={form.university} onChange={(event) => setForm((current) => ({ ...current, university: event.target.value }))} />
            </label>
            <label className="field">
              <span>Branch</span>
              <input className="input" value={form.branch} onChange={(event) => setForm((current) => ({ ...current, branch: event.target.value }))} />
            </label>
            <label className="field">
              <span>Year</span>
              <input className="input" value={form.year} onChange={(event) => setForm((current) => ({ ...current, year: event.target.value }))} />
            </label>
            <label className="field">
              <span>Semester</span>
              <input className="input" value={form.semester} onChange={(event) => setForm((current) => ({ ...current, semester: event.target.value }))} />
            </label>
          </div>
          {feedback.message ? (
            <p className={feedback.type === "error" ? "form-error" : "form-success"}>{feedback.message}</p>
          ) : null}
          <button className="button primary" disabled={isSaving} type="submit">
            {isSaving ? "Saving..." : "Save profile"}
          </button>
        </form>

        <div className="stack-section">
          <InfoGridCard
            title="Account status"
            items={[
              { label: "Email", value: user.email },
              { label: "Role", value: user.role },
              { label: "Status", value: user.status },
              { label: "Email verified", value: user.isEmailVerified ? "Yes" : "No" },
            ]}
          />
          <InfoGridCard
            title="Academic profile"
            items={[
              { label: "University", value: user.academicProfile?.university },
              { label: "Branch", value: user.academicProfile?.branch },
              { label: "Year", value: user.academicProfile?.year },
              { label: "Semester", value: user.academicProfile?.semester },
            ]}
          />
        </div>
      </div>
    </section>
  );
}

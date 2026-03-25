import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { PageHero } from "../../components/ui/PageHero.jsx";
import { InfoGridCard } from "../../components/ui/InfoGridCard.jsx";
import { LoadingCard } from "../../components/ui/LoadingCard.jsx";
import { SectionHeader } from "../../components/ui/SectionHeader.jsx";
import {
  BRANCH_OPTIONS,
  DEFAULT_UNIVERSITY,
  SEMESTER_OPTIONS,
  YEAR_OPTIONS,
} from "../../features/academic/academicTaxonomy.js";
import { useAuth } from "../../hooks/useAuth.js";

const controlLinks = [
  { to: "/marketplace", label: "Marketplace", description: "Discover and buy premium PDFs." },
  { to: "/app/purchased-pdfs", label: "Purchased PDFs", description: "Open your buyer library." },
  { to: "/app/listed-pdfs", label: "Listed PDFs", description: "Manage what you sell publicly." },
  { to: "/app/generated-pdfs", label: "Generated PDFs", description: "Review AI-generated output." },
  { to: "/app/upload-generate", label: "Upload & Generate", description: "Start a new document workflow." },
  { to: "/app/wallet", label: "Wallet", description: "Track credits and balance." },
  { to: "/app/withdrawals", label: "Withdrawals", description: "Request and review payouts." },
  { to: "/app/notifications", label: "Notifications", description: "Check system and purchase updates." },
  { to: "/app/settings", label: "Settings", description: "Control your preferences." },
];

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
        eyebrow="Profile control center"
        title="Account overview and control"
        description="This is your main account hub. Update identity details here, then jump into purchases, listings, generated PDFs, wallet activity, withdrawals, notifications, and settings from one clear surface."
        metrics={[
          { label: "Role", value: user?.role || "student" },
          { label: "Status", value: user?.status || "active" },
          { label: "Verified", value: user?.isEmailVerified ? "Yes" : "Pending" },
        ]}
        actions={
          <>
            <Link className="button primary" to="/marketplace">
              <i className="bi bi-shop" />
              Open marketplace
            </Link>
            <Link className="button secondary" to="/app/purchased-pdfs">
              <i className="bi bi-collection" />
              Open my library
            </Link>
          </>
        }
      />
      <div className="two-column-grid">
        <form className="detail-card profile-form" onSubmit={handleSubmit}>
          <SectionHeader
            eyebrow="Edit"
            title="Profile details"
            description="Keep your identity and academic profile accurate so uploads, marketplace listings, and personalized discovery stay understandable."
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
              <select className="input" value={form.university} onChange={(event) => setForm((current) => ({ ...current, university: event.target.value }))}>
                <option value="">Not set yet</option>
                <option value={DEFAULT_UNIVERSITY}>{DEFAULT_UNIVERSITY}</option>
              </select>
            </label>
            <label className="field">
              <span>Branch</span>
              <select className="input" value={form.branch} onChange={(event) => setForm((current) => ({ ...current, branch: event.target.value }))}>
                <option value="">Select branch</option>
                {BRANCH_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Year</span>
              <select className="input" value={form.year} onChange={(event) => setForm((current) => ({ ...current, year: event.target.value }))}>
                <option value="">Select year</option>
                {YEAR_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Semester</span>
              <select className="input" value={form.semester} onChange={(event) => setForm((current) => ({ ...current, semester: event.target.value }))}>
                <option value="">Select semester</option>
                {SEMESTER_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    Semester {option}
                  </option>
                ))}
              </select>
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
              { label: "University", value: user.academicProfile?.university || "-" },
              { label: "Branch", value: user.academicProfile?.branch || "-" },
              { label: "Year", value: user.academicProfile?.year || "-" },
              { label: "Semester", value: user.academicProfile?.semester ? `Semester ${user.academicProfile.semester}` : "-" },
            ]}
          />
        </div>
      </div>
      <section className="stack-section">
        <SectionHeader
          eyebrow="Account controls"
          title="Everything important in one place"
          description="Use this hub to move between the actions that matter most without hunting through scattered screens."
        />
        <div className="shortcut-grid">
          {controlLinks.map((item) => (
            <Link className="shortcut-card" key={item.to} to={item.to}>
              <strong>{item.label}</strong>
              <span className="support-copy">{item.description}</span>
            </Link>
          ))}
        </div>
      </section>
    </section>
  );
}

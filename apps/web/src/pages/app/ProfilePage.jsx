import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { InfoGridCard } from "../../components/ui/InfoGridCard.jsx";
import { LoadingCard } from "../../components/ui/LoadingCard.jsx";
import { PageHero } from "../../components/ui/PageHero.jsx";
import { SectionHeader } from "../../components/ui/SectionHeader.jsx";
import {
  BRANCH_OPTIONS,
  DEFAULT_UNIVERSITY,
  SEMESTER_OPTIONS,
  YEAR_OPTIONS,
} from "../../features/academic/academicTaxonomy.js";
import { useAuth } from "../../hooks/useAuth.js";
import {
  hasDeveloperAccess,
  MODE_LABELS,
  normalizeModeAccess,
} from "../../utils/modes.js";

function renderMetricValue(value, suffix = "") {
  if (value === undefined || value === null || value === "") {
    return "-";
  }

  return `${value}${suffix}`;
}

export function ProfilePage() {
  const {
    user,
    accessToken,
    dashboardSummary,
    fetchDashboardSummary,
    refreshProfile,
    updateProfile,
  } = useAuth();
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
  const modeAccess = normalizeModeAccess(user);
  const developerActive = hasDeveloperAccess(modeAccess);

  useEffect(() => {
    refreshProfile().catch(() => {});
    fetchDashboardSummary().catch(() => {});
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

  const counters = dashboardSummary?.counters || {};
  const wallet = dashboardSummary?.wallet || {};
  const profileCompletionPercent = dashboardSummary?.overview?.profileCompletionPercent ?? 0;
  const controlGroups = [
    {
      title: "Account control",
      description: "Your main account surface for overview, profile editing, notifications, payment receipts, and settings.",
      links: [
        { to: "/app/dashboard", label: "Account overview", meta: "Activity, counters, and latest account summary", value: `${profileCompletionPercent}% complete` },
        { to: "/app/notifications", label: "Notifications", meta: "Unread alerts, purchase updates, and system events", value: `${counters.unreadNotifications ?? 0} unread` },
        { to: "/app/settings", label: "Settings", meta: "Mode, communication, and account preferences", value: MODE_LABELS[modeAccess.currentMode] },
        { to: "/app/payments", label: "Payment history", meta: "Receipt and payment record area", value: "Receipts" },
      ],
    },
    {
      title: "Study workspace",
      description: "Everything related to buying and generating PDFs stays grouped here so first-time users know what to open next.",
      links: [
        { to: "/marketplace", label: "Marketplace", meta: "Browse and buy uploaded PDFs", value: "Public entry" },
        { to: "/app/purchased-pdfs", label: "Purchased PDFs", meta: "Your buyer library and downloads", value: renderMetricValue(counters.purchasedPdfs) },
        { to: "/app/upload-generate", label: "Generate PDFs", meta: "Upload source files and run the AI workflow", value: "Professional" },
        { to: "/app/generated-pdfs", label: "Generated PDFs", meta: "Open AI-generated outputs from your account", value: renderMetricValue(counters.generatedPdfs) },
      ],
    },
    {
      title: developerActive ? "Seller workspace" : "Seller tools",
      description: developerActive
        ? "Developer Mode keeps listing, wallet, and payout controls in one seller-focused area."
        : "Seller tools stay hidden until you unlock and switch into Developer Mode, keeping the account simpler for non-sellers.",
      links: developerActive
        ? [
          { to: "/app/listed-pdfs", label: "Listed PDFs", meta: "Manage public marketplace listings", value: renderMetricValue(counters.listedPdfs) },
          { to: "/app/wallet", label: "Wallet", meta: "Track seller earnings and balance", value: `Rs. ${wallet.availableBalance ?? 0}` },
          { to: "/app/withdrawals", label: "Withdrawals", meta: "Request payouts and review statuses", value: `Rs. ${wallet.pendingWithdrawalAmount ?? 0} pending` },
        ]
        : [
          { to: "/app/settings#mode-access", label: "Unlock Developer Mode", meta: "Enable listing, wallet, and withdrawal controls", value: `Rs. ${modeAccess.developerUnlockAmountInr}` },
          { to: "/app/settings#mode-access", label: "Current seller access", meta: "Developer-only seller tools are not active yet", value: "Locked" },
        ],
    },
  ];

  return (
    <section className="stack-section">
      <PageHero
        eyebrow="User control center"
        title="Manage your account from one organized place"
        description="Profile details, account overview, mode status, bought PDFs, generated PDFs, listed PDFs, wallet, withdrawals, notifications, and settings are grouped here so the workspace feels clear instead of scattered."
        metrics={[
          { label: "Current mode", value: MODE_LABELS[modeAccess.currentMode] },
          { label: "Profile", value: `${profileCompletionPercent}% complete` },
          { label: "Wallet", value: `Rs. ${wallet.availableBalance ?? 0}` },
          { label: "Unread", value: `${counters.unreadNotifications ?? 0}` },
        ]}
        actions={
          <>
            <Link className="button primary" to="/app/dashboard">
              <i className="bi bi-grid-1x2-fill" />
              Open account overview
            </Link>
            <Link className="button secondary" to="/marketplace">
              <i className="bi bi-shop" />
              Browse marketplace
            </Link>
          </>
        }
      />

      <div className="two-column-grid">
        <article className="detail-card control-hub-card">
          <SectionHeader
            eyebrow="Account overview"
            title="Current account state"
            description="This snapshot keeps the most important identity, access, and library signals visible at the top."
          />
          <div className="info-grid">
            <div><span className="info-label">Email</span><strong>{user.email}</strong></div>
            <div><span className="info-label">Role</span><strong>{user.role}</strong></div>
            <div><span className="info-label">Status</span><strong>{user.status}</strong></div>
            <div><span className="info-label">Email verified</span><strong>{user.isEmailVerified ? "Yes" : "No"}</strong></div>
            <div><span className="info-label">Purchased PDFs</span><strong>{counters.purchasedPdfs ?? 0}</strong></div>
            <div><span className="info-label">Generated PDFs</span><strong>{counters.generatedPdfs ?? 0}</strong></div>
          </div>
          <div className="hero-actions">
            <Link className="button secondary" to="/app/dashboard">Open overview</Link>
            <Link className="button ghost" to="/app/settings">Open settings</Link>
          </div>
        </article>

        <article className="detail-card control-hub-card">
          <SectionHeader
            eyebrow="Mode status"
            title={`${MODE_LABELS[modeAccess.currentMode]} active`}
            description="Your account tools are organized around mode access so first-time users only see what they can actually use."
          />
          <div className="info-grid">
            <div><span className="info-label">Professional tools</span><strong>Enabled</strong></div>
            <div><span className="info-label">Developer unlocked</span><strong>{modeAccess.developerUnlocked ? "Yes" : "No"}</strong></div>
            <div><span className="info-label">Seller tools</span><strong>{developerActive ? "Visible now" : "Hidden until Developer Mode"}</strong></div>
            <div><span className="info-label">Next step</span><strong>{developerActive ? "Manage seller workspace" : "Use settings to compare modes"}</strong></div>
            <div><span className="info-label">Wallet balance</span><strong>Rs. {wallet.availableBalance ?? 0}</strong></div>
            <div><span className="info-label">Unread alerts</span><strong>{counters.unreadNotifications ?? 0}</strong></div>
          </div>
          <div className="hero-actions">
            <Link className="button secondary" to="/app/settings#mode-access">Manage mode access</Link>
            <Link className="button ghost" to={developerActive ? "/app/listed-pdfs" : "/app/upload-generate"}>
              {developerActive ? "Open seller workspace" : "Open AI workflow"}
            </Link>
          </div>
        </article>
      </div>

      <div className="two-column-grid">
        <form className="detail-card profile-form" onSubmit={handleSubmit}>
          <SectionHeader
            eyebrow="Edit profile"
            title="Profile details"
            description="Keep identity and academic details current so account discovery, uploads, and marketplace context stay accurate."
          />
          <label className="field">
            <span>Full name</span>
            <input className="input" onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} value={form.name} />
          </label>
          <label className="field">
            <span>Phone</span>
            <input className="input" onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))} value={form.phone} />
          </label>
          <label className="field">
            <span>Avatar URL</span>
            <input className="input" onChange={(event) => setForm((current) => ({ ...current, avatarUrl: event.target.value }))} value={form.avatarUrl} />
          </label>
          <label className="field">
            <span>Bio</span>
            <textarea className="input textarea" onChange={(event) => setForm((current) => ({ ...current, bio: event.target.value }))} value={form.bio} />
          </label>
          <div className="two-column-grid compact">
            <label className="field">
              <span>University</span>
              <select className="input" onChange={(event) => setForm((current) => ({ ...current, university: event.target.value }))} value={form.university}>
                <option value="">Not set yet</option>
                <option value={DEFAULT_UNIVERSITY}>{DEFAULT_UNIVERSITY}</option>
              </select>
            </label>
            <label className="field">
              <span>Branch</span>
              <select className="input" onChange={(event) => setForm((current) => ({ ...current, branch: event.target.value }))} value={form.branch}>
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
              <select className="input" onChange={(event) => setForm((current) => ({ ...current, year: event.target.value }))} value={form.year}>
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
              <select className="input" onChange={(event) => setForm((current) => ({ ...current, semester: event.target.value }))} value={form.semester}>
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
            title="Academic profile"
            items={[
              { label: "University", value: user.academicProfile?.university || "-" },
              { label: "Branch", value: user.academicProfile?.branch || "-" },
              { label: "Year", value: user.academicProfile?.year || "-" },
              { label: "Semester", value: user.academicProfile?.semester ? `Semester ${user.academicProfile.semester}` : "-" },
            ]}
          />
          <InfoGridCard
            title="Library and seller stats"
            items={[
              { label: "Purchased PDFs", value: counters.purchasedPdfs ?? 0 },
              { label: "Generated PDFs", value: counters.generatedPdfs ?? 0 },
              { label: "Listed PDFs", value: counters.listedPdfs ?? 0 },
              { label: "Wallet balance", value: `Rs. ${wallet.availableBalance ?? 0}` },
            ]}
          />
          <InfoGridCard
            title="Alerts and receipts"
            items={[
              { label: "Unread notifications", value: counters.unreadNotifications ?? 0 },
              { label: "Profile completion", value: `${profileCompletionPercent}%` },
              { label: "Current mode", value: MODE_LABELS[modeAccess.currentMode] },
              { label: "Developer unlocked", value: modeAccess.developerUnlocked ? "Yes" : "No" },
            ]}
          />
        </div>
      </div>

      <section className="stack-section">
        <SectionHeader
          eyebrow="Control groups"
          title="Everything important, grouped by job"
          description="Each group below collects related account actions so zero-knowledge users can understand where to go without scanning the whole sidebar."
        />
        <div className="three-column-grid control-hub-grid">
          {controlGroups.map((group) => (
            <article className="detail-card control-hub-card" key={group.title}>
              <div className="control-hub-copy">
                <p className="eyebrow">{group.title}</p>
                <h3>{group.title}</h3>
                <p className="support-copy">{group.description}</p>
              </div>
              <div className="control-link-list">
                {group.links.map((item) => (
                  <Link className="control-link-row" key={item.to + item.label} to={item.to}>
                    <div>
                      <strong>{item.label}</strong>
                      <span className="support-copy">{item.meta}</span>
                    </div>
                    <span className="control-link-value">{item.value}</span>
                  </Link>
                ))}
              </div>
            </article>
          ))}
        </div>
      </section>
    </section>
  );
}

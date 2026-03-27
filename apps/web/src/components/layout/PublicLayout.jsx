import { useEffect, useMemo, useState } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { SeoHead } from "../../seo/SeoHead.jsx";
import { useAuth } from "../../hooks/useAuth.js";
import { ThemeToggleButton } from "../ui/ThemeToggleButton.jsx";
import {
  MODE_CATALOG,
  MODE_LABELS,
  PLATFORM_MODES,
  normalizeModeAccess,
} from "../../utils/modes.js";

const MODE_ICON_MAP = {
  [PLATFORM_MODES.SIMPLE]: "bi-lightning-charge-fill",
  [PLATFORM_MODES.PROFESSIONAL]: "bi-briefcase-fill",
  [PLATFORM_MODES.DEVELOPER]: "bi-code-slash",
};

function buildSettingsPayload(user, nextMode) {
  return {
    emailNotifications: user?.preferences?.emailNotifications ?? true,
    productUpdates: user?.preferences?.productUpdates ?? true,
    marketplaceAlerts: user?.preferences?.marketplaceAlerts ?? true,
    currentMode: nextMode,
  };
}

function createPublicSections({ isAuthenticated, isAdminSession, modeAccess }) {
  const sections = [
    {
      title: "Browse",
      items: [
        {
          type: "link",
          to: "/marketplace",
          icon: "bi-grid-1x2-fill",
          label: "Marketplace",
          meta: "Open all public PDF cards",
        },
        {
          type: "anchor",
          href: "#public-footer",
          icon: "bi-info-circle-fill",
          label: "How it works",
          meta: "See the simple PDF flow",
        },
      ],
    },
  ];

  if (!isAuthenticated) {
    sections.push({
      title: "Account",
      items: [
        {
          type: "link",
          to: "/login",
          icon: "bi-box-arrow-in-right",
          label: "Login",
          meta: "Continue with your account",
        },
        {
          type: "link",
          to: "/signup",
          icon: "bi-person-plus-fill",
          label: "Register",
          meta: "Create a new account",
        },
      ],
    });

    return sections;
  }

  if (isAdminSession) {
    sections.push({
      title: "Admin tools",
      items: [
        {
          type: "link",
          to: "/admin/profile",
          icon: "bi-speedometer2",
          label: "Admin center",
          meta: "Open admin control center",
        },
        {
          type: "link",
          to: "/admin/uploads",
          icon: "bi-cloud-arrow-up-fill",
          label: "Uploads",
          meta: "Manage admin PDFs",
        },
        {
          type: "link",
          to: "/admin/listings",
          icon: "bi-journal-richtext",
          label: "Listings",
          meta: "Moderate marketplace items",
        },
      ],
    });

    return sections;
  }

  sections.push({
    title: "Workspace",
    items: [
      {
        type: "link",
        to: "/app/profile",
        icon: "bi-person-circle",
        label: "My account",
        meta: `${MODE_LABELS[modeAccess.currentMode]} active`,
      },
      {
        type: "link",
        to: "/app/purchased-pdfs",
        icon: "bi-bag-check-fill",
        label: "Purchased PDFs",
        meta: "See paid downloads",
      },
      {
        type: "link",
        to: "/app/upload-generate",
        icon: "bi-magic",
        label: "AI workflow",
        meta: "Generate new PDFs",
      },
    ],
  });

  sections.push({
    title: "Seller tools",
    items: modeAccess.developerUnlocked
      ? [
          {
            type: "link",
            to: "/app/listed-pdfs",
            icon: "bi-shop-window",
            label: "Listed PDFs",
            meta: "Manage public seller listings",
          },
          {
            type: "link",
            to: "/app/wallet",
            icon: "bi-wallet2",
            label: "Wallet",
            meta: "Check seller earnings",
          },
          {
            type: "link",
            to: "/app/withdrawals",
            icon: "bi-cash-stack",
            label: "Withdrawals",
            meta: "Request seller payout",
          },
        ]
      : [
          {
            type: "link",
            to: "/app/settings#mode-access",
            icon: "bi-lock-fill",
            label: "Unlock developer",
            meta: "Enable listing and seller tools",
          },
        ],
  });

  return sections;
}

function getModeActionConfig({
  activeMode,
  isAdminSession,
  isAuthenticated,
  mode,
  modeAccess,
}) {
  if (!mode) {
    return {
      label: "Switch now",
      icon: "bi-arrow-repeat",
    };
  }

  if (mode.id === PLATFORM_MODES.SIMPLE) {
    return {
      label: activeMode === PLATFORM_MODES.SIMPLE ? "Open marketplace" : "Switch now",
      icon: "bi-lightning-charge-fill",
    };
  }

  if (!isAuthenticated) {
    return {
      label: mode.id === PLATFORM_MODES.DEVELOPER ? "Register to continue" : "Login to continue",
      icon: mode.id === PLATFORM_MODES.DEVELOPER ? "bi-person-plus-fill" : "bi-box-arrow-in-right",
    };
  }

  if (isAdminSession) {
    return {
      label: "Open admin center",
      icon: "bi-speedometer2",
    };
  }

  if (mode.id === PLATFORM_MODES.DEVELOPER && !modeAccess.developerUnlocked) {
    return {
      label: `Unlock for Rs. ${modeAccess.developerUnlockAmountInr}`,
      icon: "bi-unlock-fill",
    };
  }

  if (mode.id === activeMode) {
    return {
      label: "Open current mode",
      icon: "bi-check-circle-fill",
    };
  }

  return {
    label: "Switch now",
    icon: "bi-arrow-repeat",
  };
}

export function PublicLayout() {
  const {
    isAuthenticated,
    logout,
    role,
    updateSettings,
    user,
  } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isModeModalOpen, setIsModeModalOpen] = useState(false);
  const [selectedModeId, setSelectedModeId] = useState("");
  const [isModeSwitching, setIsModeSwitching] = useState(false);
  const [modeFeedback, setModeFeedback] = useState({ type: "", message: "" });

  const isPdfDetailPage = location.pathname.startsWith("/pdf/");
  const isMarketplacePage = location.pathname === "/" || location.pathname === "/marketplace";
  const isWidePublicPage = isMarketplacePage || isPdfDetailPage;
  const isAdminSession = isAuthenticated && role === "admin";
  const modeAccess = normalizeModeAccess(user);
  const activeMode = !isAuthenticated
    ? PLATFORM_MODES.SIMPLE
    : isAdminSession
      ? PLATFORM_MODES.DEVELOPER
      : modeAccess.currentMode;
  const accountHref = isAuthenticated ? (isAdminSession ? "/admin/profile" : "/app/profile") : "/login";
  const accountLabel = isAuthenticated ? (isAdminSession ? "Admin center" : "My account") : "Login";
  const extraSections = useMemo(
    () => createPublicSections({ isAuthenticated, isAdminSession, modeAccess }),
    [isAdminSession, isAuthenticated, modeAccess],
  );
  const selectedMode = MODE_CATALOG.find((mode) => mode.id === selectedModeId) || null;
  const modeAction = getModeActionConfig({
    activeMode,
    isAdminSession,
    isAuthenticated,
    mode: selectedMode,
    modeAccess,
  });

  useEffect(() => {
    setIsSidebarOpen(false);
    setIsModeModalOpen(false);
    setSelectedModeId("");
    setModeFeedback({ type: "", message: "" });
  }, [location.pathname]);

  useEffect(() => {
    if (typeof document === "undefined") {
      return undefined;
    }

    const previousOverflow = document.body.style.overflow;
    if (isSidebarOpen || isModeModalOpen) {
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isModeModalOpen, isSidebarOpen]);

  function openModeModal(modeId) {
    setSelectedModeId(modeId);
    setModeFeedback({ type: "", message: "" });
    setIsSidebarOpen(false);
    setIsModeModalOpen(true);
  }

  function closeModeModal() {
    if (isModeSwitching) {
      return;
    }
    setIsModeModalOpen(false);
    setSelectedModeId("");
  }

  async function handleModeSelect(nextMode) {
    setModeFeedback({ type: "", message: "" });

    if (nextMode === PLATFORM_MODES.SIMPLE) {
      navigate("/marketplace");
      setIsSidebarOpen(false);
      return true;
    }

    if (!isAuthenticated) {
      navigate(nextMode === PLATFORM_MODES.DEVELOPER ? "/signup" : "/login");
      setIsSidebarOpen(false);
      return true;
    }

    if (isAdminSession) {
      navigate("/admin/profile");
      setIsSidebarOpen(false);
      return true;
    }

    if (nextMode === PLATFORM_MODES.DEVELOPER && !modeAccess.developerUnlocked) {
      navigate("/app/settings#mode-access");
      setIsSidebarOpen(false);
      return true;
    }

    if (nextMode !== modeAccess.currentMode) {
      setIsModeSwitching(true);

      try {
        await updateSettings(buildSettingsPayload(user, nextMode));
        setModeFeedback({
          type: "success",
          message: `${MODE_LABELS[nextMode]} is now active for your account.`,
        });
      } catch (error) {
        setModeFeedback({
          type: "error",
          message: error.message || "Unable to switch mode right now.",
        });
        setIsModeSwitching(false);
        return false;
      } finally {
        setIsModeSwitching(false);
      }
    }

    navigate(nextMode === PLATFORM_MODES.DEVELOPER ? "/app/listed-pdfs" : "/app/profile");
    setIsSidebarOpen(false);
    return true;
  }

  async function handleModeAction() {
    if (!selectedMode) {
      return;
    }

    const switched = await handleModeSelect(selectedMode.id);
    if (switched) {
      closeModeModal();
    }
  }

  async function handleLogout() {
    await logout();
    navigate("/marketplace");
    setIsSidebarOpen(false);
  }

  return (
    <div
      className={`site-shell public-shell${isWidePublicPage ? " public-shell-wide" : ""}${isPdfDetailPage ? " public-shell-detail" : ""}`}
    >
      <SeoHead title="ExamNova AI" description="AI-powered exam preparation platform and PDF marketplace." />

      <header className="public-mobile-navbar">
        <div className="public-mobile-navbar-card">
          <div className="public-mobile-navbar-top">
            <Link className="public-mobile-brand" to="/marketplace">
              <span className="public-mobile-brand-mark" aria-hidden="true">
                <i className="bi bi-file-earmark-pdf-fill" />
              </span>
              <span className="public-mobile-brand-copy">
                <small>ExamNova AI</small>
                <strong>PDF Marketplace</strong>
              </span>
            </Link>

            <div className="public-mobile-navbar-tools">
              <ThemeToggleButton compact className="public-mobile-theme-toggle" />
              <button
                aria-controls="public-sidebar"
                aria-expanded={isSidebarOpen}
                aria-label={isSidebarOpen ? "Close menu" : "Open menu"}
                className="public-mobile-menu-button"
                onClick={() => setIsSidebarOpen((current) => !current)}
                type="button"
              >
                <i className={`bi ${isSidebarOpen ? "bi-x-lg" : "bi-list"}`} />
              </button>
            </div>
          </div>

          <div className="public-mobile-navbar-bottom">
            <p className="public-mobile-navbar-copy">
              Fast mobile-first PDF browsing with secure payment and simple account access.
            </p>
            <div className="public-mobile-auth-actions">
              {isAuthenticated ? (
                <>
                  <Link className="btn btn-primary public-mobile-auth-button" to={accountHref}>
                    <i className="bi bi-person-circle" />
                    {accountLabel}
                  </Link>
                  <button className="btn btn-outline-secondary public-mobile-auth-button" onClick={handleLogout} type="button">
                    <i className="bi bi-box-arrow-right" />
                    Logout
                  </button>
                </>
              ) : (
                <>
                  <Link className="btn btn-outline-secondary public-mobile-auth-button" to="/login">
                    <i className="bi bi-box-arrow-in-right" />
                    Login
                  </Link>
                  <Link className="btn btn-primary public-mobile-auth-button" to="/signup">
                    <i className="bi bi-person-plus-fill" />
                    Register
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className={`page-shell${isWidePublicPage ? " page-shell-wide" : ""}${isPdfDetailPage ? " page-shell-detail" : ""}`}>
        <Outlet />
      </main>

      <footer className="public-mobile-footer" id="public-footer">
        <div className="public-mobile-footer-card">
          <div className="public-mobile-footer-hero">
            <div>
              <p className="eyebrow">ExamNova AI</p>
              <h3>Browse PDFs, pay safely, and download from one clean mobile-friendly flow.</h3>
            </div>
            <div className="public-mobile-footer-hero-actions">
              <Link className="btn btn-primary public-mobile-footer-button" to="/marketplace">
                <i className="bi bi-search" />
                Browse PDFs
              </Link>
              <button className="btn btn-outline-secondary public-mobile-footer-button" onClick={() => setIsSidebarOpen(true)} type="button">
                <i className="bi bi-grid-3x3-gap-fill" />
                Open menu
              </button>
            </div>
          </div>

          <div className="public-mobile-footer-grid">
            <article className="public-mobile-footer-panel">
              <span className="public-mobile-footer-label">Quick links</span>
              <Link to="/marketplace">Marketplace</Link>
              <Link to={accountHref}>{accountLabel}</Link>
              {!isAuthenticated ? <Link to="/signup">Create account</Link> : null}
            </article>
            <article className="public-mobile-footer-panel">
              <span className="public-mobile-footer-label">Download flow</span>
              <p>1. Open any PDF card</p>
              <p>2. Enter your full name</p>
              <p>3. Pay and download securely</p>
            </article>
            <article className="public-mobile-footer-panel">
              <span className="public-mobile-footer-label">Built for mobile</span>
              <div className="public-mobile-footer-chips">
                <span>Compact navbar</span>
                <span>Sidebar tools</span>
                <span>Secure checkout</span>
                <span>Dark mode</span>
              </div>
            </article>
          </div>

          <div className="public-mobile-footer-bottom">
            <p>Public website stays focused on PDF discovery. Extra features now live inside the sidebar instead of cluttering the main page.</p>
            <ThemeToggleButton compact className="public-mobile-theme-toggle footer-theme-toggle" />
          </div>
        </div>
      </footer>

      <div
        aria-hidden={!isSidebarOpen}
        className={`public-sidebar-overlay${isSidebarOpen ? " open" : ""}`}
        onClick={() => setIsSidebarOpen(false)}
      />
      <aside
        aria-hidden={!isSidebarOpen}
        className={`public-sidebar-drawer${isSidebarOpen ? " open" : ""}`}
        id="public-sidebar"
      >
        <div className="public-sidebar-header">
          <div className="public-sidebar-brand">
            <span className="public-mobile-brand-mark" aria-hidden="true">
              <i className="bi bi-stars" />
            </span>
            <div className="public-mobile-brand-copy">
              <small>Explore more</small>
              <strong>ExamNova Sidebar</strong>
            </div>
          </div>
          <button className="public-mobile-menu-button" onClick={() => setIsSidebarOpen(false)} type="button">
            <i className="bi bi-x-lg" />
          </button>
        </div>

        <div className="public-sidebar-body">
          {extraSections.map((section) => (
            <section className="public-sidebar-section" key={section.title}>
              <span className="public-sidebar-section-title">{section.title}</span>
              <div className="public-sidebar-link-list">
                {section.items.map((item) =>
                  item.type === "anchor" ? (
                    <a className="public-sidebar-link" href={item.href} key={`${section.title}-${item.label}`} onClick={() => setIsSidebarOpen(false)}>
                      <span className="public-sidebar-link-icon"><i className={`bi ${item.icon}`} /></span>
                      <span>
                        <strong>{item.label}</strong>
                        <small>{item.meta}</small>
                      </span>
                    </a>
                  ) : (
                    <Link className="public-sidebar-link" key={`${section.title}-${item.label}`} onClick={() => setIsSidebarOpen(false)} to={item.to}>
                      <span className="public-sidebar-link-icon"><i className={`bi ${item.icon}`} /></span>
                      <span>
                        <strong>{item.label}</strong>
                        <small>{item.meta}</small>
                      </span>
                    </Link>
                  ),
                )}
              </div>
            </section>
          ))}

          <section className="public-sidebar-section public-sidebar-mode-section">
            <span className="public-sidebar-section-title">Switch mode</span>
            <div className="public-sidebar-mode-list">
              {MODE_CATALOG.map((mode) => (
                <button
                  className={`public-sidebar-mode-item${activeMode === mode.id ? " active" : ""}`}
                  disabled={isModeSwitching}
                  key={mode.id}
                  onClick={() => openModeModal(mode.id)}
                  type="button"
                >
                  <strong>{mode.label}</strong>
                  <small>{activeMode === mode.id ? "Current mode" : mode.badge}</small>
                </button>
              ))}
            </div>
          </section>
        </div>
      </aside>

      {isModeModalOpen && selectedMode ? (
        <div className="public-mode-modal-overlay" onClick={closeModeModal}>
          <div className="public-mode-modal" onClick={(event) => event.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="public-mode-modal-title">
            <button className="public-mode-modal-close" onClick={closeModeModal} type="button">
              <i className="bi bi-x-lg" />
            </button>

            <div className="public-mode-modal-icon-wrap">
              <span className={`public-mode-modal-icon ${selectedMode.id}`}>
                <i className={`bi ${MODE_ICON_MAP[selectedMode.id] || "bi-stars"}`} />
              </span>
              <span className="public-mode-modal-badge">{selectedMode.badge}</span>
            </div>

            <div className="public-mode-modal-copy">
              <p className="eyebrow">Mode details</p>
              <h3 id="public-mode-modal-title">{selectedMode.label}</h3>
              <p>{selectedMode.description}</p>
            </div>

            <div className="public-mode-modal-meta">
              <div>
                <span className="info-label">Current mode</span>
                <strong>{MODE_LABELS[activeMode]}</strong>
              </div>
              <div>
                <span className="info-label">Access</span>
                <strong>
                  {selectedMode.id === PLATFORM_MODES.DEVELOPER && isAuthenticated && !isAdminSession && !modeAccess.developerUnlocked
                    ? "Locked"
                    : "Available"}
                </strong>
              </div>
            </div>

            <div className="public-mode-feature-list">
              {selectedMode.features.map((feature) => (
                <div className="public-mode-feature-item" key={feature}>
                  <i className="bi bi-check2-circle" />
                  <span>{feature}</span>
                </div>
              ))}
            </div>

            {modeFeedback.message ? (
              <p className={modeFeedback.type === "error" ? "form-error" : "form-success"}>{modeFeedback.message}</p>
            ) : null}

            <div className="public-mode-modal-actions">
              <button className="btn btn-outline-secondary public-mode-modal-button" onClick={closeModeModal} type="button">
                Cancel
              </button>
              <button
                className={`btn btn-primary public-mode-modal-button public-mode-switch-button${isModeSwitching ? " is-switching" : ""}`}
                onClick={handleModeAction}
                type="button"
              >
                <i className={`bi ${modeAction.icon}`} />
                {modeAction.label}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

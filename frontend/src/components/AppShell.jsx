import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { LogOut, Menu, Moon, Sun } from "lucide-react";
import { useAuth } from "../auth/AuthProvider.jsx";
import { useTheme } from "../theme/ThemeProvider.jsx";
import { SidebarSection } from "./ui.jsx";
import { MobileMenu } from "./MobileMenu.jsx";

const navSections = [
  {
    title: "Overview",
    links: [
      { to: "/app/dashboard", label: "Dashboard", accent: "tracker" },
      { to: "/app/coach", label: "Coach", accent: "ai" }
    ]
  },
  {
    title: "Tracker",
    links: [
      { to: "/app/applications", label: "Applications", accent: "tracker" },
      { to: "/app/to-apply", label: "To Apply", accent: "tracker" },
      { to: "/app/channel-postings", label: "Channel Postings", accent: "tracker" },
      { to: "/app/companies", label: "Companies", accent: "tracker" },
      { to: "/app/contacts", label: "Contacts", accent: "tracker" },
      { to: "/app/reminders", label: "Reminders", accent: "tracker" }
    ]
  },
  {
    title: "AI Tools",
    links: [
      { to: "/app/ai/jd-analyzer", label: "JD Analyzer", accent: "ai" },
      { to: "/app/ai/resume-match", label: "Resume Match", accent: "ai" },
      { to: "/app/skill-gaps", label: "Skill Gaps", accent: "ai" }
    ]
  },
  {
    title: "Library",
    links: [
      { to: "/app/notes", label: "Notes", accent: "tracker" },
      { to: "/app/resume-versions", label: "Resume Versions", accent: "ai" }
    ]
  }
];

const getSectionAccent = (pathname) => {
  if (pathname.startsWith("/app/coach")) return "ai";
  if (pathname.startsWith("/app/ai")) return "ai";
  if (pathname.startsWith("/app/skill-gaps")) return "ai";
  if (pathname.startsWith("/app/resume-versions")) return "ai";
  return "tracker";
};

const useIsMobile = () => {
  const [isMobile, setIsMobile] = useState(() =>
    typeof window === "undefined" ? false : window.matchMedia("(max-width: 767px)").matches
  );

  useEffect(() => {
    const mediaQuery = window.matchMedia("(max-width: 767px)");
    const update = () => setIsMobile(mediaQuery.matches);

    update();
    mediaQuery.addEventListener("change", update);
    return () => mediaQuery.removeEventListener("change", update);
  }, []);

  return isMobile;
};

export const AppShell = ({ title, eyebrow, actions, children }) => {
  const { signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { pathname } = useLocation();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const isMobile = useIsMobile();
  const sectionAccent = getSectionAccent(pathname);

  useEffect(() => {
    if (!isMobile) setMobileNavOpen(false);
  }, [isMobile]);

  return (
    <main className={`app-shell accent-${sectionAccent}`}>
      <aside className="sidebar">
        <div className="brand-block">
          <div>
            <h1>CareerTrack AI</h1>
            <span>Career command center</span>
          </div>
          <button
            className="icon-button ghost-button mobile-nav-toggle"
            type="button"
            onClick={() => setMobileNavOpen(true)}
            aria-label="Open navigation"
            aria-expanded={mobileNavOpen}
          >
            <Menu size={18} />
          </button>
        </div>
        <nav>
          {navSections.map((section) => (
            <SidebarSection key={section.title} {...section} />
          ))}
        </nav>
      </aside>
      {isMobile ? <MobileMenu open={mobileNavOpen} sections={navSections} onClose={() => setMobileNavOpen(false)} /> : null}
      <section className="workspace">
        <header className="topbar">
          <div className="topbar-page-context" aria-label={[eyebrow, title].filter(Boolean).join(" - ")} />
          <div className="topbar-actions">
            {actions}
            <button className="icon-button ghost-button" type="button" onClick={toggleTheme} aria-label="Toggle theme">
              {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <button className="icon-button" type="button" onClick={() => setShowLogoutConfirm(true)} aria-label="Log out">
              <LogOut size={18} />
            </button>
          </div>
        </header>
        {children}
      </section>
      {showLogoutConfirm ? (
        <div className="modal-backdrop" role="presentation" onMouseDown={() => setShowLogoutConfirm(false)}>
          <section className="confirm-modal" role="dialog" aria-modal="true" onMouseDown={(event) => event.stopPropagation()}>
            <div className="panel-header">
              <h3>Log out?</h3>
              <p>You will need to log in again to continue tracking your applications.</p>
            </div>
            <div className="confirm-actions">
              <button className="ghost-button" type="button" onClick={() => setShowLogoutConfirm(false)}>
                Stay signed in
              </button>
              <button type="button" onClick={signOut}>
                Log out
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </main>
  );
};

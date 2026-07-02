import { useEffect, useRef } from "react";
import { NavLink } from "react-router-dom";
import { X } from "lucide-react";

const focusableSelector = [
  "a[href]",
  "button:not([disabled])",
  "textarea:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  '[tabindex]:not([tabindex="-1"])'
].join(",");

export const MobileMenu = ({ open, sections, onClose }) => {
  const menuRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const focusable = menuRef.current?.querySelectorAll(focusableSelector);
    focusable?.[0]?.focus();

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        onClose();
        return;
      }

      if (event.key !== "Tab" || !menuRef.current) return;

      const elements = Array.from(menuRef.current.querySelectorAll(focusableSelector));
      if (!elements.length) return;

      const first = elements[0];
      const last = elements[elements.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose, open]);

  return (
    <aside
      ref={menuRef}
      className={`mobile-menu ${open ? "open" : ""}`}
      role="dialog"
      aria-modal="true"
      aria-label="Mobile navigation"
      aria-hidden={!open}
    >
      <header className="mobile-menu-header">
        <div>
          <h2>CareerTrack AI</h2>
          <p>Career command center</p>
        </div>
        <button className="icon-button ghost-button" type="button" onClick={onClose} aria-label="Close navigation" tabIndex={open ? 0 : -1}>
          <X size={20} />
        </button>
      </header>

      <nav className="mobile-menu-nav" aria-label="Primary navigation">
        {sections.map((section) => (
          <section className="mobile-menu-section" key={section.title}>
            <p>{section.title}</p>
            <div>
              {section.links.map((link) => (
                <NavLink
                  to={link.to}
                  key={link.to}
                  className={({ isActive }) =>
                    `mobile-menu-link mobile-menu-link-${link.accent || "tracker"} ${isActive ? "active" : ""}`
                  }
                  onClick={onClose}
                  tabIndex={open ? 0 : -1}
                >
                  {link.label}
                </NavLink>
              ))}
            </div>
          </section>
        ))}
      </nav>
    </aside>
  );
};

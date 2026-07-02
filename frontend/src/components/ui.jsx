import { NavLink } from "react-router-dom";
import { useState } from "react";
import { X } from "lucide-react";

const sectionAccentClass = (accent = "tracker") => {
  const normalized = String(accent || "tracker").toLowerCase();
  return normalized === "ai" || normalized === "blue" ? "accent-ai" : "accent-tracker";
};

export const SidebarSection = ({ title, links, onNavigate }) => (
  <section className={`sidebar-section sidebar-section-${title.toLowerCase().replace(/\s+/g, "-")}`}>
    <p>{title}</p>
    <div>
      {links.map((link) => (
        <NavLink
          to={link.to}
          key={link.to}
          className={({ isActive }) => `nav-link nav-link-${link.accent || "tracker"} ${isActive ? "active" : ""}`}
          onClick={onNavigate}
        >
          {link.label}
        </NavLink>
      ))}
    </div>
  </section>
);

export const MetricCard = ({ label, value, help, tone = "default" }) => (
  <article className={`metric-card metric-card-${tone}`} title={help}>
    <p>{label}</p>
    <strong>{value}</strong>
  </article>
);

export const PageShell = ({
  eyebrow,
  title,
  children,
  action,
  accent = "tracker",
  className = "",
}) => (
  <section className={`page-shell ${sectionAccentClass(accent)} ${className}`.trim()}>
    <header className="page-shell-header">
      <div className="page-shell-title-block">
        {eyebrow ? <p className="page-shell-eyebrow">{eyebrow}</p> : null}
        <h1>{title}</h1>
        <span className="page-shell-underline" aria-hidden="true" />
      </div>
      {action ? <div className="page-shell-action">{action}</div> : null}
    </header>
    <div className="page-shell-content">{children}</div>
  </section>
);

export const MetadataRow = ({ items = [], className = "" }) => {
  const visibleItems = items.filter((item) => item && item.value !== undefined && item.value !== null && item.value !== "");

  if (!visibleItems.length) return null;

  return (
    <dl className={`metadata-row ${className}`.trim()}>
      {visibleItems.map((item) => (
        <div key={item.key || item.label} className="metadata-row-item">
          <dt>{item.label}</dt>
          <dd>{item.value}</dd>
        </div>
      ))}
    </dl>
  );
};

export const CardActions = ({ primary, secondary, destructive, children, className = "" }) => (
  <div className={`standard-card-actions ${className}`.trim()}>
    {children}
    {primary}
    {secondary}
    {destructive ? <div className="standard-card-destructive">{destructive}</div> : null}
  </div>
);

export const StandardCard = ({
  label,
  secondary,
  metadata,
  badge,
  actions,
  children,
  className = "",
}) => (
  <article className={`standard-card ${className}`.trim()}>
    <div className="standard-card-main">
      <div className="standard-card-heading">
        <div>
          {secondary ? <p className="standard-card-secondary">{secondary}</p> : null}
          {label ? <h3 className="standard-card-label">{label}</h3> : null}
        </div>
        {badge ? <div className="standard-card-badges">{badge}</div> : null}
      </div>
      {metadata ? <MetadataRow items={metadata} /> : null}
      {children ? <div className="standard-card-content">{children}</div> : null}
    </div>
    {actions ? <CardActions>{actions}</CardActions> : null}
  </article>
);

export const InlineConfirmButton = ({
  onConfirm,
  disabled = false,
  children,
  confirmLabel = "Yes",
  cancelLabel = "Cancel",
  message = "Are you sure?",
  className = "icon-button danger-button",
  confirmClassName = "danger-button",
  cancelClassName = "ghost-button",
  ...props
}) => {
  const [confirming, setConfirming] = useState(false);

  if (confirming) {
    return (
      <span className="inline-confirm">
        <span>{message}</span>
        <button
          className={confirmClassName}
          type="button"
          onClick={() => {
            setConfirming(false);
            onConfirm?.();
          }}
          disabled={disabled}
        >
          {confirmLabel}
        </button>
        <button className={cancelClassName} type="button" onClick={() => setConfirming(false)}>
          {cancelLabel}
        </button>
      </span>
    );
  }

  return (
    <button className={className} type="button" onClick={() => setConfirming(true)} disabled={disabled} {...props}>
      {children}
    </button>
  );
};

export const Drawer = ({ open, title, description, onClose, children, className = "" }) => {
  if (!open) return null;

  return (
    <div className="drawer-backdrop" role="presentation" onMouseDown={onClose}>
      <aside className={`drawer-panel ${className}`.trim()} role="dialog" aria-modal="true" onMouseDown={(event) => event.stopPropagation()}>
        <div className="panel-header drawer-header">
          <div>
            <h3>{title}</h3>
            {description ? <p>{description}</p> : null}
          </div>
          <button className="icon-button ghost-button" type="button" onClick={onClose} aria-label="Close drawer">
            <X size={18} />
          </button>
        </div>
        {children}
      </aside>
    </div>
  );
};

export const EmptyState = ({
  title,
  description,
  action,
  icon,
  children,
  className = "",
}) => (
  <div className={`empty-panel standard-empty-state ${className}`.trim()}>
    {icon ? <div className="standard-empty-icon" aria-hidden="true">{icon}</div> : null}
    <div>
      <h3>{title}</h3>
      {description ? <p>{description}</p> : children ? <p>{children}</p> : null}
    </div>
    {action ? <div className="standard-empty-action">{action}</div> : null}
  </div>
);

const normalizeStatus = (status) => String(status || "unknown").toLowerCase().replace(/[_\s]+/g, "-");

const formatStatus = (status) =>
  String(status || "Unknown")
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());

export const StatusBadge = ({ status }) => (
  <span className={`status status-${normalizeStatus(status)}`}>{formatStatus(status)}</span>
);

export const AttentionBadge = ({ children }) => <span className="status status-warning">{children}</span>;

export const ExternalTextLink = ({ href, children = "Open link" }) => {
  if (!href) return <span className="muted">Not set</span>;

  return (
    <a className="short-link" href={href} target="_blank" rel="noreferrer" title={href}>
      {children}
    </a>
  );
};

export const TabButton = ({ active, children, ...props }) => (
  <button className={`tab-button ${active ? "active" : ""}`} type="button" {...props}>
    {children}
  </button>
);

export const PreserveScrollDisclosure = ({ label, openLabel, children, className = "" }) => {
  const [open, setOpen] = useState(false);

  const toggle = () => {
    const scrollX = window.scrollX;
    const scrollY = window.scrollY;
    setOpen((current) => !current);
    requestAnimationFrame(() => window.scrollTo(scrollX, scrollY));
  };

  return (
    <section className={`raw-text-toggle disclosure-toggle ${className}`.trim()}>
      <button className="disclosure-summary" type="button" aria-expanded={open} onClick={toggle}>
        {open ? openLabel || label.replace(/^Show/i, "Hide") : label}
      </button>
      {open ? <div className="disclosure-content">{children}</div> : null}
    </section>
  );
};

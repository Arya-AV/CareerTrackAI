import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import { AppShell } from "../components/AppShell.jsx";
import { toast } from "../components/ToastProvider.jsx";
import { EmptyState, ExternalTextLink, MetricCard, PageShell, StandardCard, TabButton, StatusBadge } from "../components/ui.jsx";
import { getCompany } from "../api/companies.api.js";
import { createNote } from "../api/notes.api.js";

const StatusBreakdown = ({ rows = [] }) => {
  if (!rows.length) return <p className="muted">No outcomes yet.</p>;

  return (
    <dl className="company-breakdown">
      {rows.map((row) => (
        <div key={row.status}>
          <dt>{row.status}</dt>
          <dd>{row.count}</dd>
        </div>
      ))}
    </dl>
  );
};

export const CompanyDetailPage = () => {
  const { name } = useParams();
  const companyName = decodeURIComponent(name);
  const queryClient = useQueryClient();
  const [noteForm, setNoteForm] = useState({ title: "", content: "" });
  const [activeTab, setActiveTab] = useState("Overview");
  const companyQuery = useQuery({
    queryKey: ["company", companyName],
    queryFn: () => getCompany(companyName)
  });

  const createNoteMutation = useMutation({
    mutationFn: createNote,
    onSuccess() {
      setNoteForm({ title: "", content: "" });
      toast.success("Company note created.");
      queryClient.invalidateQueries({ queryKey: ["company", companyName] });
      queryClient.invalidateQueries({ queryKey: ["notes"] });
      queryClient.invalidateQueries({ queryKey: ["note-tags"] });
    },
    onError(error) {
      toast.error(error.response?.data?.message || "Unable to save company note.");
    }
  });

  const company = companyQuery.data;

  const updateNoteForm = (event) => {
    setNoteForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  };

  const submitNote = (event) => {
    event.preventDefault();
    createNoteMutation.mutate({
      title: noteForm.title,
      content: noteForm.content,
      company: company?.companyName || companyName,
      type: "Company Experience",
      tags: ["Company Experience"]
    });
  };

  return (
    <AppShell title={company?.companyName || companyName} eyebrow="Company Intelligence">
      <section className="content-grid">
        <PageShell eyebrow="Company Intelligence" title={company?.companyName || companyName} accent="tracker">
          {companyQuery.isLoading ? <p>Loading company...</p> : null}
          {companyQuery.error ? <p className="error">Unable to load company intelligence</p> : null}
          {company ? (
            <>
            <section className="company-summary-grid">
              <MetricCard label="Applications" value={company.applicationCount} />
              <MetricCard label="Current stage" value={company.currentStage} />
              <MetricCard
                label="Avg response time"
                value={company.averageResponseTimeHours === null ? "N/A" : `${company.averageResponseTimeHours}h`}
              />
            </section>

            <nav className="tabs" aria-label="Company sections">
              {["Overview", "Timeline", "Notes", "Contacts"].map((tab) => (
                <TabButton active={activeTab === tab} onClick={() => setActiveTab(tab)} key={tab}>
                  {tab}
                </TabButton>
              ))}
            </nav>

            {activeTab === "Overview" ? (
              <StandardCard label="Outcomes breakdown" secondary="Based only on your tracked applications.">
              <StatusBreakdown rows={company.outcomesBreakdown} />
              </StandardCard>
            ) : null}

            {activeTab === "Timeline" ? (
              <StandardCard label="Application timeline" secondary="Your history with this company.">
              {company.timeline.length ? (
                <div className="table-scroll">
                  <table>
                    <thead>
                      <tr>
                        <th>Role</th>
                        <th>Status</th>
                        <th>Applied</th>
                        <th>Source</th>
                      </tr>
                    </thead>
                    <tbody>
                      {company.timeline.map((application) => (
                        <tr key={application._id}>
                          <td>
                            <Link to={`/app/applications/${application._id}`}>{application.role}</Link>
                          </td>
                          <td>
                            <StatusBadge status={application.status} />
                          </td>
                          <td>{new Date(application.appliedDate).toLocaleDateString()}</td>
                          <td>{application.source}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <EmptyState title="No applications found" description="No tracked applications are linked to this company yet." />
              )}
              </StandardCard>
            ) : null}

            {activeTab === "Notes" ? (
              <StandardCard label="Company experience notes" secondary="Notes saved for this company.">
                <form className="company-note-form" onSubmit={submitNote}>
                  <label>
                    Title
                    <input name="title" value={noteForm.title} onChange={updateNoteForm} required />
                  </label>
                  <label>
                    Experience
                    <textarea name="content" value={noteForm.content} onChange={updateNoteForm} rows="4" required />
                  </label>
                  {createNoteMutation.error ? <p className="error">Unable to save company note</p> : null}
                  <button type="submit" disabled={createNoteMutation.isPending}>
                    {createNoteMutation.isPending ? "Saving..." : "Add company note"}
                  </button>
                </form>
                {company.companyExperienceNotes.length ? (
                  <div className="note-card-grid">
                    {company.companyExperienceNotes.map((note) => (
                      <StandardCard className="note-card" key={note._id} secondary={note.type} label={note.title}>
                        <p className="note-content">{note.content}</p>
                      </StandardCard>
                    ))}
                  </div>
                ) : (
                  <p className="muted">No company experience notes yet.</p>
                )}
              </StandardCard>
            ) : null}

            {activeTab === "Contacts" ? (
              <StandardCard label="Linked contacts" secondary="Contacts and referrers tied to this company.">
                {company.contacts.length ? (
                  <div className="contact-card-grid">
                    {company.contacts.map((contact) => (
                      <StandardCard
                        className="contact-card"
                        key={contact._id}
                        secondary={contact.company}
                        label={contact.name}
                        metadata={[{ label: "Role", value: contact.role || "Role not set" }]}
                        actions={
                          <>
                            <Link className="button-link secondary-link" to={`/app/contacts/${contact._id}`}>
                              Open
                            </Link>
                            {contact.linkedinUrl ? <ExternalTextLink href={contact.linkedinUrl}>LinkedIn</ExternalTextLink> : null}
                          </>
                        }
                      >
                        <p>{contact.role || "Role not set"}</p>
                      </StandardCard>
                    ))}
                  </div>
                ) : (
                  <p className="muted">No linked contacts yet.</p>
                )}
              </StandardCard>
            ) : null}
            </>
          ) : null}
        </PageShell>
      </section>
    </AppShell>
  );
};

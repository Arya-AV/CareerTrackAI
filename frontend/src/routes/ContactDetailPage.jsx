import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import { AppShell } from "../components/AppShell.jsx";
import { toast } from "../components/ToastProvider.jsx";
import { EmptyState, MetadataRow, PageShell, StandardCard, StatusBadge } from "../components/ui.jsx";
import { generateOutreachDraft, getContact, listContactApplications, updateContact } from "../api/contacts.api.js";

export const ContactDetailPage = () => {
  const { id } = useParams();
  const queryClient = useQueryClient();
  const [draftContext, setDraftContext] = useState("");
  const [draft, setDraft] = useState("");
  const [copyMessage, setCopyMessage] = useState("");
  const [showEmailedConfirm, setShowEmailedConfirm] = useState(false);

  const contactQuery = useQuery({
    queryKey: ["contact", id],
    queryFn: () => getContact(id)
  });

  const applicationsQuery = useQuery({
    queryKey: ["contact-applications", id],
    queryFn: () => listContactApplications(id)
  });

  const contact = contactQuery.data;
  const linkedApplications = applicationsQuery.data || [];

  const draftMutation = useMutation({
    mutationFn: generateOutreachDraft,
    onSuccess(data) {
      setDraft(data.draft);
      setCopyMessage("");
      toast.success(data.cached ? "Loaded saved outreach draft." : "Outreach draft generated.");
    },
    onError(error) {
      toast.error(error.response?.data?.message || "Unable to generate outreach draft.");
    }
  });

  const updateMutation = useMutation({
    mutationFn: updateContact,
    onSuccess() {
      toast.success("Outreach status updated.");
      queryClient.invalidateQueries({ queryKey: ["contact", id] });
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
    },
    onError(error) {
      toast.error(error.response?.data?.message || "Unable to update outreach status.");
    }
  });

  useEffect(() => {
    setDraft("");
    setCopyMessage("");
  }, [id]);

  const requestDraft = () => {
    draftMutation.mutate({
      id,
      payload: {
        purpose: "Ask for a referral or career advice",
        context: draftContext
      }
    });
  };

  const copyDraft = async () => {
    try {
      await navigator.clipboard.writeText(draft);
      setCopyMessage("Draft copied to clipboard.");
      toast.success("Cold email draft copied.");
      setShowEmailedConfirm(true);
    } catch (_error) {
      toast.error("Unable to copy draft to clipboard.");
    }
  };

  const markAsEmailed = () => {
    setShowEmailedConfirm(false);
    updateMutation.mutate({
      id,
      payload: {
        outreachStatus: "Emailed",
        lastContactedAt: new Date().toISOString()
      }
    });
  };

  return (
    <AppShell title={contact?.name || "Contact"} eyebrow={contact?.company || "Referral Network"}>
      <section className="content-grid">
        <PageShell eyebrow={contact?.company || "Referral Network"} title={contact?.name || "Contact"} accent="tracker">
          {contactQuery.isLoading ? <p>Loading contact...</p> : null}
          {contactQuery.error ? <p className="error">Unable to load contact</p> : null}
          {contact ? (
            <StandardCard
              secondary={contact.company}
              label={contact.role || "Role not set"}
              badge={
                <>
                  {contact.contactType ? <StatusBadge status={contact.contactType} /> : null}
                  {contact.outreachStatus ? <StatusBadge status={contact.outreachStatus} /> : null}
                </>
              }
              metadata={[
                { label: "Company", value: contact.company },
                { label: "Email", value: contact.email || "Not set" },
                { label: "Last contacted", value: contact.lastContactedAt ? new Date(contact.lastContactedAt).toLocaleString() : "Not set" }
              ]}
              actions={contact.linkedinUrl ? <a className="button-link" href={contact.linkedinUrl} target="_blank" rel="noreferrer">LinkedIn</a> : null}
            >
              <section>
                <h4>Notes</h4>
                <p>{contact.notes || "No notes yet."}</p>
              </section>
            </StandardCard>
          ) : null}

          {contact ? (
            <StandardCard className="outreach-panel" label="AI outreach draft" secondary="Generate a draft only. Copy this draft and send from your email client.">
            <label>
              Additional context
              <textarea
                value={draftContext}
                onChange={(event) => setDraftContext(event.target.value)}
                rows="3"
                placeholder="Mention the job, referral ask, or shared context you want included."
              />
            </label>
            <button type="button" onClick={requestDraft} disabled={draftMutation.isPending}>
              {draftMutation.isPending ? "Generating..." : draft ? "Regenerate" : "Generate draft"}
            </button>
            {draftMutation.error ? <p className="error">Unable to generate outreach draft.</p> : null}
            {draft ? (
              <div className="outreach-draft-box">
                <label>
                  Draft
                  <textarea value={draft} onChange={(event) => setDraft(event.target.value)} rows="12" />
                </label>
                <p className="muted">Copy this draft and send from your email client.</p>
                <div className="action-row">
                  <button type="button" onClick={copyDraft} disabled={!draft.trim() || updateMutation.isPending}>
                    Copy to clipboard
                  </button>
                  <button className="ghost-button" type="button" onClick={requestDraft} disabled={draftMutation.isPending}>
                    Regenerate
                  </button>
                </div>
                {copyMessage ? <p className="success">{copyMessage}</p> : null}
                {showEmailedConfirm ? (
                  <div className="inline-confirm inline-confirm-block">
                    <span>Mark as Emailed?</span>
                    <button className="danger-button" type="button" onClick={markAsEmailed} disabled={updateMutation.isPending}>
                      Yes
                    </button>
                    <button className="ghost-button" type="button" onClick={() => setShowEmailedConfirm(false)}>
                      Cancel
                    </button>
                  </div>
                ) : null}
                {updateMutation.error ? <p className="error">Draft copied, but outreach status could not be updated.</p> : null}
              </div>
            ) : null}
            </StandardCard>
          ) : null}

          <StandardCard label="Linked applications" secondary="Applications referred by this contact.">
          {applicationsQuery.isLoading ? <p>Loading linked applications...</p> : null}
          {applicationsQuery.error ? <p className="error">Unable to load linked applications</p> : null}
          {!applicationsQuery.isLoading && linkedApplications.length === 0 ? (
            <EmptyState title="No linked referrals yet" description="No applications are connected to this contact yet." />
          ) : null}
          {linkedApplications.length ? (
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Company</th>
                    <th>Role</th>
                    <th>Application status</th>
                    <th>Referral status</th>
                    <th>Follow-up</th>
                  </tr>
                </thead>
                <tbody>
                  {linkedApplications.map(({ referral, application }) => (
                    <tr key={referral._id}>
                      <td>
                        {application ? (
                          <Link to={`/app/applications/${application._id}`}>{application.companyName}</Link>
                        ) : (
                          referral.company
                        )}
                      </td>
                      <td>{application?.role || "Not linked"}</td>
                      <td>
                        {application?.status ? (
                          <StatusBadge status={application.status} />
                        ) : (
                          "Not linked"
                        )}
                      </td>
                      <td>{referral.referralStatus ? <StatusBadge status={referral.referralStatus} /> : "-"}</td>
                      <td>{referral.followUpDate ? new Date(referral.followUpDate).toLocaleDateString() : "Not set"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
          </StandardCard>
        </PageShell>
      </section>
    </AppShell>
  );
};

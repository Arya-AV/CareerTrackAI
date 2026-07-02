import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ExternalLink, Plus, Trash2 } from "lucide-react";
import { Link } from "react-router-dom";
import { AppShell } from "../components/AppShell.jsx";
import { toast } from "../components/ToastProvider.jsx";
import { AttentionBadge, Drawer, EmptyState, InlineConfirmButton, MetadataRow, PageShell, PreserveScrollDisclosure, StandardCard, StatusBadge } from "../components/ui.jsx";
import { convertToApplication, createToApply, deleteToApply, listToApply, updateToApply } from "../api/toApply.api.js";
import { useState } from "react";

const emptyForm = {
  companyName: "",
  jobLink: "",
  roleTitle: "",
  deadlineDate: "",
  notes: ""
};

const formatDate = (value) => (value ? new Date(value).toLocaleDateString() : "Not set");

const nextReminder = (entry) =>
  entry.reminders
    ?.filter((reminder) => ["Pending", "Failed"].includes(reminder.status))
    .sort((a, b) => new Date(a.scheduledFor) - new Date(b.scheduledFor))[0];

export const ToApplyPage = () => {
  const queryClient = useQueryClient();
  const [form, setForm] = useState(emptyForm);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const toApplyQuery = useQuery({
    queryKey: ["to-apply", "pending"],
    queryFn: () => listToApply({ status: "pending", limit: 100 })
  });

  const createMutation = useMutation({
    mutationFn: createToApply,
    onSuccess() {
      setForm(emptyForm);
      setIsDrawerOpen(false);
      toast.success("Saved to To Apply.");
      queryClient.invalidateQueries({ queryKey: ["to-apply"] });
    },
    onError(error) {
      toast.error(error.response?.data?.message || "Unable to save job.");
    }
  });

  const dismissMutation = useMutation({
    mutationFn: ({ id }) => updateToApply({ id, payload: { status: "dismissed" } }),
    onSuccess() {
      toast.success("Saved job dismissed.");
      queryClient.invalidateQueries({ queryKey: ["to-apply"] });
    },
    onError(error) {
      toast.error(error.response?.data?.message || "Unable to dismiss saved job.");
    }
  });

  const deleteMutation = useMutation({
    mutationFn: deleteToApply,
    onSuccess() {
      toast.success("Saved job deleted.");
      queryClient.invalidateQueries({ queryKey: ["to-apply"] });
    },
    onError(error) {
      toast.error(error.response?.data?.message || "Unable to delete saved job.");
    }
  });

  const convertMutation = useMutation({
    mutationFn: convertToApplication,
    onSuccess() {
      toast.success("Marked as applied and created application.");
      queryClient.invalidateQueries({ queryKey: ["to-apply"] });
      queryClient.invalidateQueries({ queryKey: ["applications"] });
    },
    onError(error) {
      toast.error(error.response?.data?.message || "Unable to mark as applied.");
    }
  });

  const updateForm = (event) => {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  };

  const submit = (event) => {
    event.preventDefault();
    createMutation.mutate({
      ...form,
      deadlineDate: form.deadlineDate || undefined
    });
  };

  const entries = toApplyQuery.data || [];

  return (
    <AppShell title="To Apply" eyebrow="Pre-Application Queue">
      <section className="content-grid">
        <PageShell
          eyebrow="Pre-Application Queue"
          title="To Apply"
          accent="tracker"
          action={
            <button type="button" onClick={() => setIsDrawerOpen(true)}>
              <Plus size={18} />
              Save to queue
            </button>
          }
        >
          <section className="to-apply-list">
          {toApplyQuery.isLoading ? <p>Loading saved jobs...</p> : null}
          {toApplyQuery.error ? <p className="error">Unable to load To Apply queue</p> : null}
          {!toApplyQuery.isLoading && entries.length === 0 ? (
            <EmptyState
              title="No saved jobs yet"
              description="Paste a posting link here before it gets buried."
              className="notes-empty"
              action={
                <button type="button" onClick={() => setIsDrawerOpen(true)}>
                  <Plus size={18} />
                  Save to queue
                </button>
              }
            />
          ) : null}

          {entries.map((entry) => {
            const reminder = nextReminder(entry);
            const deadlineSoon =
              entry.deadlineDate && new Date(entry.deadlineDate) <= new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
            const reminderSoon =
              reminder && new Date(reminder.scheduledFor) <= new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);

            return (
              <StandardCard
                className={`to-apply-card ${deadlineSoon || reminderSoon ? "needs-attention" : ""}`}
                key={entry._id}
                secondary="To Apply"
                label={entry.companyName}
                badge={
                  <div className="badge-stack">
                    {deadlineSoon || reminderSoon ? <AttentionBadge>Needs attention</AttentionBadge> : null}
                    <StatusBadge status={entry.status} />
                  </div>
                }
                metadata={[
                  { label: "Role", value: entry.roleTitle || "Role title not set" },
                  ...(entry.deadlineDate ? [{ label: "Deadline", value: formatDate(entry.deadlineDate) }] : []),
                  ...(reminder ? [{ label: "Reminder", value: `${formatDate(reminder.scheduledFor)} (${reminder.status})` }] : [])
                ]}
                actions={
                  <>
                    <a className="button-link secondary-link" href={entry.jobLink} target="_blank" rel="noreferrer">
                      <ExternalLink size={16} />
                      Open posting
                    </a>
                    <InlineConfirmButton
                      className=""
                      confirmLabel="Yes, mark as applied"
                      message="Mark as applied? This will create an Application record for this posting."
                      onConfirm={() => convertMutation.mutate(entry._id)}
                      disabled={convertMutation.isPending}
                    >
                      Mark as Applied
                    </InlineConfirmButton>
                    <InlineConfirmButton
                      className="ghost-button"
                      confirmLabel="Yes, dismiss"
                      message="Dismiss this posting? It will be removed from your queue."
                      onConfirm={() => dismissMutation.mutate({ id: entry._id })}
                      disabled={dismissMutation.isPending}
                    >
                      Dismiss
                    </InlineConfirmButton>
                    <InlineConfirmButton
                      aria-label="Delete saved job"
                      message="Delete this saved job?"
                      onConfirm={() => deleteMutation.mutate(entry._id)}
                      disabled={deleteMutation.isPending}
                    >
                      <Trash2 size={16} />
                    </InlineConfirmButton>
                  </>
                }
              >
                {entry.notes ? (
                  <PreserveScrollDisclosure label="Show saved notes" openLabel="Hide saved notes">
                    <p>{entry.notes}</p>
                  </PreserveScrollDisclosure>
                ) : null}
                {convertMutation.data?.entry?._id === entry._id ? (
                  <p className="success">
                    Application created. <Link to={`/app/applications/${convertMutation.data.application._id}`}>Open it</Link>
                  </p>
                ) : null}
              </StandardCard>
            );
          })}
          </section>
        </PageShell>
      </section>

      <Drawer
        open={isDrawerOpen}
        title="Save a job to apply later"
        description="Keep promising postings visible until your resume or timing is ready."
        onClose={() => setIsDrawerOpen(false)}
      >
        <form className="form-panel to-apply-form drawer-form" onSubmit={submit}>
          <label>
            Company
            <input name="companyName" value={form.companyName} onChange={updateForm} required />
          </label>
          <label>
            Job link
            <input name="jobLink" type="url" value={form.jobLink} onChange={updateForm} required />
          </label>
          <div className="form-row">
            <label>
              Role title
              <input name="roleTitle" value={form.roleTitle} onChange={updateForm} placeholder="Optional" />
            </label>
            <label>
              Deadline
              <input name="deadlineDate" type="date" value={form.deadlineDate} onChange={updateForm} />
            </label>
          </div>
          <label>
            Notes
            <textarea name="notes" value={form.notes} onChange={updateForm} rows="4" />
          </label>
          {createMutation.error ? <p className="error">{createMutation.error.response?.data?.message || "Unable to save job"}</p> : null}
          <button type="submit" disabled={createMutation.isPending}>
            <Plus size={18} />
            {createMutation.isPending ? "Saving..." : "Save to queue"}
          </button>
        </form>
      </Drawer>
    </AppShell>
  );
};

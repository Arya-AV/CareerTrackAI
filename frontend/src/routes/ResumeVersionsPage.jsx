import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Archive, Plus } from "lucide-react";
import { AppShell } from "../components/AppShell.jsx";
import { toast } from "../components/ToastProvider.jsx";
import { Drawer, EmptyState, PageShell, StandardCard } from "../components/ui.jsx";
import { createResumeVersion, listResumeVersions, updateResumeVersion } from "../api/resumeVersions.api.js";

const emptyForm = {
  label: "",
  content: ""
};

const PerformanceStat = ({ label, value }) => (
  <div>
    <dt>{label}</dt>
    <dd>{value}</dd>
  </div>
);

export const ResumeVersionsPage = () => {
  const queryClient = useQueryClient();
  const [form, setForm] = useState(emptyForm);
  const [includeArchived, setIncludeArchived] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const versionsQuery = useQuery({
    queryKey: ["resume-versions", includeArchived],
    queryFn: () => listResumeVersions({ includeArchived })
  });

  const createMutation = useMutation({
    mutationFn: createResumeVersion,
    onSuccess() {
      setForm(emptyForm);
      setIsDrawerOpen(false);
      toast.success("Resume version created.");
      queryClient.invalidateQueries({ queryKey: ["resume-versions"] });
    },
    onError(error) {
      toast.error(error.response?.data?.message || "Unable to save resume version.");
    }
  });

  const archiveMutation = useMutation({
    mutationFn: updateResumeVersion,
    onSuccess() {
      toast.success("Resume version archived.");
      queryClient.invalidateQueries({ queryKey: ["resume-versions"] });
    },
    onError(error) {
      toast.error(error.response?.data?.message || "Unable to archive resume version.");
    }
  });

  const updateForm = (event) => {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  };

  const submit = (event) => {
    event.preventDefault();
    createMutation.mutate(form);
  };

  const versions = versionsQuery.data || [];

  return (
    <AppShell title="Resume Versions" eyebrow="Performance Analytics">
      <section className="content-grid">
        <PageShell
          eyebrow="Performance Analytics"
          title="Resume Versions"
          accent="ai"
          action={
            <button type="button" onClick={() => setIsDrawerOpen(true)}>
              <Plus size={18} />
              Add version
            </button>
          }
        >
          <section className="resume-version-list">
          <div className="resume-version-toolbar">
            <div className="panel-header">
              <h3>Versions</h3>
              <p>Performance is based on applications linked to each version.</p>
            </div>
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={includeArchived}
                onChange={(event) => setIncludeArchived(event.target.checked)}
              />
              Show archived
            </label>
          </div>

          {versionsQuery.isLoading ? <p>Loading resume versions...</p> : null}
          {versionsQuery.error ? <p className="error">Unable to load resume versions</p> : null}
          {!versionsQuery.isLoading && versions.length === 0 ? (
            <EmptyState
              title="No resume versions yet"
              description="Create one before adding applications you want to compare."
              className="resume-version-empty"
              action={
                <button type="button" onClick={() => setIsDrawerOpen(true)}>
                  <Plus size={18} />
                  Add version
                </button>
              }
            />
          ) : null}

          <div className="resume-version-card-grid">
            {versions.map((version) => (
              <StandardCard
                className={`resume-version-card ${version.archived ? "archived" : ""}`}
                key={version._id}
                secondary={version.archived ? "Archived" : "Active"}
                label={version.label}
                metadata={[
                  { label: "Sent", value: version.performance?.applicationsSent || 0 },
                  { label: "Response rate", value: `${version.performance?.responseRate || 0}%` },
                  { label: "Interview rate", value: `${version.performance?.interviewRate || 0}%` },
                  { label: "Offer rate", value: `${version.performance?.offerRate || 0}%` }
                ]}
                actions={
                  !version.archived ? (
                    <button
                      className="icon-button ghost-button"
                      type="button"
                      aria-label="Archive resume version"
                      onClick={() => archiveMutation.mutate({ id: version._id, payload: { archived: true } })}
                    >
                      <Archive size={16} />
                    </button>
                  ) : null
                }
              >
                <p className="resume-version-preview">{version.content}</p>
              </StandardCard>
            ))}
          </div>
          </section>
        </PageShell>
      </section>

      <Drawer
        open={isDrawerOpen}
        title="Create version"
        description="Save plain-text resume variants and compare how they perform."
        onClose={() => setIsDrawerOpen(false)}
      >
        <form className="form-panel resume-version-form drawer-form" onSubmit={submit}>
          <label>
            Label
            <input name="label" value={form.label} onChange={updateForm} placeholder="Backend v1" required />
          </label>
          <label>
            Resume text
            <textarea name="content" value={form.content} onChange={updateForm} rows="12" required />
          </label>
          {createMutation.error ? <p className="error">Unable to save resume version</p> : null}
          <button type="submit" disabled={createMutation.isPending}>
            <Plus size={18} />
            {createMutation.isPending ? "Saving..." : "Save version"}
          </button>
        </form>
      </Drawer>
    </AppShell>
  );
};

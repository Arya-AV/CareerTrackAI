import { useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { BrainCircuit } from "lucide-react";
import { analyzeJd } from "../api/ai.api.js";
import { listApplications } from "../api/applications.api.js";
import { AppShell } from "../components/AppShell.jsx";
import { toast } from "../components/ToastProvider.jsx";
import { EmptyState, PageShell, StandardCard } from "../components/ui.jsx";

const SectionList = ({ title, items, emphasized = false, tone = "default" }) => (
  <StandardCard className={`result-section ai-result-section ai-result-${tone} ${emphasized ? "emphasized" : ""}`} label={title}>
    {items.length ? (
      <ul>
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    ) : (
      <p className="muted">No items returned.</p>
    )}
  </StandardCard>
);

export const JDAnalyzerPage = () => {
  const [jdText, setJdText] = useState("");
  const [applicationId, setApplicationId] = useState("");

  const applicationsQuery = useQuery({
    queryKey: ["applications", "ai-selector"],
    queryFn: () => listApplications({ limit: 100 })
  });

  const mutation = useMutation({
    mutationFn: analyzeJd,
    onSuccess(data) {
      toast.success(data.cached ? "Loaded saved JD analysis." : "JD analysis saved.");
    },
    onError(error) {
      toast.error(error.response?.data?.message || "Unable to analyze this job description.");
    }
  });

  const selectedApplication = useMemo(
    () => applicationsQuery.data?.items?.find((item) => item._id === applicationId),
    [applicationsQuery.data, applicationId]
  );

  const submit = (event) => {
    event.preventDefault();
    mutation.mutate({
      jdText,
      applicationId: applicationId || undefined,
      useSavedProfile: true
    });
  };

  const result = mutation.data?.analysis?.result;

  return (
    <AppShell title="JD Analyzer" eyebrow="AI">
      <section className="content-grid">
        <PageShell eyebrow="AI" title="JD Analyzer" accent="ai">
          <section className="ai-layout">
        <StandardCard className="form-panel ai-form" label="Analyze job description" secondary="Paste a JD and compare it against your saved profile.">
          <form className="stacked-form" onSubmit={submit}>
          <label>
            Link to application
            <select value={applicationId} onChange={(event) => setApplicationId(event.target.value)}>
              <option value="">No linked application</option>
              {applicationsQuery.data?.items?.map((application) => (
                <option key={application._id} value={application._id}>
                  {application.companyName} - {application.role}
                </option>
              ))}
            </select>
          </label>
          <label>
            Job description
            <textarea
              name="jdText"
              value={jdText}
              onChange={(event) => setJdText(event.target.value)}
              rows="14"
              placeholder="Paste the full job description here..."
              required
            />
          </label>
          {selectedApplication ? (
            <p className="muted">Result will be saved to {selectedApplication.companyName}.</p>
          ) : null}
          {mutation.error ? (
            <p className="error">{mutation.error.response?.data?.message || "Unable to analyze this job description"}</p>
          ) : null}
          <button type="submit" disabled={mutation.isPending || jdText.trim().length < 20}>
            <BrainCircuit size={18} />
            {mutation.isPending ? "Analyzing..." : "Analyze JD"}
          </button>
          </form>
        </StandardCard>

        <div className="ai-results">
          {!result && !mutation.isPending ? (
            <EmptyState
              title="Paste a JD to analyze it"
              description="The result will separate required skills, missing skills, resume keywords, prep actions, and DSA topics."
            />
          ) : null}

          {mutation.isPending ? (
            <EmptyState title="Analyzing..." description="Gemini is extracting structured sections for the tracker." />
          ) : null}

          {result?.warning ? (
            <div className="warning-panel">
              <h3>Check the input</h3>
              <p>{result.warning}</p>
            </div>
          ) : null}

          {result && !result.warning ? (
            <>
              <div className="analysis-meta">
                <span>{mutation.data.cached ? "Loaded from cache" : "New analysis saved"}</span>
                {mutation.data.analysis.applicationId ? <span>Linked to application</span> : null}
              </div>
              <SectionList title="Missing Skills" items={result.missing_skills} emphasized tone="missing" />
              <SectionList title="Required Skills" items={result.required_skills} tone="required" />
              <SectionList title="Resume Keyword Suggestions" items={result.resume_keyword_suggestions} tone="keywords" />
              <SectionList title="Prep Checklist" items={result.prep_checklist} tone="prep" />
              <SectionList title="DSA Topics To Revise" items={result.dsa_topics_to_revise} tone="dsa" />
            </>
          ) : null}
        </div>
          </section>
        </PageShell>
      </section>
    </AppShell>
  );
};

import { useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Gauge } from "lucide-react";
import { resumeMatch } from "../api/ai.api.js";
import { listApplications } from "../api/applications.api.js";
import { AppShell } from "../components/AppShell.jsx";
import { toast } from "../components/ToastProvider.jsx";
import { EmptyState, PageShell, StandardCard } from "../components/ui.jsx";

const KeywordList = ({ title, items, emphasized = false, tone = "neutral" }) => (
  <StandardCard className={emphasized ? "result-section emphasized" : "result-section"} label={title}>
    <div className={`keyword-list keyword-list-${tone}`}>
      {items.map((item) => (
        <span key={item}>{item}</span>
      ))}
    </div>
  </StandardCard>
);

const ScoreGauge = ({ score }) => (
  <section className="score-panel resume-score-hero">
    <div className="score-ring" style={{ "--score": `${score * 3.6}deg` }}>
      <div>
        <strong>{score}%</strong>
        <span>Match</span>
      </div>
    </div>
  </section>
);

export const ResumeMatchPage = () => {
  const [resumeText, setResumeText] = useState("");
  const [jdText, setJdText] = useState("");
  const [applicationId, setApplicationId] = useState("");

  const applicationsQuery = useQuery({
    queryKey: ["applications", "resume-match-selector"],
    queryFn: () => listApplications({ limit: 100 })
  });

  const mutation = useMutation({
    mutationFn: resumeMatch,
    onSuccess(data) {
      toast.success(data.cached ? "Loaded saved resume match." : "Resume match saved.");
    },
    onError(error) {
      toast.error(error.response?.data?.message || "Unable to match this resume.");
    }
  });

  const selectedApplication = useMemo(
    () => applicationsQuery.data?.items?.find((item) => item._id === applicationId),
    [applicationsQuery.data, applicationId]
  );

  const submit = (event) => {
    event.preventDefault();
    mutation.mutate({
      resumeText,
      jdText,
      applicationId: applicationId || undefined
    });
  };

  const result = mutation.data?.analysis?.result;
  const hasWarning = Boolean(result?.warning);

  return (
    <AppShell title="Resume Match" eyebrow="AI">
      <section className="content-grid">
        <PageShell eyebrow="AI" title="Resume Match" accent="ai">
          <section className="ai-layout">
        <StandardCard className="form-panel ai-form" label="Score resume fit" secondary="Paste resume text and a JD to compare role alignment.">
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
            Resume text
            <textarea
              name="resumeText"
              value={resumeText}
              onChange={(event) => setResumeText(event.target.value)}
              rows="12"
              placeholder="Paste resume text here..."
              required
            />
          </label>
          <label>
            Job description
            <textarea
              name="jdText"
              value={jdText}
              onChange={(event) => setJdText(event.target.value)}
              rows="12"
              placeholder="Paste the job description here..."
              required
            />
          </label>
          {selectedApplication ? <p className="muted">Result will be saved to {selectedApplication.companyName}.</p> : null}
          {mutation.error ? (
            <p className="error">{mutation.error.response?.data?.message || "Unable to match this resume"}</p>
          ) : null}
          <button type="submit" disabled={mutation.isPending || resumeText.trim().length < 20 || jdText.trim().length < 20}>
            <Gauge size={18} />
            {mutation.isPending ? "Scoring..." : "Score Resume"}
          </button>
          </form>
        </StandardCard>

        <div className="ai-results">
          {!result && !mutation.isPending ? (
            <EmptyState
              title="Paste a resume and JD"
              description="The result will score fit, compare keywords, and suggest high-impact bullet revisions."
            />
          ) : null}

          {mutation.isPending ? (
            <EmptyState title="Scoring..." description="Gemini is comparing the resume against the role requirements." />
          ) : null}

          {hasWarning ? (
            <div className="warning-panel score-warning">
              <h3>Unable to score this input</h3>
              <p>{result.warning}</p>
            </div>
          ) : null}

          {result && !hasWarning ? (
            <>
              <div className="analysis-meta">
                <span>{mutation.data.cached ? "Loaded from cache" : "New match saved"}</span>
                {mutation.data.analysis.applicationId ? <span>Linked to application</span> : null}
              </div>
              <ScoreGauge score={Math.round(result.match_percentage)} />
              {result.score_justification ? (
                <StandardCard className="result-section" label="Score Justification">
                  <p>{result.score_justification}</p>
                </StandardCard>
              ) : null}
              <KeywordList title="Missing Keywords" items={result.missing_keywords} emphasized tone="missing" />
              <KeywordList title="Matched Keywords" items={result.matched_keywords} tone="matched" />
              <StandardCard className="result-section" label="Bullet Suggestions">
                <div className="bullet-suggestions">
                  {result.bullet_suggestions.map((suggestion) => (
                    <article key={`${suggestion.original}-${suggestion.improved}`}>
                      <p className="muted">Original</p>
                      <p>{suggestion.original}</p>
                      <p className="muted">Improved</p>
                      <p>{suggestion.improved}</p>
                      <p className="suggestion-reason">{suggestion.reason}</p>
                    </article>
                  ))}
                </div>
              </StandardCard>
            </>
          ) : null}
        </div>
          </section>
        </PageShell>
      </section>
    </AppShell>
  );
};

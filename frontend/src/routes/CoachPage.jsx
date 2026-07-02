import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Sparkles } from "lucide-react";
import { AppShell } from "../components/AppShell.jsx";
import { toast } from "../components/ToastProvider.jsx";
import { EmptyState, PageShell, StandardCard } from "../components/ui.jsx";
import { generateDigest, getLatestDigest } from "../api/digests.api.js";

const formatDate = (value) => (value ? new Date(value).toLocaleString() : "Not generated yet");

export const CoachPage = () => {
  const queryClient = useQueryClient();
  const digestQuery = useQuery({
    queryKey: ["weekly-digest", "latest"],
    queryFn: getLatestDigest
  });

  const generateMutation = useMutation({
    mutationFn: generateDigest,
    onSuccess() {
      toast.success("Weekly coach digest generated.");
      queryClient.invalidateQueries({ queryKey: ["weekly-digest", "latest"] });
    },
    onError(error) {
      toast.error(error.response?.data?.message || "Unable to generate digest right now.");
    }
  });

  const digest = digestQuery.data;
  const priorityAction = digest?.suggestions?.[0] || "Generate your weekly digest to get a focused next step.";

  return (
    <AppShell title="Weekly Career Coach" eyebrow="AI Coach">
      <section className="content-grid">
        <PageShell
          eyebrow="AI Coach"
          title="Weekly Career Coach"
          accent="ai"
          action={
            <button
              type="button"
              onClick={() => generateMutation.mutate()}
              disabled={generateMutation.isPending}
            >
              <Sparkles size={18} />
              {generateMutation.isPending ? "Generating..." : "Generate now"}
            </button>
          }
        >
          <section className="coach-layout">
            {digestQuery.isLoading ? <p>Loading coach digest...</p> : null}
            {digestQuery.error ? <p className="error">Unable to load weekly coach digest</p> : null}
            {generateMutation.error ? (
              <p className="error">
                {generateMutation.error.response?.data?.message || "Unable to generate digest right now"}
              </p>
            ) : null}

            {!digestQuery.isLoading && !digest ? (
              <EmptyState
                title="No weekly digest yet"
                description="Generate your first digest after adding applications, JD analyses, or notes."
                action={
                  <button
                    type="button"
                    onClick={() => generateMutation.mutate()}
                    disabled={generateMutation.isPending}
                  >
                    <Sparkles size={18} />
                    {generateMutation.isPending ? "Generating..." : "Generate now"}
                  </button>
                }
              />
            ) : null}

            {digest ? (
              <StandardCard
                className="coach-card"
                secondary={`Week of ${new Date(digest.weekOf).toLocaleDateString()}`}
                label="Your coach summary"
                metadata={[
                  { label: "Generated", value: formatDate(digest.generatedAt) }
                ]}
              >
                <section className="coach-callout">
                  <p className="eyebrow">Priority Action</p>
                  <h3>{priorityAction}</h3>
                </section>
                <p className="coach-summary">{digest.summaryText}</p>
                <section>
                  <h3>Action plan</h3>
                  <ol className="coach-suggestions">
                    {digest.suggestions?.map((suggestion) => (
                      <li key={suggestion}>{suggestion}</li>
                    ))}
                  </ol>
                </section>
              </StandardCard>
            ) : null}
          </section>
        </PageShell>
      </section>
    </AppShell>
  );
};

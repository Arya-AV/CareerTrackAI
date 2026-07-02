import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { AppShell } from "../components/AppShell.jsx";
import { EmptyState, PageShell, StandardCard } from "../components/ui.jsx";
import { listSkillGaps } from "../api/skillGaps.api.js";

export const SkillGapsPage = () => {
  const skillGapsQuery = useQuery({
    queryKey: ["skill-gaps"],
    queryFn: listSkillGaps
  });

  const skillGaps = skillGapsQuery.data || [];
  const maxGap = Math.max(...skillGaps.map((gap) => gap.gapCount), 1);

  return (
    <AppShell title="Skill Gaps" eyebrow="Progress">
      <section className="content-grid">
        <PageShell eyebrow="Progress" title="Skill Gaps" accent="ai">
          {skillGapsQuery.isLoading ? <p>Loading skill gaps...</p> : null}
          {skillGapsQuery.error ? <p className="error">Unable to load skill gaps</p> : null}
          {!skillGapsQuery.isLoading && skillGaps.length === 0 ? (
            <EmptyState
              title="No skill gaps yet"
              description="Analyze job descriptions to start tracking repeated skill requirements."
            />
          ) : null}

          {skillGaps.length ? (
            <StandardCard className="skill-gap-panel" label="Top gaps" secondary="Sorted by requested skills that are not yet matched in your profile or resume.">
            <div className="skill-gap-list">
              {skillGaps.map((gap) => {
                const width = `${Math.max((gap.gapCount / maxGap) * 100, 4)}%`;

                return (
                  <StandardCard
                    className="skill-gap-row"
                    key={gap._id}
                    secondary="Skill"
                    label={gap.skillName}
                    metadata={[
                      { label: "Requested", value: `${gap.timesRequested} times` },
                      { label: "Matched", value: `${gap.timesMatched} times` },
                      { label: "Gap", value: gap.gapCount }
                    ]}
                    actions={
                      <Link
                        className="button-link"
                        to={`/app/notes?type=${encodeURIComponent("Revision Note")}&skill=${encodeURIComponent(gap.skillName)}`}
                      >
                        Add revision note
                      </Link>
                    }
                  >
                    <div className="skill-gap-bar" aria-label={`${gap.gapCount} gap count`}>
                      <span style={{ width }} />
                    </div>
                  </StandardCard>
                );
              })}
            </div>
            </StandardCard>
          ) : null}
        </PageShell>
      </section>
    </AppShell>
  );
};

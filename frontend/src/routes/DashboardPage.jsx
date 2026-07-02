import { useQueries } from "@tanstack/react-query";
import { ArrowDownRight, ArrowRight, ArrowUpRight } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import { Link } from "react-router-dom";
import { AppShell } from "../components/AppShell.jsx";
import {
  EmptyState,
  MetadataRow,
  MetricCard,
  PageShell,
  StandardCard
} from "../components/ui.jsx";
import {
  getCompanyStatusBreakdown,
  getDashboardSummary,
  getMomentum,
  getMonthlyVolume,
  getRejectionPatterns
} from "../api/dashboard.api.js";
import { listSkillGaps } from "../api/skillGaps.api.js";
import { listReminders } from "../api/reminders.api.js";
import { getLatestDigest } from "../api/digests.api.js";
import { listToApply } from "../api/toApply.api.js";

const statusKeys = ["Applied", "OA", "Interview", "Offer", "Rejected"];

const emptySummary = {
  totalApplications: 0,
  oaShortlistedCount: 0,
  interviewCount: 0,
  rejectionCount: 0,
  offerCount: 0,
  successRate: 0,
  successRateFormula: "offers / total applications * 100"
};

const emptyMomentum = {
  current: {
    applicationsSent: 0,
    responsesReceived: 0,
    responseRate: 0,
    averageTimeToFirstResponseHours: null,
    completedFollowUpReminders: 0,
    momentumScore: 0
  },
  previous: {
    momentumScore: 0
  },
  trend: "flat",
  delta: 0,
  nudge: null
};

const TrendIcon = ({ trend }) => {
  if (trend === "up") return <ArrowUpRight size={20} />;
  if (trend === "down") return <ArrowDownRight size={20} />;
  return <ArrowRight size={20} />;
};

const normalizeStatusCounts = (statuses = []) => {
  const counts = Object.fromEntries(statusKeys.map((key) => [key, 0]));
  statuses.forEach((item) => {
    counts[item.status] = item.count;
  });
  return counts;
};

const MonthlyVolumeChart = ({ data }) => (
  <div className="chart-box">
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="label" />
        <YAxis allowDecimals={false} />
        <Tooltip />
        <Bar dataKey="count" fill="var(--section-accent)" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  </div>
);

export const DashboardPage = () => {
  const [
    summaryQuery,
    companyQuery,
    monthlyQuery,
    momentumQuery,
    rejectionPatternsQuery,
    skillGapsQuery,
    remindersQuery,
    digestQuery,
    toApplyQuery
  ] = useQueries({
    queries: [
      { queryKey: ["dashboard", "summary"], queryFn: getDashboardSummary },
      { queryKey: ["dashboard", "company-status"], queryFn: getCompanyStatusBreakdown },
      { queryKey: ["dashboard", "monthly-volume"], queryFn: getMonthlyVolume },
      { queryKey: ["dashboard", "momentum"], queryFn: getMomentum },
      { queryKey: ["dashboard", "rejection-patterns"], queryFn: getRejectionPatterns },
      { queryKey: ["skill-gaps", "dashboard"], queryFn: listSkillGaps },
      { queryKey: ["reminders", "dashboard"], queryFn: () => listReminders({ status: "Pending", limit: 5 }) },
      { queryKey: ["weekly-digest", "dashboard"], queryFn: getLatestDigest },
      { queryKey: ["to-apply", "dashboard"], queryFn: () => listToApply({ status: "pending", limit: 5 }) }
    ]
  });

  const summary = summaryQuery.data || emptySummary;
  const companyRows = companyQuery.data || [];
  const monthlyRows = monthlyQuery.data || [];
  const momentum = momentumQuery.data || emptyMomentum;
  const rejectionPattern = rejectionPatternsQuery.data?.pattern || null;
  const topSkillGaps = (skillGapsQuery.data || []).slice(0, 4);
  const reminders = remindersQuery.data || [];
  const latestSuggestion = digestQuery.data?.suggestions?.[0] || null;
  const toApplyEntries = toApplyQuery.data || [];
  const now = new Date();
  const soon = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
  const urgentToApply = toApplyEntries.filter((entry) => {
    const deadlineSoon = entry.deadlineDate && new Date(entry.deadlineDate) <= soon;
    const reminderSoon = entry.reminders?.some(
      (reminder) => reminder.status === "Pending" && new Date(reminder.scheduledFor) <= soon
    );
    return deadlineSoon || reminderSoon;
  });
  const isLoading =
    summaryQuery.isLoading ||
    companyQuery.isLoading ||
    monthlyQuery.isLoading ||
    momentumQuery.isLoading ||
    rejectionPatternsQuery.isLoading;
  const hasError =
    summaryQuery.error || companyQuery.error || monthlyQuery.error || momentumQuery.error || rejectionPatternsQuery.error;

  return (
    <AppShell title="Dashboard" eyebrow="Analytics">
      <section className="content-grid">
        <PageShell eyebrow="Analytics" title="Dashboard" accent="tracker">
          {isLoading ? <p>Loading dashboard...</p> : null}
          {hasError ? <p className="error">Unable to load dashboard analytics</p> : null}

          <section className="dashboard-momentum-hero">
            <StandardCard
              className="momentum-card dashboard-hero-momentum"
              secondary="Application Momentum"
              label={momentum.current.momentumScore}
              metadata={[
                { label: "Previous week", value: momentum.previous.momentumScore },
                { label: "Change", value: `${momentum.delta > 0 ? "+" : ""}${momentum.delta}` }
              ]}
            >
              <span className={`momentum-trend trend-${momentum.trend}`}>
                <TrendIcon trend={momentum.trend} />
                {momentum.delta > 0 ? "+" : ""}
                {momentum.delta} vs previous week
              </span>
              <MetadataRow
                className="momentum-stats"
                items={[
                  { label: "Sent", value: momentum.current.applicationsSent },
                  { label: "Responses", value: momentum.current.responsesReceived },
                  { label: "Response rate", value: `${momentum.current.responseRate}%` },
                  {
                    label: "Avg. response time",
                    value:
                      momentum.current.averageTimeToFirstResponseHours === null
                        ? "N/A"
                        : `${momentum.current.averageTimeToFirstResponseHours}h`
                  }
                ]}
              />
              {momentum.nudge ? <p className="momentum-nudge">{momentum.nudge}</p> : null}
            </StandardCard>
          </section>

          <section className="dashboard-compact-stats">
            <MetricCard label="Total applications" value={summary.totalApplications} />
            <MetricCard label="Interviews" value={summary.interviewCount} tone="interview" />
            <MetricCard label="Offers" value={summary.offerCount} tone="success" />
          </section>

          <section className="dashboard-action-row">
            <StandardCard
              className="dashboard-panel"
              secondary="To Apply"
              label={`${toApplyEntries.length} pending`}
              actions={
                <Link className="button-link secondary-link" to="/app/to-apply">
                  Review queue
                </Link>
              }
            >
              {toApplyEntries.length ? (
                <p className={urgentToApply.length ? "momentum-nudge" : "muted"}>
                  {urgentToApply.length
                    ? `${urgentToApply.length} saved job${urgentToApply.length === 1 ? "" : "s"} need attention soon.`
                    : "No saved jobs are urgent yet."}
                </p>
              ) : (
                <EmptyState
                  title="No saved jobs"
                  description="Save jobs before applying so they do not get buried."
                  action={
                    <Link className="button-link secondary-link" to="/app/to-apply">
                      Add saved job
                    </Link>
                  }
                />
              )}
            </StandardCard>

            <StandardCard
              className="dashboard-panel"
              secondary="Reminders"
              label="Upcoming"
              actions={
                <Link className="button-link secondary-link" to="/app/reminders">
                  Open reminders
                </Link>
              }
            >
              {reminders.length ? (
                <div className="compact-list">
                  {reminders.map((reminder) => (
                    <Link to="/app/reminders" key={reminder._id}>
                      <span>{reminder.subject}</span>
                      <strong>{new Date(reminder.scheduledFor).toLocaleDateString()}</strong>
                    </Link>
                  ))}
                </div>
              ) : (
                <EmptyState title="No pending reminders" description="Follow-ups, deadlines, and interview reminders will appear here." />
              )}
            </StandardCard>
          </section>

          <section className="dashboard-insight-row">
            <StandardCard className="dashboard-panel insight-card" secondary="Skill Gaps" label="Top gaps">
              {topSkillGaps.length ? (
                <div className="compact-list">
                  {topSkillGaps.map((gap) => (
                    <Link to="/app/skill-gaps" key={gap._id}>
                      <span>{gap.skillName}</span>
                      <strong>{gap.gapCount}</strong>
                    </Link>
                  ))}
                </div>
              ) : (
                <EmptyState
                  title="No skill gaps yet"
                  description="Analyze job descriptions to surface repeated missing skills."
                  action={
                    <Link className="button-link secondary-link" to="/app/ai/jd-analyzer">
                      Analyze a JD
                    </Link>
                  }
                />
              )}
            </StandardCard>

            <StandardCard
              className="dashboard-panel insight-card"
              secondary="Coach"
              label="Latest suggestion"
              actions={
                <Link className="button-link secondary-link" to="/app/coach">
                  Open coach
                </Link>
              }
            >
              {latestSuggestion ? (
                <p>{latestSuggestion}</p>
              ) : (
                <EmptyState
                  title="No coach suggestion yet"
                  description="Generate your weekly coach digest for a focused action plan."
                  action={
                    <Link className="button-link secondary-link" to="/app/coach">
                      Generate digest
                    </Link>
                  }
                />
              )}
            </StandardCard>
          </section>

          <section className="dashboard-analytics-row">
            {rejectionPattern ? (
              <StandardCard
                className="dashboard-panel rejection-insight-card insight-card"
                secondary="Rejection Pattern"
                label={`${rejectionPattern.stage.replaceAll("_", " ")} stage`}
                actions={
                  <Link className="button-link" to="/app/notes?tag=Mistake">
                    Review Mistake notes
                  </Link>
                }
              >
                <p>{rejectionPattern.message}</p>
              </StandardCard>
            ) : (
              <EmptyState
                title="No rejection pattern"
                description="A pattern card appears once one rejection stage dominates your outcomes."
                className="dashboard-empty-card"
              />
            )}

            <StandardCard
              className="dashboard-panel"
              label="Company Status Breakdown"
              secondary="Pipeline status counts by company."
            >
              {companyRows.length ? (
                <div className="table-scroll company-status-scroll">
                  <table className="company-status-table">
                    <thead>
                      <tr>
                        <th>Company</th>
                        <th>Total</th>
                        {statusKeys.map((status) => (
                          <th key={status}>{status}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {companyRows.map((row) => {
                        const counts = normalizeStatusCounts(row.statuses);
                        return (
                          <tr key={row.companyName}>
                            <td>{row.companyName}</td>
                            <td>{row.total}</td>
                            {statusKeys.map((status) => (
                              <td key={status}>{counts[status]}</td>
                            ))}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <EmptyState
                  title="No company breakdown yet"
                  description="Add your first application to see company-wise pipeline status."
                  action={
                    <Link className="button-link secondary-link" to="/app/applications/new">
                      Add application
                    </Link>
                  }
                />
              )}
            </StandardCard>
          </section>

          <section className="dashboard-secondary-analytics">
            <StandardCard
              className="dashboard-panel"
              label="Monthly Application Volume"
              secondary="Applications grouped by applied month."
            >
              {monthlyRows.length ? (
                <MonthlyVolumeChart data={monthlyRows} />
              ) : (
                <EmptyState
                  title="No monthly volume yet"
                  description="Application volume appears after you start tracking applications."
                  action={
                    <Link className="button-link secondary-link" to="/app/applications/new">
                      Add application
                    </Link>
                  }
                />
              )}
            </StandardCard>
          </section>
        </PageShell>
      </section>
    </AppShell>
  );
};

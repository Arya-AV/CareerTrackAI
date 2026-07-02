import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { AppShell } from "../components/AppShell.jsx";
import { EmptyState, PageShell, StandardCard, StatusBadge } from "../components/ui.jsx";
import { listCompanies } from "../api/companies.api.js";

export const CompaniesPage = () => {
  const companiesQuery = useQuery({
    queryKey: ["companies"],
    queryFn: listCompanies
  });

  const companies = companiesQuery.data || [];

  return (
    <AppShell title="Companies" eyebrow="Intelligence">
      <section className="content-grid">
        <PageShell eyebrow="Intelligence" title="Companies" accent="tracker">
          {companiesQuery.isLoading ? <p>Loading companies...</p> : null}
          {companiesQuery.error ? <p className="error">Unable to load companies</p> : null}
          {!companiesQuery.isLoading && companies.length === 0 ? (
            <EmptyState
              title="No companies yet"
              description="Add applications to build company-level intelligence from your own data."
            />
          ) : null}
          {companies.length ? (
            <div className="contact-card-grid">
              {companies.map((company) => (
                <StandardCard
                  key={company.companyName}
                  secondary="Company"
                  label={company.companyName}
                  badge={<StatusBadge status={company.currentStage} />}
                  metadata={[
                    { label: "Applications", value: company.applicationCount },
                    { label: "Latest applied", value: company.latestAppliedDate ? new Date(company.latestAppliedDate).toLocaleDateString() : "-" }
                  ]}
                  actions={
                    <Link className="button-link secondary-link" to={`/app/companies/${encodeURIComponent(company.companyName)}`}>
                      Open
                    </Link>
                  }
                />
              ))}
            </div>
          ) : null}
        </PageShell>
      </section>
    </AppShell>
  );
};

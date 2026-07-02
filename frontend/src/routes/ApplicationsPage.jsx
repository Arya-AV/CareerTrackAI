import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Plus, Search, Trash2, X } from "lucide-react";
import { AppShell } from "../components/AppShell.jsx";
import { toast } from "../components/ToastProvider.jsx";
import { EmptyState, InlineConfirmButton, PageShell, StandardCard, StatusBadge } from "../components/ui.jsx";
import { deleteApplication, listApplications } from "../api/applications.api.js";

const statuses = ["Applied", "OA", "Interview", "Offer", "Rejected"];
const sources = ["LinkedIn", "Referral", "Campus", "Careers page", "Other"];

const emptyFilters = {
  search: "",
  company: "",
  status: "",
  location: "",
  source: ""
};

export const ApplicationsPage = () => {
  const [filters, setFilters] = useState(emptyFilters);
  const queryClient = useQueryClient();
  const queryParams = useMemo(
    () => ({
      search: filters.search.trim() || undefined,
      company: filters.company.trim() || undefined,
      status: filters.status || undefined,
      location: filters.location.trim() || undefined,
      source: filters.source || undefined,
      limit: 100
    }),
    [filters]
  );

  const { data, isLoading, error } = useQuery({
    queryKey: ["applications", queryParams],
    queryFn: () => listApplications(queryParams)
  });

  const deleteMutation = useMutation({
    mutationFn: deleteApplication,
    onSuccess() {
      toast.success("Application deleted.");
      queryClient.invalidateQueries({ queryKey: ["applications"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
    onError(error) {
      toast.error(error.response?.data?.message || "Unable to delete application.");
    }
  });

  const updateFilter = (event) => {
    setFilters((current) => ({ ...current, [event.target.name]: event.target.value }));
  };

  const clearFilters = () => {
    setFilters(emptyFilters);
  };

  return (
    <AppShell title="Applications" eyebrow="Tracker">
      <section className="content-grid">
        <PageShell
          eyebrow="Tracker"
          title="Applications"
          accent="tracker"
          action={
            <Link className="button-link" to="/app/applications/new">
              <Plus size={16} />
              Add
            </Link>
          }
        >
          <section className="application-filter-panel">
            <label>
              <span className="filter-label">
                <Search size={16} />
                Search
              </span>
              <input
                name="search"
                value={filters.search}
                onChange={updateFilter}
                placeholder="Company, role, location..."
              />
            </label>
            <label>
              Company
              <input name="company" value={filters.company} onChange={updateFilter} placeholder="Microsoft" />
            </label>
            <label>
              Status
              <select name="status" value={filters.status} onChange={updateFilter}>
                <option value="">All statuses</option>
                {statuses.map((status) => (
                  <option key={status}>{status}</option>
                ))}
              </select>
            </label>
            <label>
              Location
              <input name="location" value={filters.location} onChange={updateFilter} placeholder="Remote" />
            </label>
            <label>
              Source
              <select name="source" value={filters.source} onChange={updateFilter}>
                <option value="">All sources</option>
                {sources.map((source) => (
                  <option key={source}>{source}</option>
                ))}
              </select>
            </label>
            <button className="ghost-button" type="button" onClick={clearFilters}>
              <X size={16} />
              Clear
            </button>
          </section>
          {isLoading ? <p>Loading...</p> : null}
          {error ? <p className="error">Unable to load applications</p> : null}
          {!isLoading && !data?.items?.length ? (
            <EmptyState
              title="No applications yet"
              description="Add your first role to start building the pipeline."
              action={
                <Link className="button-link" to="/app/applications/new">
                  <Plus size={16} />
                  Add application
                </Link>
              }
            />
          ) : null}
          {data?.items?.length ? (
            <div className="application-card-list hover-action-list">
              {data.items.map((application) => (
                <StandardCard
                  key={application._id}
                  secondary={application.role}
                  label={application.companyName}
                  badge={<StatusBadge status={application.status} />}
                  metadata={[
                    { label: "Applied", value: new Date(application.appliedDate).toLocaleDateString() },
                    { label: "Source", value: application.source },
                    { label: "Location", value: application.location || "Not set" }
                  ]}
                  actions={
                    <>
                      <Link className="button-link secondary-link" to={`/app/applications/${application._id}`}>
                        Open
                      </Link>
                      <InlineConfirmButton
                        aria-label={`Delete ${application.companyName} application`}
                        message="Delete this application? This cannot be undone. All linked interviews, notes, reminders, and OA records will also be deleted."
                        confirmLabel="Yes, delete"
                        onConfirm={() => deleteMutation.mutate(application._id)}
                        disabled={deleteMutation.isPending}
                      >
                        <Trash2 size={16} />
                      </InlineConfirmButton>
                    </>
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

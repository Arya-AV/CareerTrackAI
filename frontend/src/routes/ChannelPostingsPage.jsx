import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ExternalLink, Plus, Search, Trash2, Wand2, X } from "lucide-react";
import { AppShell } from "../components/AppShell.jsx";
import { toast } from "../components/ToastProvider.jsx";
import { Drawer, EmptyState, InlineConfirmButton, PageShell, PreserveScrollDisclosure, StandardCard } from "../components/ui.jsx";
import {
  confirmChannelPosting,
  convertChannelPostingToToApply,
  createChannelPosting,
  deleteChannelPosting,
  listChannelPostings
} from "../api/channelPostings.api.js";

const emptyManual = {
  sourceName: "",
  companyName: "",
  roleTitle: "",
  jobLink: "",
  postedDate: "",
  tagsText: ""
};

const emptyFilters = {
  search: "",
  company: "",
  source: "",
  tag: ""
};

const parseTags = (value) =>
  value
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);

const toPayload = (form, rawText = "") => ({
  sourceName: form.sourceName,
  companyName: form.companyName,
  roleTitle: form.roleTitle,
  jobLink: form.jobLink,
  postedDate: form.postedDate || undefined,
  rawText,
  tags: parseTags(form.tagsText || "")
});

export const ChannelPostingsPage = () => {
  const queryClient = useQueryClient();
  const [mode, setMode] = useState("manual");
  const [manualForm, setManualForm] = useState(emptyManual);
  const [rawText, setRawText] = useState("");
  const [reviewForm, setReviewForm] = useState(null);
  const [filters, setFilters] = useState(emptyFilters);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const queryParams = useMemo(
    () => ({
      search: filters.search.trim() || undefined,
      company: filters.company.trim() || undefined,
      source: filters.source.trim() || undefined,
      tag: filters.tag.trim() || undefined,
      limit: 100
    }),
    [filters]
  );

  const postingsQuery = useQuery({
    queryKey: ["channel-postings", queryParams],
    queryFn: () => listChannelPostings(queryParams)
  });

  const createMutation = useMutation({
    mutationFn: createChannelPosting,
    onSuccess(data) {
      if (data.mode === "ai-assisted") {
        toast.info("Posting fields extracted. Review before saving.");
        setReviewForm({
          sourceName: "",
          companyName: data.extraction.companyName || "",
          roleTitle: data.extraction.roleTitle || "",
          jobLink: data.extraction.jobLink || "",
          postedDate: "",
          tagsText: "",
          rawText: data.extraction.rawText || rawText,
          warning: data.extraction.warning || null
        });
        return;
      }

      setManualForm(emptyManual);
      setIsDrawerOpen(false);
      toast.success("Channel posting created.");
      queryClient.invalidateQueries({ queryKey: ["channel-postings"] });
    },
    onError(error) {
      toast.error(error.response?.data?.message || "Unable to save channel posting.");
    }
  });

  const confirmMutation = useMutation({
    mutationFn: confirmChannelPosting,
    onSuccess() {
      setReviewForm(null);
      setRawText("");
      setIsDrawerOpen(false);
      toast.success("Channel posting created.");
      queryClient.invalidateQueries({ queryKey: ["channel-postings"] });
    },
    onError(error) {
      toast.error(error.response?.data?.message || "Unable to save channel posting.");
    }
  });

  const deleteMutation = useMutation({
    mutationFn: deleteChannelPosting,
    onSuccess() {
      toast.success("Channel posting deleted.");
      queryClient.invalidateQueries({ queryKey: ["channel-postings"] });
    },
    onError(error) {
      toast.error(error.response?.data?.message || "Unable to delete channel posting.");
    }
  });

  const convertMutation = useMutation({
    mutationFn: convertChannelPostingToToApply,
    onSuccess() {
      toast.success("Moved to To Apply.");
      queryClient.invalidateQueries({ queryKey: ["channel-postings"] });
      queryClient.invalidateQueries({ queryKey: ["to-apply"] });
    },
    onError(error) {
      toast.error(error.response?.data?.message || "Unable to move posting to To Apply.");
    }
  });

  const updateManual = (event) => {
    setManualForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  };

  const updateReview = (event) => {
    setReviewForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  };

  const updateFilter = (event) => {
    setFilters((current) => ({ ...current, [event.target.name]: event.target.value }));
  };

  const submitManual = (event) => {
    event.preventDefault();
    createMutation.mutate(toPayload(manualForm));
  };

  const submitRaw = (event) => {
    event.preventDefault();
    createMutation.mutate({ rawText });
  };

  const submitReview = (event) => {
    event.preventDefault();
    confirmMutation.mutate(toPayload(reviewForm, reviewForm.rawText));
  };

  const postings = postingsQuery.data || [];

  return (
    <AppShell title="Channel Postings" eyebrow="Sourced Openings">
      <section className="content-grid">
        <PageShell
          eyebrow="Sourced Openings"
          title="Channel Postings"
          accent="tracker"
          action={
            <button type="button" onClick={() => setIsDrawerOpen(true)}>
              <Plus size={18} />
              Add posting
            </button>
          }
        >
          <section className="channel-results">
          <section className="application-filter-panel channel-filter-panel">
            <label>
              <span className="filter-label">
                <Search size={16} />
                Search
              </span>
              <input name="search" value={filters.search} onChange={updateFilter} placeholder="Company, role, source..." />
            </label>
            <label>
              Company
              <input name="company" value={filters.company} onChange={updateFilter} />
            </label>
            <label>
              Source
              <input name="source" value={filters.source} onChange={updateFilter} />
            </label>
            <label>
              Tag
              <input name="tag" value={filters.tag} onChange={updateFilter} />
            </label>
            <button className="ghost-button" type="button" onClick={() => setFilters(emptyFilters)}>
              <X size={16} />
              Clear
            </button>
          </section>

          {postingsQuery.isLoading ? <p>Loading postings...</p> : null}
          {postingsQuery.error ? <p className="error">Unable to load channel postings</p> : null}
          {!postingsQuery.isLoading && postings.length === 0 ? (
            <EmptyState
              title="No channel postings yet"
              description="Add a manual posting or paste a channel message to start your sourced openings log."
              action={
                <button type="button" onClick={() => setIsDrawerOpen(true)}>
                  <Plus size={18} />
                  Add posting
                </button>
              }
            />
          ) : null}

          <div className="channel-card-grid">
            {postings.map((posting) => (
              <StandardCard
                className="channel-card"
                key={posting._id}
                secondary={posting.sourceName}
                label={posting.companyName}
                metadata={[
                  { label: "Role", value: posting.roleTitle || "Role not set" },
                  { label: "Posted", value: posting.postedDate ? new Date(posting.postedDate).toLocaleDateString() : "Not set" },
                  { label: "Added", value: new Date(posting.addedAt).toLocaleDateString() }
                ]}
                actions={
                  <>
                    {posting.jobLink ? (
                      <a className="button-link secondary-link channel-open-link" href={posting.jobLink} target="_blank" rel="noreferrer">
                        <ExternalLink size={16} />
                        Open link
                      </a>
                    ) : null}
                    <button type="button" onClick={() => convertMutation.mutate(posting._id)} disabled={!posting.jobLink || convertMutation.isPending}>
                      Move to To-Apply list
                    </button>
                    <InlineConfirmButton
                      aria-label="Delete posting"
                      message="Delete this posting?"
                      onConfirm={() => deleteMutation.mutate(posting._id)}
                      disabled={deleteMutation.isPending}
                    >
                      <Trash2 size={16} />
                    </InlineConfirmButton>
                  </>
                }
              >
                {posting.tags?.length ? (
                  <div className="note-tags">
                    {posting.tags.map((tag) => (
                      <span key={tag}>{tag}</span>
                    ))}
                  </div>
                ) : null}
                {posting.rawText ? (
                  <PreserveScrollDisclosure label="Show original message" openLabel="Hide original message">
                    <p>{posting.rawText}</p>
                  </PreserveScrollDisclosure>
                ) : null}
              </StandardCard>
            ))}
          </div>
          </section>
        </PageShell>
      </section>

      <Drawer
        open={isDrawerOpen}
        title={reviewForm ? "Review extracted fields" : "Add posting"}
        description={
          reviewForm
            ? "Edit anything before saving. AI-assisted entries are not saved until you confirm."
            : "Log fresher and graduate openings from Telegram or similar sources."
        }
        onClose={() => setIsDrawerOpen(false)}
      >
        {reviewForm ? (
          <form className="form-panel review-panel drawer-form" onSubmit={submitReview}>
            {reviewForm.warning ? <p className="momentum-nudge">{reviewForm.warning}</p> : null}
            <label>
              Source
              <input name="sourceName" value={reviewForm.sourceName} onChange={updateReview} required />
            </label>
            <label>
              Company
              <input name="companyName" value={reviewForm.companyName} onChange={updateReview} required />
            </label>
            <label>
              Role
              <input name="roleTitle" value={reviewForm.roleTitle} onChange={updateReview} />
            </label>
            <label>
              Job link
              <input name="jobLink" type="url" value={reviewForm.jobLink} onChange={updateReview} />
            </label>
            <div className="form-row">
              <label>
                Posted date
                <input name="postedDate" type="date" value={reviewForm.postedDate} onChange={updateReview} />
              </label>
              <label>
                Tags
                <input name="tagsText" value={reviewForm.tagsText} onChange={updateReview} />
              </label>
            </div>
            {confirmMutation.error ? <p className="error">{confirmMutation.error.response?.data?.message || "Unable to save posting"}</p> : null}
            <div className="action-row">
              <button type="submit" disabled={confirmMutation.isPending}>
                Confirm save
              </button>
              <button className="ghost-button" type="button" onClick={() => setReviewForm(null)}>
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <section className="form-panel channel-form drawer-form">
            <div className="tabs compact-tabs">
              <button className={`tab-button ${mode === "manual" ? "active" : ""}`} type="button" onClick={() => setMode("manual")}>
                Manual
              </button>
              <button className={`tab-button ${mode === "ai" ? "active" : ""}`} type="button" onClick={() => setMode("ai")}>
                Paste message
              </button>
            </div>

            {mode === "manual" ? (
              <form className="stacked-form" onSubmit={submitManual}>
                <label>
                  Source
                  <input name="sourceName" value={manualForm.sourceName} onChange={updateManual} placeholder="Telegram - XYZ Jobs" required />
                </label>
                <label>
                  Company
                  <input name="companyName" value={manualForm.companyName} onChange={updateManual} required />
                </label>
                <label>
                  Role
                  <input name="roleTitle" value={manualForm.roleTitle} onChange={updateManual} />
                </label>
                <label>
                  Job link
                  <input name="jobLink" type="url" value={manualForm.jobLink} onChange={updateManual} />
                </label>
                <div className="form-row">
                  <label>
                    Posted date
                    <input name="postedDate" type="date" value={manualForm.postedDate} onChange={updateManual} />
                  </label>
                  <label>
                    Tags
                    <input name="tagsText" value={manualForm.tagsText} onChange={updateManual} placeholder="off-campus, internship" />
                  </label>
                </div>
                {createMutation.error ? <p className="error">{createMutation.error.response?.data?.message || "Unable to save posting"}</p> : null}
                <button type="submit" disabled={createMutation.isPending}>
                  <Plus size={18} />
                  Save posting
                </button>
              </form>
            ) : (
              <form className="stacked-form" onSubmit={submitRaw}>
                <label>
                  Raw channel message
                  <textarea value={rawText} onChange={(event) => setRawText(event.target.value)} rows="10" required />
                </label>
                {createMutation.error ? <p className="error">{createMutation.error.response?.data?.message || "Unable to extract posting"}</p> : null}
                <button type="submit" disabled={createMutation.isPending}>
                  <Wand2 size={18} />
                  {createMutation.isPending ? "Extracting..." : "Extract fields"}
                </button>
              </form>
            )}
          </section>
        )}
      </Drawer>
    </AppShell>
  );
};

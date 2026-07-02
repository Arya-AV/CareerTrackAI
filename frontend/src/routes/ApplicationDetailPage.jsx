import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { AppShell } from "../components/AppShell.jsx";
import { toast } from "../components/ToastProvider.jsx";
import { Drawer, EmptyState, ExternalTextLink, InlineConfirmButton, MetadataRow, PageShell, PreserveScrollDisclosure, StandardCard, StatusBadge, TabButton } from "../components/ui.jsx";
import { deleteApplication, getApplication, listApplicationAiAnalyses, listApplicationNotes, updateApplication, updateApplicationStatus } from "../api/applications.api.js";
import { createInterviewRound, listApplicationInterviews } from "../api/interviews.api.js";
import { createNote, deleteNote, updateNote } from "../api/notes.api.js";
import { createOARecord, deleteOARecord, listApplicationOAs } from "../api/oas.api.js";
import { listResumeVersions } from "../api/resumeVersions.api.js";

const initialInterviewForm = {
  scheduledAt: "",
  roundType: "Technical",
  roundNumber: "",
  interviewerName: ""
};

const emptyEditForm = {
  companyName: "",
  role: "",
  location: "",
  jobLink: "",
  source: "Other",
  status: "Applied",
  appliedDate: "",
  deadline: "",
  resumeVersionId: "",
  notes: "",
  rejectionStage: "",
  rejectionFeedback: ""
};

const sources = ["LinkedIn", "Campus", "Careers page", "Referral", "Other"];
const statuses = ["Applied", "OA", "Interview", "Offer", "Rejected"];
const noteTypes = ["General", "OA Question", "Interview Question", "Mistake", "Revision Note", "Company Experience"];

const emptyNoteForm = {
  title: "",
  type: "General",
  tagsText: "",
  content: ""
};

const emptyOAForm = {
  platform: "",
  scheduledAt: "",
  durationMinutes: "",
  resultStatus: "Pending",
  score: "",
  notes: ""
};

const toDateInput = (value) => (value ? new Date(value).toISOString().slice(0, 10) : "");

const parseTags = (value) =>
  value
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);

const noteToForm = (note) => ({
  title: note.title || "",
  type: note.type || "General",
  tagsText: note.tags?.join(", ") || "",
  content: note.content || ""
});

const toDateTimeLocal = (date) => {
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
};

const addHours = (date, hours) => new Date(date.getTime() + hours * 60 * 60 * 1000);

const buildInterviewSuggestions = (form) => {
  if (!form.scheduledAt) return [];
  const scheduledAt = new Date(form.scheduledAt);

  return [
    {
      key: "INTERVIEW_PREP",
      type: "INTERVIEW_PREP",
      label: "Prep",
      scheduledFor: toDateTimeLocal(addHours(scheduledAt, -24)),
      reasoning: "Start focused prep 1 day before the interview."
    },
    {
      key: "INTERVIEW_2_HOURS",
      type: "INTERVIEW_2_HOURS",
      label: "Starts soon",
      scheduledFor: toDateTimeLocal(addHours(scheduledAt, -2)),
      reasoning: "Remind 2 hours before the interview starts."
    }
  ].filter((suggestion) => new Date(suggestion.scheduledFor) > new Date());
};

const rejectionStages = [
  { value: "applied", label: "Applied" },
  { value: "oa", label: "OA" },
  { value: "phone_screen", label: "Phone screen" },
  { value: "technical", label: "Technical" },
  { value: "onsite", label: "Onsite" },
  { value: "offer_stage", label: "Offer stage" },
  { value: "other", label: "Other" }
];

const analysisTypeLabel = (type) => (type === "RESUME_MATCH" ? "Resume Match" : "JD Analysis");

const topItems = (items = [], count = 5) => items.filter(Boolean).slice(0, count);

const AnalysisFullResult = ({ analysis }) => {
  const result = analysis.result || {};

  if (analysis.type === "RESUME_MATCH") {
    return (
      <div className="analysis-full-result">
        <MetadataRow
          items={[
            { label: "Matched", value: topItems(result.matched_keywords, 12).join(", ") || "None" },
            { label: "Missing", value: topItems(result.missing_keywords, 12).join(", ") || "None" }
          ]}
        />
        {result.score_justification ? <p>{result.score_justification}</p> : null}
        {result.bullet_suggestions?.length ? (
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
        ) : null}
      </div>
    );
  }

  return (
    <div className="analysis-full-result">
      <MetadataRow
        items={[
          { label: "Required", value: topItems(result.required_skills, 12).join(", ") || "None" },
          { label: "Missing", value: topItems(result.missing_skills, 12).join(", ") || "None" },
          { label: "DSA", value: topItems(result.dsa_topics_to_revise, 12).join(", ") || "None" }
        ]}
      />
      {result.resume_keyword_suggestions?.length ? (
        <section>
          <h4>Resume keywords</h4>
          <ul>
            {result.resume_keyword_suggestions.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>
      ) : null}
      {result.prep_checklist?.length ? (
        <section>
          <h4>Prep checklist</h4>
          <ul>
            {result.prep_checklist.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
};

export const ApplicationDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [interviewForm, setInterviewForm] = useState(initialInterviewForm);
  const [activeTab, setActiveTab] = useState("Overview");
  const [dismissedInterviewReminders, setDismissedInterviewReminders] = useState([]);
  const [interviewReminderEdits, setInterviewReminderEdits] = useState({});
  const [rejectionDrawerOpen, setRejectionDrawerOpen] = useState(false);
  const [rejectionForm, setRejectionForm] = useState({ rejectionStage: "", rejectionFeedback: "" });
  const [rejectionError, setRejectionError] = useState("");
  const [editDrawerOpen, setEditDrawerOpen] = useState(false);
  const [editForm, setEditForm] = useState(emptyEditForm);
  const [editError, setEditError] = useState("");
  const [noteDrawerOpen, setNoteDrawerOpen] = useState(false);
  const [editingNote, setEditingNote] = useState(null);
  const [noteForm, setNoteForm] = useState(emptyNoteForm);
  const [oaDrawerOpen, setOaDrawerOpen] = useState(false);
  const [oaForm, setOaForm] = useState(emptyOAForm);
  const { data: application, isLoading, error } = useQuery({
    queryKey: ["application", id],
    queryFn: () => getApplication(id)
  });
  const resumeVersionsQuery = useQuery({
    queryKey: ["resume-versions", "application-edit"],
    queryFn: () => listResumeVersions(),
    enabled: editDrawerOpen
  });
  const interviewsQuery = useQuery({
    queryKey: ["application-interviews", id],
    queryFn: () => listApplicationInterviews(id)
  });
  const aiAnalysesQuery = useQuery({
    queryKey: ["application-ai-analyses", id],
    queryFn: () => listApplicationAiAnalyses(id),
    enabled: activeTab === "AI Analysis"
  });
  const applicationNotesQuery = useQuery({
    queryKey: ["application-notes", id],
    queryFn: () => listApplicationNotes(id),
    enabled: activeTab === "Notes"
  });
  const oasQuery = useQuery({
    queryKey: ["application-oas", id],
    queryFn: () => listApplicationOAs(id),
    enabled: activeTab === "OA"
  });

  const statusMutation = useMutation({
    mutationFn: updateApplicationStatus,
    onSuccess(updated) {
      toast.success("Application status updated.");
      queryClient.setQueryData(["application", id], updated);
      queryClient.invalidateQueries({ queryKey: ["applications"] });
    },
    onError(error) {
      toast.error(error.response?.data?.message || "Unable to update application status.");
    }
  });

  const editMutation = useMutation({
    mutationFn: updateApplication,
    onSuccess(updated) {
      toast.success("Application updated.");
      queryClient.setQueryData(["application", id], updated);
      queryClient.invalidateQueries({ queryKey: ["application", id] });
      queryClient.invalidateQueries({ queryKey: ["applications"] });
      queryClient.invalidateQueries({ queryKey: ["companies"] });
      setEditDrawerOpen(false);
      setEditError("");
    },
    onError(error) {
      toast.error(error.response?.data?.message || "Unable to update application.");
    }
  });

  const createInterviewMutation = useMutation({
    mutationFn: createInterviewRound,
    onSuccess() {
      toast.success("Interview round created.");
      setInterviewForm(initialInterviewForm);
      queryClient.invalidateQueries({ queryKey: ["application-interviews", id] });
    },
    onError(error) {
      toast.error(error.response?.data?.message || "Unable to add interview round.");
    }
  });

  const createNoteMutation = useMutation({
    mutationFn: createNote,
    onSuccess() {
      toast.success("Application note created.");
      setNoteDrawerOpen(false);
      setEditingNote(null);
      setNoteForm(emptyNoteForm);
      queryClient.invalidateQueries({ queryKey: ["application-notes", id] });
      queryClient.invalidateQueries({ queryKey: ["notes"] });
      queryClient.invalidateQueries({ queryKey: ["note-tags"] });
    },
    onError(error) {
      toast.error(error.response?.data?.message || "Unable to save application note.");
    }
  });

  const updateNoteMutation = useMutation({
    mutationFn: updateNote,
    onSuccess() {
      toast.success("Application note updated.");
      setNoteDrawerOpen(false);
      setEditingNote(null);
      setNoteForm(emptyNoteForm);
      queryClient.invalidateQueries({ queryKey: ["application-notes", id] });
      queryClient.invalidateQueries({ queryKey: ["notes"] });
      queryClient.invalidateQueries({ queryKey: ["note-tags"] });
    },
    onError(error) {
      toast.error(error.response?.data?.message || "Unable to update application note.");
    }
  });

  const deleteNoteMutation = useMutation({
    mutationFn: deleteNote,
    onSuccess() {
      toast.success("Application note deleted.");
      queryClient.invalidateQueries({ queryKey: ["application-notes", id] });
      queryClient.invalidateQueries({ queryKey: ["notes"] });
      queryClient.invalidateQueries({ queryKey: ["note-tags"] });
    },
    onError(error) {
      toast.error(error.response?.data?.message || "Unable to delete application note.");
    }
  });

  const createOAMutation = useMutation({
    mutationFn: createOARecord,
    onSuccess() {
      toast.success("OA record added.");
      setOaDrawerOpen(false);
      setOaForm(emptyOAForm);
      queryClient.invalidateQueries({ queryKey: ["application-oas", id] });
    },
    onError(error) {
      toast.error(error.response?.data?.message || "Unable to add OA record.");
    }
  });

  const deleteOAMutation = useMutation({
    mutationFn: deleteOARecord,
    onSuccess() {
      toast.success("OA record deleted.");
      queryClient.invalidateQueries({ queryKey: ["application-oas", id] });
    },
    onError(error) {
      toast.error(error.response?.data?.message || "Unable to delete OA record.");
    }
  });

  const deleteApplicationMutation = useMutation({
    mutationFn: deleteApplication,
    onSuccess() {
      toast.success("Application deleted.");
      queryClient.invalidateQueries({ queryKey: ["applications"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      navigate("/app/applications");
    },
    onError(error) {
      toast.error(error.response?.data?.message || "Unable to delete application.");
    }
  });

  const updateInterviewForm = (event) => {
    setInterviewForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  };

  const submitInterview = (event) => {
    event.preventDefault();
    const reminderSuggestions = interviewReminderSuggestions
      .filter((suggestion) => !dismissedInterviewReminders.includes(suggestion.key))
      .map((suggestion) => ({
        type: suggestion.type,
        scheduledFor: new Date(interviewReminderEdits[suggestion.key] || suggestion.scheduledFor).toISOString(),
        reasoning: suggestion.reasoning
      }));

    createInterviewMutation.mutate({
      applicationId: id,
      payload: {
        scheduledAt: new Date(interviewForm.scheduledAt).toISOString(),
        roundType: interviewForm.roundType,
        roundNumber: interviewForm.roundNumber ? Number(interviewForm.roundNumber) : undefined,
        interviewerName: interviewForm.interviewerName,
        reminderSuggestions
      }
    });
  };

  const interviewReminderSuggestions = useMemo(() => buildInterviewSuggestions(interviewForm), [interviewForm.scheduledAt]);

  const openEditDrawer = () => {
    if (!application) return;
    setEditForm({
      companyName: application.companyName || "",
      role: application.role || "",
      location: application.location || "",
      jobLink: application.jobLink || "",
      source: application.source || "Other",
      status: application.status || "Applied",
      appliedDate: toDateInput(application.appliedDate),
      deadline: toDateInput(application.deadline),
      resumeVersionId: application.resumeVersionId || "",
      notes: application.notes || "",
      rejectionStage: application.rejectionStage || "",
      rejectionFeedback: application.rejectionFeedback || ""
    });
    setEditError("");
    setEditDrawerOpen(true);
  };

  const updateEditForm = (event) => {
    setEditForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  };

  const submitEdit = (event) => {
    event.preventDefault();
    if (editForm.status === "Rejected" && !editForm.rejectionStage) {
      setEditError("Please choose the rejection stage before saving.");
      return;
    }

    editMutation.mutate({
      id,
      payload: {
        companyName: editForm.companyName,
        role: editForm.role,
        location: editForm.location,
        jobLink: editForm.jobLink,
        source: editForm.source,
        status: editForm.status,
        appliedDate: editForm.appliedDate,
        deadline: editForm.deadline || "",
        resumeVersionId: editForm.resumeVersionId || "",
        notes: editForm.notes,
        rejectionStage: editForm.status === "Rejected" ? editForm.rejectionStage : undefined,
        rejectionFeedback: editForm.status === "Rejected" ? editForm.rejectionFeedback : ""
      }
    });
  };

  const openCreateNoteDrawer = () => {
    setEditingNote(null);
    setNoteForm(emptyNoteForm);
    setNoteDrawerOpen(true);
  };

  const openEditNoteDrawer = (note) => {
    setEditingNote(note);
    setNoteForm(noteToForm(note));
    setNoteDrawerOpen(true);
  };

  const closeNoteDrawer = () => {
    setNoteDrawerOpen(false);
    setEditingNote(null);
    setNoteForm(emptyNoteForm);
  };

  const updateNoteForm = (event) => {
    setNoteForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  };

  const submitNote = (event) => {
    event.preventDefault();
    const payload = {
      applicationId: id,
      title: noteForm.title,
      type: noteForm.type,
      company: application?.companyName || "",
      role: application?.role || "",
      content: noteForm.content,
      tags: parseTags(noteForm.tagsText)
    };

    if (editingNote) {
      updateNoteMutation.mutate({ id: editingNote._id, payload });
      return;
    }

    createNoteMutation.mutate(payload);
  };

  const updateOAForm = (event) => {
    setOaForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  };

  const submitOA = (event) => {
    event.preventDefault();
    createOAMutation.mutate({
      applicationId: id,
      payload: {
        platform: oaForm.platform,
        scheduledAt: new Date(`${oaForm.scheduledAt}T09:00`).toISOString(),
        durationMinutes: oaForm.durationMinutes ? Number(oaForm.durationMinutes) : undefined,
        resultStatus: oaForm.resultStatus,
        score: oaForm.score,
        notes: oaForm.notes
      }
    });
  };

  const updateStatus = (status) => {
    if (status !== "Rejected") {
      statusMutation.mutate({ id, status });
      return;
    }

    setRejectionForm({
      rejectionStage: application?.rejectionStage || "",
      rejectionFeedback: application?.rejectionFeedback || ""
    });
    setRejectionError("");
    setRejectionDrawerOpen(true);
  };

  const submitRejectionStatus = (event) => {
    event.preventDefault();
    if (!rejectionForm.rejectionStage) {
      setRejectionError("Please choose the rejection stage before saving.");
      return;
    }

    statusMutation.mutate(
      {
        id,
        status: "Rejected",
        rejectionStage: rejectionForm.rejectionStage,
        rejectionFeedback: rejectionForm.rejectionFeedback
      },
      {
        onSuccess() {
          setRejectionDrawerOpen(false);
          setRejectionError("");
        }
      }
    );
  };

  return (
    <AppShell title={application?.companyName || "Application"} eyebrow={application?.role || "Tracker"}>
      <section className="content-grid">
        <PageShell
          eyebrow={application?.role || "Tracker"}
          title={application?.companyName || "Application"}
          accent="tracker"
          action={
            application ? (
              <button type="button" onClick={openEditDrawer}>
                <Pencil size={16} />
                Edit
              </button>
            ) : null
          }
        >
          {isLoading ? <p>Loading...</p> : null}
          {error ? <p className="error">Unable to load application</p> : null}
          {application ? (
            <>
              <StandardCard
                secondary={application.role}
                label={application.companyName}
                badge={<StatusBadge status={application.status} />}
                metadata={[
                  { label: "Location", value: application.location || "Not set" },
                  { label: "Applied", value: new Date(application.appliedDate).toLocaleDateString() },
                  { label: "Source", value: application.source }
                ]}
                actions={
                  <select
                    value={application.status}
                    onChange={(event) => updateStatus(event.target.value)}
                  >
                    <option>Applied</option>
                    <option>OA</option>
                    <option>Interview</option>
                    <option>Offer</option>
                    <option>Rejected</option>
                  </select>
                }
              />
              <nav className="tabs" aria-label="Application sections">
                {["Overview", "OA", "Interviews", "Notes", "AI Analysis", "Reminders"].map((tab) => (
                  <TabButton active={activeTab === tab} onClick={() => setActiveTab(tab)} key={tab}>
                    {tab}
                  </TabButton>
                ))}
              </nav>
            </>
          ) : null}
          {application && activeTab === "Overview" ? (
            <StandardCard label="Overview" secondary="Application details">
              <MetadataRow
                items={[
                  { label: "Applied", value: new Date(application.appliedDate).toLocaleDateString() },
                  { label: "Deadline", value: application.deadline ? new Date(application.deadline).toLocaleDateString() : "Not set" },
                  { label: "Source", value: application.source },
                  { label: "Job link", value: <ExternalTextLink href={application.jobLink}>Open job posting</ExternalTextLink> }
                ]}
              />
            </StandardCard>
          ) : null}
          {application && activeTab === "OA" ? (
            <StandardCard
              label="Online assessments"
              secondary="Track OA platforms, dates, scores, and outcomes for this application."
              actions={
                <button type="button" onClick={() => setOaDrawerOpen(true)}>
                  <Plus size={16} />
                  Add OA Record
                </button>
              }
            >
              {oasQuery.isLoading ? <p>Loading OA records...</p> : null}
              {oasQuery.error ? <p className="error">Unable to load OA records.</p> : null}
              {!oasQuery.isLoading && !oasQuery.data?.length ? (
                <EmptyState
                  title="No OA records yet"
                  description="Add one if you received an online assessment for this application."
                  action={
                    <button type="button" onClick={() => setOaDrawerOpen(true)}>
                      <Plus size={16} />
                      Add OA Record
                    </button>
                  }
                />
              ) : null}
              {oasQuery.data?.length ? (
                <div className="application-oa-list">
                  {oasQuery.data.map((oa) => (
                    <StandardCard
                      className="application-oa-card"
                      key={oa._id}
                      secondary="Online Assessment"
                      label={oa.platform || "OA platform not set"}
                      badge={<StatusBadge status={oa.resultStatus} />}
                      metadata={[
                        { label: "Date", value: new Date(oa.scheduledAt).toLocaleDateString() },
                        ...(oa.durationMinutes ? [{ label: "Duration", value: `${oa.durationMinutes} min` }] : []),
                        ...(oa.score ? [{ label: "Score", value: oa.score }] : [])
                      ]}
                      actions={
                        <InlineConfirmButton
                          aria-label="Delete OA record"
                          message="Delete this OA record?"
                          onConfirm={() => deleteOAMutation.mutate(oa._id)}
                          disabled={deleteOAMutation.isPending}
                        >
                          <Trash2 size={16} />
                        </InlineConfirmButton>
                      }
                    >
                      {oa.notes ? <p>{oa.notes}</p> : <p className="muted">No notes added.</p>}
                    </StandardCard>
                  ))}
                </div>
              ) : null}
            </StandardCard>
          ) : null}
          {application && activeTab === "Interviews" ? (
            <StandardCard label="Interview rounds" secondary="Open replay to type or dictate what you remember after a round.">
            <form className="inline-form interview-round-form" onSubmit={submitInterview}>
              <label>
                Date and time
                <input
                  name="scheduledAt"
                  type="datetime-local"
                  value={interviewForm.scheduledAt}
                  onChange={updateInterviewForm}
                  required
                />
              </label>
              <label>
                Type
                <select name="roundType" value={interviewForm.roundType} onChange={updateInterviewForm}>
                  <option>DSA</option>
                  <option>HR</option>
                  <option>Technical</option>
                  <option>Managerial</option>
                  <option>Other</option>
                </select>
              </label>
              <label>
                Round
                <input
                  name="roundNumber"
                  type="number"
                  min="1"
                  value={interviewForm.roundNumber}
                  onChange={updateInterviewForm}
                  placeholder="1"
                />
              </label>
              <label>
                Interviewer
                <input
                  name="interviewerName"
                  value={interviewForm.interviewerName}
                  onChange={updateInterviewForm}
                  placeholder="Optional"
                />
              </label>
              <button type="submit" disabled={createInterviewMutation.isPending}>
                {createInterviewMutation.isPending ? "Adding..." : "Add round"}
              </button>
            </form>
            {interviewReminderSuggestions.length ? (
              <section className="suggestion-panel inline-suggestion-panel">
                <div className="panel-header">
                  <h3>Suggested reminders</h3>
                  <p>Select, edit, or dismiss before adding this round.</p>
                </div>
                {interviewReminderSuggestions.map((suggestion) => {
                  if (dismissedInterviewReminders.includes(suggestion.key)) return null;

                  return (
                    <article className="suggestion-chip" key={suggestion.key}>
                      <div>
                        <strong>{suggestion.label}</strong>
                        <p>{suggestion.reasoning}</p>
                      </div>
                      <input
                        type="datetime-local"
                        value={interviewReminderEdits[suggestion.key] || suggestion.scheduledFor}
                        onChange={(event) =>
                          setInterviewReminderEdits((current) => ({
                            ...current,
                            [suggestion.key]: event.target.value
                          }))
                        }
                      />
                      <button
                        className="ghost-button"
                        type="button"
                        onClick={() => setDismissedInterviewReminders((current) => [...current, suggestion.key])}
                      >
                        Dismiss
                      </button>
                    </article>
                  );
                })}
              </section>
            ) : null}
            {createInterviewMutation.error ? <p className="error">Unable to add interview round</p> : null}
            {interviewsQuery.isLoading ? <p>Loading interviews...</p> : null}
            {interviewsQuery.error ? <p className="error">Unable to load interview rounds</p> : null}
            {!interviewsQuery.isLoading && !interviewsQuery.data?.length ? (
              <EmptyState title="No interview rounds yet" description="No interview rounds linked to this application yet." />
            ) : null}
            {interviewsQuery.data?.length ? (
              <div className="table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>Round</th>
                      <th>Type</th>
                      <th>Date</th>
                      <th>Interviewer</th>
                      <th>Replay</th>
                    </tr>
                  </thead>
                  <tbody>
                    {interviewsQuery.data.map((interview) => (
                      <tr key={interview._id}>
                        <td>{interview.roundNumber || "-"}</td>
                        <td>{interview.roundType}</td>
                        <td>{new Date(interview.scheduledAt).toLocaleString()}</td>
                        <td>{interview.interviewerName || "Not set"}</td>
                        <td>
                          <Link to={`/app/interviews/${interview._id}/replay`}>Open replay</Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : null}
            </StandardCard>
          ) : null}
          {application && activeTab === "Notes" ? (
            <StandardCard
              label="Application notes"
              secondary="Notes linked to this application."
              actions={
                <>
                  <button type="button" onClick={openCreateNoteDrawer}>
                    <Plus size={16} />
                    Add note
                  </button>
                  <Link className="button-link secondary-link" to="/app/notes">
                    Open notes bank
                  </Link>
                </>
              }
            >
              {applicationNotesQuery.isLoading ? <p>Loading application notes...</p> : null}
              {applicationNotesQuery.error ? <p className="error">Unable to load application notes.</p> : null}
              {!applicationNotesQuery.isLoading && !applicationNotesQuery.data?.length ? (
                <EmptyState
                  title="No notes for this application yet"
                  description="Add your first note to track key insights."
                  action={
                    <button type="button" onClick={openCreateNoteDrawer}>
                      <Plus size={16} />
                      Add note
                    </button>
                  }
                />
              ) : null}
              {applicationNotesQuery.data?.length ? (
                <div className="note-card-grid application-note-list">
                  {applicationNotesQuery.data.map((note) => (
                    <StandardCard
                      className="note-card"
                      key={note._id}
                      secondary={note.type}
                      label={note.title || note.content.split("\n")[0]}
                      badge={<StatusBadge status={note.type} />}
                      metadata={[{ label: "Created", value: new Date(note.createdAt).toLocaleString() }]}
                      actions={
                        <>
                          <button className="ghost-button" type="button" onClick={() => openEditNoteDrawer(note)}>
                            <Pencil size={16} />
                            Edit
                          </button>
                          <InlineConfirmButton
                            aria-label="Delete note"
                            message="Delete this note?"
                            onConfirm={() => deleteNoteMutation.mutate(note._id)}
                            disabled={deleteNoteMutation.isPending}
                          >
                            <Trash2 size={16} />
                          </InlineConfirmButton>
                        </>
                      }
                    >
                      <p className="note-content">{note.content}</p>
                      {note.tags?.length ? (
                        <div className="note-tags">
                          {note.tags.map((tag) => (
                            <span key={tag}>{tag}</span>
                          ))}
                        </div>
                      ) : null}
                    </StandardCard>
                  ))}
                </div>
              ) : null}
            </StandardCard>
          ) : null}
          {application && activeTab === "AI Analysis" ? (
            <StandardCard label="Saved AI analyses" secondary="JD analyses and resume matches linked to this application.">
              <div className="action-row">
                <Link className="button-link" to="/app/ai/jd-analyzer">
                  JD Analyzer
                </Link>
                <Link className="button-link secondary-link" to="/app/ai/resume-match">
                  Resume Match
                </Link>
              </div>
              {aiAnalysesQuery.isLoading ? <p>Loading AI analyses...</p> : null}
              {aiAnalysesQuery.error ? <p className="error">Unable to load saved AI analyses.</p> : null}
              {!aiAnalysesQuery.isLoading && !aiAnalysesQuery.data?.length ? (
                <EmptyState
                  title="No AI analyses yet"
                  description="Run JD Analyzer or Resume Match and link it to this application."
                />
              ) : null}
              {aiAnalysesQuery.data?.length ? (
                <div className="application-ai-analysis-list">
                  {aiAnalysesQuery.data.map((analysis) => {
                    const result = analysis.result || {};
                    const summary =
                      analysis.type === "RESUME_MATCH"
                        ? `${Math.round(result.match_percentage || 0)}% match`
                        : topItems(result.missing_skills, 5).join(", ") || "No missing skills flagged";

                    return (
                      <StandardCard
                        className="application-ai-analysis-card"
                        key={analysis._id}
                        secondary={analysisTypeLabel(analysis.type)}
                        label={summary}
                        metadata={[
                          { label: "Run", value: new Date(analysis.createdAt).toLocaleString() },
                          { label: "Model", value: analysis.model || "Gemini" }
                        ]}
                      >
                        {result.warning ? <p className="momentum-nudge">{result.warning}</p> : null}
                        <PreserveScrollDisclosure label="View full result" openLabel="Hide full result">
                          <AnalysisFullResult analysis={analysis} />
                        </PreserveScrollDisclosure>
                      </StandardCard>
                    );
                  })}
                </div>
              ) : null}
            </StandardCard>
          ) : null}
          {application && activeTab === "Reminders" ? (
            <StandardCard
              label="Application reminders"
              secondary="Review scheduled follow-ups, deadlines, and interview reminders."
              actions={
                <Link className="button-link" to="/app/reminders">
                  Open reminders
                </Link>
              }
            />
          ) : null}
          {application ? (
            <StandardCard
              className="danger-zone-card"
              label="Danger zone"
              secondary="Delete this application and its linked records."
              actions={
                <InlineConfirmButton
                  className="danger-button"
                  message="Delete this application? This cannot be undone. All linked interviews, notes, reminders, and OA records will also be deleted."
                  confirmLabel="Yes, delete"
                  onConfirm={() => deleteApplicationMutation.mutate(id)}
                  disabled={deleteApplicationMutation.isPending}
                >
                  <Trash2 size={16} />
                  Delete application
                </InlineConfirmButton>
              }
            />
          ) : null}
        </PageShell>
      </section>
      <Drawer
        open={editDrawerOpen}
        title="Edit application"
        description="Update the tracked role details, resume version, status, and notes."
        onClose={() => setEditDrawerOpen(false)}
      >
        <form className="form-panel drawer-form" onSubmit={submitEdit}>
          <label>
            Company name
            <input name="companyName" value={editForm.companyName} onChange={updateEditForm} required />
          </label>
          <label>
            Role/job title
            <input name="role" value={editForm.role} onChange={updateEditForm} required />
          </label>
          <label>
            Location
            <input name="location" value={editForm.location} onChange={updateEditForm} />
          </label>
          <label>
            Job link/URL
            <input name="jobLink" type="url" value={editForm.jobLink} onChange={updateEditForm} />
          </label>
          <div className="form-row">
            <label>
              Source
              <select name="source" value={editForm.source} onChange={updateEditForm}>
                {sources.map((source) => (
                  <option key={source}>{source}</option>
                ))}
              </select>
            </label>
            <label>
              Status
              <select name="status" value={editForm.status} onChange={updateEditForm}>
                {statuses.map((status) => (
                  <option key={status}>{status}</option>
                ))}
              </select>
            </label>
          </div>
          <div className="form-row">
            <label>
              Applied date
              <input name="appliedDate" type="date" value={editForm.appliedDate} onChange={updateEditForm} required />
            </label>
            <label>
              Deadline
              <input name="deadline" type="date" value={editForm.deadline} onChange={updateEditForm} />
            </label>
          </div>
          <label>
            Resume version
            <select name="resumeVersionId" value={editForm.resumeVersionId} onChange={updateEditForm}>
              <option value="">No version selected</option>
              {resumeVersionsQuery.data?.map((version) => (
                <option value={version._id} key={version._id}>
                  {version.label}
                </option>
              ))}
            </select>
          </label>
          {editForm.status === "Rejected" ? (
            <>
              <label>
                Rejection stage
                <select name="rejectionStage" value={editForm.rejectionStage} onChange={updateEditForm} required>
                  <option value="">Select stage</option>
                  {rejectionStages.map((stage) => (
                    <option key={stage.value} value={stage.value}>
                      {stage.label}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Rejection feedback
                <textarea
                  name="rejectionFeedback"
                  value={editForm.rejectionFeedback}
                  onChange={updateEditForm}
                  rows="4"
                />
              </label>
            </>
          ) : null}
          <label>
            Notes
            <textarea name="notes" value={editForm.notes} onChange={updateEditForm} rows="6" />
          </label>
          {editError ? <p className="error">{editError}</p> : null}
          {editMutation.error ? <p className="error">{editMutation.error.response?.data?.message || "Unable to save changes"}</p> : null}
          <div className="action-row">
            <button type="submit" disabled={editMutation.isPending || (editForm.status === "Rejected" && !editForm.rejectionStage)}>
              {editMutation.isPending ? "Saving..." : "Save changes"}
            </button>
            <button className="ghost-button" type="button" onClick={() => setEditDrawerOpen(false)}>
              Cancel
            </button>
          </div>
        </form>
      </Drawer>
      <Drawer
        open={noteDrawerOpen}
        title={editingNote ? "Edit application note" : "Add application note"}
        description="Save key insights for this specific application."
        onClose={closeNoteDrawer}
      >
        <form className="form-panel notes-form drawer-form" onSubmit={submitNote}>
          <label>
            Title
            <input name="title" value={noteForm.title} onChange={updateNoteForm} required />
          </label>
          <div className="form-row">
            <label>
              Type
              <select name="type" value={noteForm.type} onChange={updateNoteForm}>
                {noteTypes.map((type) => (
                  <option key={type}>{type}</option>
                ))}
              </select>
            </label>
            <label>
              Tags
              <input name="tagsText" value={noteForm.tagsText} onChange={updateNoteForm} placeholder="react, oa, arrays" />
            </label>
          </div>
          <label>
            Content
            <textarea name="content" value={noteForm.content} onChange={updateNoteForm} rows="8" required />
          </label>
          {createNoteMutation.error || updateNoteMutation.error ? <p className="error">Unable to save application note.</p> : null}
          <div className="action-row">
            <button type="submit" disabled={createNoteMutation.isPending || updateNoteMutation.isPending}>
              {createNoteMutation.isPending || updateNoteMutation.isPending
                ? "Saving..."
                : editingNote
                  ? "Save changes"
                  : "Save note"}
            </button>
            <button className="ghost-button" type="button" onClick={closeNoteDrawer}>
              Cancel
            </button>
          </div>
        </form>
      </Drawer>
      <Drawer
        open={oaDrawerOpen}
        title="Add OA record"
        description="Track online assessment details for this application."
        onClose={() => setOaDrawerOpen(false)}
      >
        <form className="form-panel drawer-form" onSubmit={submitOA}>
          <label>
            Platform
            <input name="platform" value={oaForm.platform} onChange={updateOAForm} placeholder="HackerRank, Codility, CodeSignal" />
          </label>
          <div className="form-row">
            <label>
              Date
              <input name="scheduledAt" type="date" value={oaForm.scheduledAt} onChange={updateOAForm} required />
            </label>
            <label>
              Duration in minutes
              <input
                name="durationMinutes"
                type="number"
                min="1"
                value={oaForm.durationMinutes}
                onChange={updateOAForm}
                placeholder="Optional"
              />
            </label>
          </div>
          <div className="form-row">
            <label>
              Status
              <select name="resultStatus" value={oaForm.resultStatus} onChange={updateOAForm}>
                <option>Pending</option>
                <option>Completed</option>
                <option>Passed</option>
                <option>Failed</option>
              </select>
            </label>
            <label>
              Score
              <input name="score" value={oaForm.score} onChange={updateOAForm} placeholder="Optional" />
            </label>
          </div>
          <label>
            Notes
            <textarea name="notes" value={oaForm.notes} onChange={updateOAForm} rows="5" />
          </label>
          {createOAMutation.error ? <p className="error">Unable to add OA record.</p> : null}
          <div className="action-row">
            <button type="submit" disabled={createOAMutation.isPending}>
              {createOAMutation.isPending ? "Saving..." : "Save OA record"}
            </button>
            <button className="ghost-button" type="button" onClick={() => setOaDrawerOpen(false)}>
              Cancel
            </button>
          </div>
        </form>
      </Drawer>
      <Drawer
        open={rejectionDrawerOpen}
        title="Mark as rejected"
        description="Choose where the rejection happened so dashboard patterns stay accurate."
        onClose={() => setRejectionDrawerOpen(false)}
      >
        <form className="form-panel drawer-form" onSubmit={submitRejectionStatus}>
          <label>
            Rejection stage
            <select
              value={rejectionForm.rejectionStage}
              onChange={(event) =>
                setRejectionForm((current) => ({ ...current, rejectionStage: event.target.value }))
              }
              required
            >
              <option value="">Select stage</option>
              {rejectionStages.map((stage) => (
                <option key={stage.value} value={stage.value}>
                  {stage.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            Feedback or notes
            <textarea
              value={rejectionForm.rejectionFeedback}
              onChange={(event) =>
                setRejectionForm((current) => ({ ...current, rejectionFeedback: event.target.value }))
              }
              rows="5"
              placeholder="Optional rejection feedback or context"
            />
          </label>
          {rejectionError ? <p className="error">{rejectionError}</p> : null}
          {statusMutation.error ? <p className="error">{statusMutation.error.response?.data?.message || "Unable to update status"}</p> : null}
          <div className="action-row">
            <button type="submit" disabled={statusMutation.isPending || !rejectionForm.rejectionStage}>
              {statusMutation.isPending ? "Saving..." : "Save rejected status"}
            </button>
            <button className="ghost-button" type="button" onClick={() => setRejectionDrawerOpen(false)}>
              Cancel
            </button>
          </div>
        </form>
      </Drawer>
    </AppShell>
  );
};

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { AppShell } from "../components/AppShell.jsx";
import { toast } from "../components/ToastProvider.jsx";
import { createApplication } from "../api/applications.api.js";
import { listResumeVersions } from "../api/resumeVersions.api.js";

const today = new Date().toISOString().slice(0, 10);

const toDateTimeLocal = (date) => {
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
};

const addDays = (date, days) => new Date(date.getTime() + days * 24 * 60 * 60 * 1000);

const buildApplicationSuggestions = (form) => {
  const suggestions = [];
  const appliedDate = form.appliedDate ? new Date(`${form.appliedDate}T09:00`) : null;

  if (appliedDate) {
    suggestions.push({
      key: "APPLICATION_FOLLOW_UP",
      type: "APPLICATION_FOLLOW_UP",
      label: "Follow-up",
      scheduledFor: toDateTimeLocal(addDays(appliedDate, 7)),
      reasoning: "Follow up 7 days after applying."
    });
  }

  if (form.deadline) {
    suggestions.push({
      key: "DEADLINE_APPROACHING",
      type: "DEADLINE_APPROACHING",
      label: "Deadline",
      scheduledFor: toDateTimeLocal(addDays(new Date(`${form.deadline}T09:00`), -2)),
      reasoning: "Remind 2 days before the deadline."
    });
  }

  return suggestions;
};

export const ApplicationFormPage = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    companyName: "",
    role: "",
    location: "",
    appliedDate: today,
    deadline: "",
    status: "Applied",
    source: "LinkedIn",
    jobLink: "",
    resumeVersionId: "",
    notes: ""
  });
  const [dismissedReminders, setDismissedReminders] = useState([]);
  const [reminderEdits, setReminderEdits] = useState({});

  const resumeVersionsQuery = useQuery({
    queryKey: ["resume-versions", "active"],
    queryFn: () => listResumeVersions()
  });

  const mutation = useMutation({
    mutationFn: createApplication,
    onSuccess(application) {
      toast.success("Application created.");
      queryClient.invalidateQueries({ queryKey: ["applications"] });
      navigate(`/app/applications/${application._id}`);
    },
    onError(error) {
      toast.error(error.response?.data?.message || "Unable to save application.");
    }
  });

  const update = (event) => {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  };

  const submit = (event) => {
    event.preventDefault();
    const reminderSuggestions = reminderSuggestionsForForm
      .filter((suggestion) => !dismissedReminders.includes(suggestion.key))
      .map((suggestion) => ({
        type: suggestion.type,
        scheduledFor: new Date(reminderEdits[suggestion.key] || suggestion.scheduledFor).toISOString(),
        reasoning: suggestion.reasoning
      }));

    mutation.mutate({ ...form, reminderSuggestions });
  };

  const reminderSuggestionsForForm = useMemo(() => buildApplicationSuggestions(form), [form.appliedDate, form.deadline]);

  return (
    <AppShell title="Add application" eyebrow="Tracker">
      <form className="form-panel" onSubmit={submit}>
        <label>
          Company
          <input name="companyName" value={form.companyName} onChange={update} required />
        </label>
        <label>
          Role
          <input name="role" value={form.role} onChange={update} required />
        </label>
        <label>
          Location
          <input name="location" value={form.location} onChange={update} />
        </label>
        <div className="form-row">
          <label>
            Applied date
            <input name="appliedDate" type="date" value={form.appliedDate} onChange={update} required />
          </label>
          <label>
            Deadline
            <input name="deadline" type="date" value={form.deadline} onChange={update} />
          </label>
        </div>
        <div className="form-row">
          <label>
            Status
            <select name="status" value={form.status} onChange={update}>
              <option>Applied</option>
              <option>OA</option>
              <option>Interview</option>
              <option>Offer</option>
              <option>Rejected</option>
            </select>
          </label>
          <label>
            Source
            <select name="source" value={form.source} onChange={update}>
              <option>LinkedIn</option>
              <option>Referral</option>
              <option>Campus</option>
              <option>Careers page</option>
              <option>Other</option>
            </select>
          </label>
        </div>
        <label>
          Job link
          <input name="jobLink" type="url" value={form.jobLink} onChange={update} />
        </label>
        <label>
          Resume version
          <select name="resumeVersionId" value={form.resumeVersionId} onChange={update}>
            <option value="">No version selected</option>
            {resumeVersionsQuery.data?.map((version) => (
              <option value={version._id} key={version._id}>
                {version.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          Notes
          <textarea name="notes" value={form.notes} onChange={update} rows="5" />
        </label>
        {reminderSuggestionsForForm.length ? (
          <section className="suggestion-panel">
            <div className="panel-header">
              <h3>Suggested reminders</h3>
              <p>Select, edit, or dismiss before saving.</p>
            </div>
            {reminderSuggestionsForForm.map((suggestion) => {
              const dismissed = dismissedReminders.includes(suggestion.key);
              if (dismissed) return null;

              return (
                <article className="suggestion-chip" key={suggestion.key}>
                  <div>
                    <strong>{suggestion.label}</strong>
                    <p>{suggestion.reasoning}</p>
                  </div>
                  <input
                    type="datetime-local"
                    value={reminderEdits[suggestion.key] || suggestion.scheduledFor}
                    onChange={(event) =>
                      setReminderEdits((current) => ({ ...current, [suggestion.key]: event.target.value }))
                    }
                  />
                  <button
                    className="ghost-button"
                    type="button"
                    onClick={() => setDismissedReminders((current) => [...current, suggestion.key])}
                  >
                    Dismiss
                  </button>
                </article>
              );
            })}
          </section>
        ) : null}
        {mutation.error ? <p className="error">{mutation.error.response?.data?.message || "Unable to save application"}</p> : null}
        <button type="submit" disabled={mutation.isPending}>
          {mutation.isPending ? "Saving..." : "Save application"}
        </button>
      </form>
    </AppShell>
  );
};

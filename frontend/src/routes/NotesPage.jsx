import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Plus, Search, Trash2 } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import { AppShell } from "../components/AppShell.jsx";
import { toast } from "../components/ToastProvider.jsx";
import { Drawer, EmptyState, InlineConfirmButton, PageShell, StandardCard } from "../components/ui.jsx";
import { createNote, deleteNote, listNoteTags, listNotes, updateNote } from "../api/notes.api.js";

const noteTypes = [
  "General",
  "OA Question",
  "Interview Question",
  "Mistake",
  "Revision Note",
  "Company Experience"
];

const emptyForm = {
  title: "",
  type: "General",
  company: "",
  role: "",
  tagsText: "",
  content: ""
};

const parseTags = (value) =>
  value
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);

const noteToForm = (note) => ({
  title: note.title || "",
  type: note.type || "General",
  company: note.company || "",
  role: note.role || "",
  tagsText: note.tags?.join(", ") || "",
  content: note.content || ""
});

export const NotesPage = () => {
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const [filters, setFilters] = useState({
    search: "",
    type: searchParams.get("type") || "",
    tag: searchParams.get("tag") || ""
  });
  const skillParam = searchParams.get("skill") || "";
  const [isDrawerOpen, setIsDrawerOpen] = useState(Boolean(skillParam));
  const [editingNote, setEditingNote] = useState(null);
  const [form, setForm] = useState({
    ...emptyForm,
    title: skillParam ? `Revise ${skillParam}` : "",
    type: searchParams.get("type") || "General",
    tagsText: skillParam || "",
    content: skillParam ? `Revision context for ${skillParam}:\n` : ""
  });

  const queryParams = useMemo(
    () => ({
      search: filters.search || undefined,
      type: filters.type || undefined,
      tag: filters.tag || undefined,
      limit: 100
    }),
    [filters]
  );

  const notesQuery = useQuery({
    queryKey: ["notes", queryParams],
    queryFn: () => listNotes(queryParams)
  });

  const tagsQuery = useQuery({
    queryKey: ["note-tags"],
    queryFn: listNoteTags
  });

  const createMutation = useMutation({
    mutationFn: createNote,
    onSuccess() {
      setForm(emptyForm);
      setIsDrawerOpen(false);
      toast.success("Note created.");
      queryClient.invalidateQueries({ queryKey: ["notes"] });
      queryClient.invalidateQueries({ queryKey: ["note-tags"] });
    },
    onError(error) {
      toast.error(error.response?.data?.message || "Unable to save note.");
    }
  });

  const updateMutation = useMutation({
    mutationFn: updateNote,
    onSuccess() {
      setForm(emptyForm);
      setEditingNote(null);
      setIsDrawerOpen(false);
      toast.success("Note updated.");
      queryClient.invalidateQueries({ queryKey: ["notes"] });
      queryClient.invalidateQueries({ queryKey: ["note-tags"] });
    },
    onError(error) {
      toast.error(error.response?.data?.message || "Unable to update note.");
    }
  });

  const deleteMutation = useMutation({
    mutationFn: deleteNote,
    onSuccess() {
      toast.success("Note deleted.");
      queryClient.invalidateQueries({ queryKey: ["notes"] });
      queryClient.invalidateQueries({ queryKey: ["note-tags"] });
    },
    onError(error) {
      toast.error(error.response?.data?.message || "Unable to delete note.");
    }
  });

  const updateForm = (event) => {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  };

  const submit = (event) => {
    event.preventDefault();
    const payload = {
      title: form.title,
      type: form.type,
      company: form.company,
      role: form.role,
      content: form.content,
      tags: parseTags(form.tagsText)
    };

    if (editingNote) {
      updateMutation.mutate({ id: editingNote._id, payload });
      return;
    }

    createMutation.mutate(payload);
  };

  const openCreateDrawer = () => {
    setEditingNote(null);
    setForm(emptyForm);
    setIsDrawerOpen(true);
  };

  const openEditDrawer = (note) => {
    setEditingNote(note);
    setForm(noteToForm(note));
    setIsDrawerOpen(true);
  };

  const closeDrawer = () => {
    setIsDrawerOpen(false);
    setEditingNote(null);
    setForm(emptyForm);
  };

  const notes = notesQuery.data || [];

  return (
    <AppShell title="Notes" eyebrow="Experience Bank">
      <section className="content-grid">
        <PageShell
          eyebrow="Experience Bank"
          title="Notes"
          accent="tracker"
          action={
            <button type="button" onClick={openCreateDrawer}>
              <Plus size={18} />
              Add Note
            </button>
          }
        >
          <section className="notes-bank">
          <div className="notes-filter-panel">
            <label>
              <span className="filter-label">
                <Search size={16} />
                Search
              </span>
              <input
                value={filters.search}
                onChange={(event) => setFilters((current) => ({ ...current, search: event.target.value }))}
                placeholder="Search notes..."
              />
            </label>
            <label>
              Type
              <select
                value={filters.type}
                onChange={(event) => setFilters((current) => ({ ...current, type: event.target.value }))}
              >
                <option value="">All types</option>
                {noteTypes.map((type) => (
                  <option key={type}>{type}</option>
                ))}
              </select>
            </label>
            <label>
              Tag
              <select
                value={filters.tag}
                onChange={(event) => setFilters((current) => ({ ...current, tag: event.target.value }))}
              >
                <option value="">All tags</option>
                {tagsQuery.data?.map((tag) => (
                  <option key={tag}>{tag}</option>
                ))}
              </select>
            </label>
          </div>

          {notesQuery.isLoading ? <p>Loading notes...</p> : null}
          {notesQuery.error ? <p className="error">Unable to load notes</p> : null}
          {!notesQuery.isLoading && notes.length === 0 ? (
            <EmptyState
              title="No notes yet"
              description="Add your first OA question, interview takeaway, mistake, or revision note."
              className="notes-empty"
              action={
                <button type="button" onClick={openCreateDrawer}>
                  <Plus size={18} />
                  Add Note
                </button>
              }
            />
          ) : null}

          <div className="note-card-grid">
            {notes.map((note) => (
              <StandardCard
                className="note-card"
                key={note._id}
                secondary={note.type}
                label={note.title}
                metadata={[
                  ...((note.company || note.role) ? [{ label: "Context", value: [note.company, note.role].filter(Boolean).join(" - ") }] : [])
                ]}
                actions={
                  <>
                    <button className="ghost-button" type="button" onClick={() => openEditDrawer(note)}>
                      <Pencil size={16} />
                      Edit
                    </button>
                    <InlineConfirmButton
                      aria-label="Delete note"
                      message="Delete this note?"
                      onConfirm={() => deleteMutation.mutate(note._id)}
                      disabled={deleteMutation.isPending}
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
          </section>
        </PageShell>
      </section>

      <Drawer
        open={isDrawerOpen}
        title={editingNote ? "Edit note" : "Add note"}
        description={
          editingNote
            ? "Update the saved question, mistake, prep note, or company experience."
            : "Save questions, mistakes, prep notes, and company experiences."
        }
        onClose={closeDrawer}
      >
        <form className="form-panel notes-form drawer-form" onSubmit={submit}>
          <label>
            Title
            <input name="title" value={form.title} onChange={updateForm} required />
          </label>
          <div className="form-row">
            <label>
              Type
              <select name="type" value={form.type} onChange={updateForm}>
                {noteTypes.map((type) => (
                  <option key={type}>{type}</option>
                ))}
              </select>
            </label>
            <label>
              Tags
              <input name="tagsText" value={form.tagsText} onChange={updateForm} placeholder="react, oa, arrays" />
            </label>
          </div>
          <div className="form-row">
            <label>
              Company
              <input name="company" value={form.company} onChange={updateForm} />
            </label>
            <label>
              Role
              <input name="role" value={form.role} onChange={updateForm} />
            </label>
          </div>
          <label>
            Content
            <textarea name="content" value={form.content} onChange={updateForm} rows="8" required />
          </label>
          {createMutation.error || updateMutation.error ? <p className="error">Unable to save note</p> : null}
          <button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
            {editingNote ? <Pencil size={18} /> : <Plus size={18} />}
            {createMutation.isPending || updateMutation.isPending
              ? "Saving..."
              : editingNote
                ? "Save changes"
                : "Save note"}
          </button>
        </form>
      </Drawer>
    </AppShell>
  );
};

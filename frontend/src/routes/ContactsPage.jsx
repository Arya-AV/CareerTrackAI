import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Plus, Search, Trash2 } from "lucide-react";
import { AppShell } from "../components/AppShell.jsx";
import { toast } from "../components/ToastProvider.jsx";
import { Drawer, EmptyState, ExternalTextLink, InlineConfirmButton, PageShell, StandardCard, StatusBadge } from "../components/ui.jsx";
import { createContact, deleteContact, listContacts } from "../api/contacts.api.js";

const emptyForm = {
  name: "",
  company: "",
  role: "",
  linkedinUrl: "",
  email: "",
  contactType: "",
  outreachStatus: "",
  notes: ""
};

export const ContactsPage = () => {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [form, setForm] = useState(emptyForm);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const contactsQuery = useQuery({
    queryKey: ["contacts", search],
    queryFn: () => listContacts({ search: search || undefined, limit: 100 })
  });

  const createMutation = useMutation({
    mutationFn: createContact,
    onSuccess() {
      setForm(emptyForm);
      setIsDrawerOpen(false);
      toast.success("Contact created.");
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
    },
    onError(error) {
      toast.error(error.response?.data?.message || "Unable to save contact.");
    }
  });

  const deleteMutation = useMutation({
    mutationFn: deleteContact,
    onSuccess() {
      toast.success("Contact deleted.");
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
    },
    onError(error) {
      toast.error(error.response?.data?.message || "Unable to delete contact.");
    }
  });

  const updateForm = (event) => {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  };

  const submit = (event) => {
    event.preventDefault();
    createMutation.mutate(form);
  };

  const contacts = contactsQuery.data?.items || [];

  return (
    <AppShell title="Contacts" eyebrow="Referral Network">
      <section className="content-grid">
        <PageShell
          eyebrow="Referral Network"
          title="Contacts"
          accent="tracker"
          action={
            <button type="button" onClick={() => setIsDrawerOpen(true)}>
              <Plus size={18} />
              Add contact
            </button>
          }
        >
          <section className="contacts-bank">
          <div className="notes-filter-panel contacts-filter-panel">
            <label>
              <span className="filter-label">
                <Search size={16} />
                Search
              </span>
              <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search contacts..." />
            </label>
          </div>

          {contactsQuery.isLoading ? <p>Loading contacts...</p> : null}
          {contactsQuery.error ? <p className="error">Unable to load contacts</p> : null}
          {!contactsQuery.isLoading && contacts.length === 0 ? (
            <EmptyState
              title="No contacts yet"
              description="Add classmates, alumni, recruiters, or employees who can refer you."
              className="contacts-empty"
              action={
                <button type="button" onClick={() => setIsDrawerOpen(true)}>
                  <Plus size={18} />
                  Add contact
                </button>
              }
            />
          ) : null}

          <div className="contact-card-grid">
            {contacts.map((contact) => (
              <StandardCard
                className="contact-card"
                key={contact._id}
                secondary={contact.company}
                label={contact.name}
                badge={
                  <div className="contact-badge-row">
                    {contact.contactType ? <StatusBadge status={contact.contactType} /> : null}
                    {contact.outreachStatus ? <StatusBadge status={contact.outreachStatus} /> : null}
                  </div>
                }
                metadata={[
                  { label: "Role", value: contact.role || "Role not set" },
                  ...(contact.email ? [{ label: "Email", value: contact.email }] : [])
                ]}
                actions={
                  <>
                    <Link className="button-link secondary-link" to={`/app/contacts/${contact._id}`}>
                      Open
                    </Link>
                    <InlineConfirmButton
                      aria-label="Delete contact"
                      message="Delete this contact?"
                      onConfirm={() => deleteMutation.mutate(contact._id)}
                      disabled={deleteMutation.isPending}
                    >
                      <Trash2 size={16} />
                    </InlineConfirmButton>
                  </>
                }
              >
                <p className="contact-linkedin">
                  LinkedIn: <ExternalTextLink href={contact.linkedinUrl}>Profile</ExternalTextLink>
                </p>
                {contact.notes ? <p className="contact-notes">{contact.notes}</p> : null}
              </StandardCard>
            ))}
          </div>
          </section>
        </PageShell>
      </section>

      <Drawer
        open={isDrawerOpen}
        title="Add contact"
        description="Track referrers once, then link them to multiple referrals."
        onClose={() => setIsDrawerOpen(false)}
      >
        <form className="form-panel contacts-form drawer-form" onSubmit={submit}>
          <label>
            Name
            <input name="name" value={form.name} onChange={updateForm} required />
          </label>
          <div className="form-row">
            <label>
              Company
              <input name="company" value={form.company} onChange={updateForm} required />
            </label>
            <label>
              Their role
              <input name="role" value={form.role} onChange={updateForm} placeholder="Software Engineer" />
            </label>
          </div>
          <label>
            LinkedIn URL
            <input name="linkedinUrl" value={form.linkedinUrl} onChange={updateForm} placeholder="https://linkedin.com/in/..." />
          </label>
          <div className="form-row">
            <label>
              Email
              <input name="email" type="email" value={form.email} onChange={updateForm} placeholder="name@example.com" />
            </label>
            <label>
              Contact type
              <select name="contactType" value={form.contactType} onChange={updateForm}>
                <option value="">Not set</option>
                <option>Alumni</option>
                <option>Recruiter</option>
                <option>Employee</option>
                <option>Hiring Manager</option>
                <option>Friend</option>
                <option>Other</option>
              </select>
            </label>
          </div>
          <label>
            Notes
            <textarea name="notes" value={form.notes} onChange={updateForm} rows="5" />
          </label>
          {createMutation.error ? <p className="error">Unable to save contact</p> : null}
          <button type="submit" disabled={createMutation.isPending}>
            <Plus size={18} />
            {createMutation.isPending ? "Saving..." : "Save contact"}
          </button>
        </form>
      </Drawer>
    </AppShell>
  );
};

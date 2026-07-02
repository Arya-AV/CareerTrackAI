import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell } from "lucide-react";
import { listReminders, updateReminder } from "../api/reminders.api.js";
import { AppShell } from "../components/AppShell.jsx";
import { toast } from "../components/ToastProvider.jsx";
import { EmptyState, ExternalTextLink, InlineConfirmButton, PageShell, StandardCard, StatusBadge } from "../components/ui.jsx";

const formatDate = (value) => (value ? new Date(value).toLocaleString() : "Not set");

export const RemindersPage = () => {
  const queryClient = useQueryClient();
  const { data: reminders = [], isLoading, error } = useQuery({
    queryKey: ["reminders"],
    queryFn: () => listReminders({ limit: 100 })
  });

  const cancelMutation = useMutation({
    mutationFn: updateReminder,
    onSuccess() {
      toast.success("Reminder cancelled.");
      queryClient.invalidateQueries({ queryKey: ["reminders"] });
    },
    onError(error) {
      toast.error(error.response?.data?.message || "Unable to cancel reminder.");
    }
  });

  return (
    <AppShell title="Reminders" eyebrow="Notifications">
      <section className="content-grid">
        <PageShell eyebrow="Notifications" title="Reminders" accent="tracker">
          {isLoading ? <p>Loading...</p> : null}
          {error ? <p className="error">Unable to load reminders</p> : null}
          {!isLoading && reminders.length === 0 ? (
            <EmptyState
              title="No reminders yet"
              description="OA, interview, referral, and deadline reminders will appear here after they are scheduled or sent."
              icon={<Bell size={22} />}
            />
          ) : null}
          {reminders.length ? (
            <div className="reminder-list">
              {reminders.map((reminder) => (
                <StandardCard
                  className="reminder-item"
                  key={reminder._id}
                  secondary="Reminder"
                  label={reminder.subject}
                  badge={<StatusBadge status={reminder.status} />}
                  metadata={[
                    { label: "Scheduled", value: formatDate(reminder.scheduledFor) },
                    { label: "Sent", value: formatDate(reminder.sentAt) },
                    { label: "Attempts", value: reminder.attempts }
                  ]}
                  actions={
                    <>
                      {reminder.link ? <ExternalTextLink href={reminder.link}>Open related record</ExternalTextLink> : null}
                      {reminder.status === "Pending" ? (
                        <InlineConfirmButton
                          className="ghost-button"
                          confirmClassName="danger-button"
                          cancelClassName="ghost-button"
                          message="Cancel this reminder? It will not be sent."
                          confirmLabel="Yes, cancel"
                          cancelLabel="Keep it"
                          onConfirm={() =>
                            cancelMutation.mutate({
                              id: reminder._id,
                              payload: { status: "Cancelled" }
                            })
                          }
                          disabled={cancelMutation.isPending}
                        >
                          Cancel
                        </InlineConfirmButton>
                      ) : null}
                    </>
                  }
                >
                  <p>{reminder.message}</p>
                  {reminder.errorMessage ? <p className="error">{reminder.errorMessage}</p> : null}
                </StandardCard>
              ))}
            </div>
          ) : null}
        </PageShell>
      </section>
    </AppShell>
  );
};

import { useEffect, useRef, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Mic, Square, Trash2 } from "lucide-react";
import { useParams } from "react-router-dom";
import { AppShell } from "../components/AppShell.jsx";
import { toast } from "../components/ToastProvider.jsx";
import { InlineConfirmButton, PageShell, StandardCard } from "../components/ui.jsx";
import { confirmInterviewReplay, submitInterviewReplay } from "../api/interviews.api.js";
import { useSpeechToText } from "../hooks/useSpeechToText.js";

const appendTranscript = (current, addition) => {
  const trimmedAddition = addition.trim();
  if (!trimmedAddition) return current;
  const separator = current.trim() ? " " : "";
  return `${current}${separator}${trimmedAddition}`;
};

export const InterviewRoundDetailPage = () => {
  const { interviewRoundId } = useParams();
  const [replayText, setReplayText] = useState("");
  const [items, setItems] = useState([]);
  const [savedMessage, setSavedMessage] = useState("");
  const previousTranscriptRef = useRef("");
  const { supported, listening, transcript, startListening, stopListening, error } = useSpeechToText();

  const replayMutation = useMutation({
    mutationFn: submitInterviewReplay,
    onSuccess(data) {
      setItems(data.items || []);
      setSavedMessage("");
      toast.success("Replay submitted and notes extracted.");
    },
    onError(error) {
      toast.error(error.response?.data?.message || "Unable to extract replay notes.");
    }
  });

  const confirmMutation = useMutation({
    mutationFn: confirmInterviewReplay,
    onSuccess(data) {
      setSavedMessage(`${data.notes?.length || 0} interview replay notes saved.`);
      toast.success("Replay notes saved.");
    },
    onError(error) {
      toast.error(error.response?.data?.message || "Unable to save replay notes.");
    }
  });

  useEffect(() => {
    if (!transcript || transcript === previousTranscriptRef.current) return;

    const previousTranscript = previousTranscriptRef.current;
    const nextText = transcript.startsWith(previousTranscript)
      ? transcript.slice(previousTranscript.length)
      : transcript;

    previousTranscriptRef.current = transcript;
    setReplayText((current) => appendTranscript(current, nextText));
  }, [transcript]);

  const handleStartListening = () => {
    previousTranscriptRef.current = "";
    startListening();
  };

  const submit = (event) => {
    event.preventDefault();
    replayMutation.mutate({ interviewRoundId, text: replayText });
  };

  const updateItem = (index, field, value) => {
    setItems((current) =>
      current.map((item, itemIndex) => (itemIndex === index ? { ...item, [field]: value } : item))
    );
  };

  const deleteItem = (index) => {
    setItems((current) => current.filter((_item, itemIndex) => itemIndex !== index));
  };

  const saveNotes = () => {
    confirmMutation.mutate({
      interviewRoundId,
      items: items.map((item) => ({
        question: item.question,
        answerSummary: item.answerSummary,
        tag: item.tag || item.suggestedTag
      }))
    });
  };

  const voiceMessage = !supported
    ? "Voice input is not supported in this browser. Please type your replay."
    : error;

  return (
    <AppShell title="Interview Replay" eyebrow="Interview Round">
      <section className="content-grid">
        <PageShell eyebrow="Interview Round" title="Interview Replay" accent="tracker">
          <StandardCard className="replay-panel" label="Replay your interview" secondary="Write or speak what you remember, then edit the text before submitting.">
            <form className="stacked-form" onSubmit={submit}>

          <label>
            Recall
            <textarea
              value={replayText}
              onChange={(event) => setReplayText(event.target.value)}
              rows="12"
              placeholder="Write or speak what you remember from the interview..."
              required
            />
          </label>

          <div className="voice-controls">
            {!listening ? (
              <button type="button" onClick={handleStartListening} disabled={!supported}>
                <Mic size={18} />
                Start Voice Input
              </button>
            ) : (
              <button type="button" className="danger-button" onClick={stopListening}>
                <Square size={16} />
                Stop Listening
              </button>
            )}
            <p className={`voice-status ${listening ? "listening" : ""}`}>
              {listening ? "Listening..." : voiceMessage || "Voice input ready."}
            </p>
          </div>

          {replayMutation.error ? <p className="error">Unable to extract replay notes.</p> : null}

          <button type="submit" disabled={replayMutation.isPending || !replayText.trim()}>
            {replayMutation.isPending ? "Processing with Gemini..." : "Extract replay notes"}
          </button>
            </form>
          </StandardCard>

        {items.length ? (
          <StandardCard className="replay-results" label="Review extracted notes" secondary="Edit, retag, or delete items before saving them to your Notes bank.">

            {items.map((item, index) => (
              <StandardCard
                className="replay-note-card"
                key={`${item.question}-${index}`}
                secondary={`Suggested: ${item.suggestedTag}`}
                label={item.question || "Extracted note"}
                actions={
                  <InlineConfirmButton
                    aria-label="Delete extracted note"
                    message="Delete this extracted note?"
                    onConfirm={() => deleteItem(index)}
                  >
                    <Trash2 size={16} />
                  </InlineConfirmButton>
                }
              >
                <label>
                  Question
                  <textarea
                    value={item.question}
                    onChange={(event) => updateItem(index, "question", event.target.value)}
                    rows="3"
                  />
                </label>
                <label>
                  Answer Summary
                  <textarea
                    value={item.answerSummary}
                    onChange={(event) => updateItem(index, "answerSummary", event.target.value)}
                    rows="4"
                  />
                </label>
                <label>
                  Tag
                  <select
                    value={item.tag || item.suggestedTag}
                    onChange={(event) => updateItem(index, "tag", event.target.value)}
                  >
                    <option>Mistake</option>
                    <option>Revision Note</option>
                  </select>
                </label>
              </StandardCard>
            ))}

            {confirmMutation.error ? <p className="error">Unable to save replay notes.</p> : null}
            {savedMessage ? <div className="toast success-toast">{savedMessage}</div> : null}
            <button type="button" onClick={saveNotes} disabled={confirmMutation.isPending || items.length === 0}>
              {confirmMutation.isPending ? "Saving notes..." : "Save Notes"}
            </button>
          </StandardCard>
        ) : null}
        </PageShell>
      </section>
    </AppShell>
  );
};

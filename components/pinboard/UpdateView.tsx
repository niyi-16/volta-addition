"use client";

import { useState } from "react";
import { sampleUpdateText } from "@/lib/pinboard/seed";
import { suggestTopics } from "@/lib/pinboard/suggest";
import { activeTopics, myShares } from "@/lib/pinboard/state";
import { nowIso, usePinboard } from "./store";
import { TagButton, Toast } from "./ui";


function toggle(list: string[], id: string): string[] {
  return list.includes(id) ? list.filter((x) => x !== id) : [...list, id];
}

/** F1: monthly update with the three opt-in questions. The free text stays in this component (C1). */
export function UpdateView({ founderId, onSubmitted }: { founderId: string; onSubmitted: () => void }) {
  const { state, dispatch, pending } = usePinboard();
  const topics = activeTopics(state);
  const [stuck, setStuck] = useState(sampleUpdateText[founderId] ?? "");
  const [shareOn, setShareOn] = useState(true);
  const [livedOn, setLivedOn] = useState(true);
  const existingWorking = myShares(state, founderId, "working");
  const existingLived = myShares(state, founderId, "lived");
  const suggested = suggestTopics(stuck, topics);
  // Until the founder touches the tags, pre-select the top suggestion (or what they already share).
  const [picked, setPicked] = useState<string[] | null>(null);
  const working = picked ?? (existingWorking.length ? existingWorking : suggested.slice(0, 1).map((t) => t.id));
  const [lived, setLived] = useState<string[]>(existingLived);
  const [showAll, setShowAll] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const shown = showAll
    ? topics
    : topics.filter((t) => suggested.includes(t) || working.includes(t.id));

  async function submit() {
    const next = await dispatch({
      type: "submitOptIns",
      founderId,
      working: shareOn ? working : [],
      lived: livedOn ? lived : [],
      now: nowIso(),
    });
    if (next) setSubmitted(true);
  }

  return (
    <section className="pane">
      <div>
        <h1>October update</h1>
        <p className="sub">Revenue and customer numbers stay private to you and Volta.</p>
      </div>

      <div className="update-grid">
      <div className="card">
        <div className="card-title-row">
          <h3>Your update</h3>
          <span className="badge-outline">Private to you and Volta</span>
        </div>
        <label className="fld" htmlFor="stuck">
          Where are you stuck?
        </label>
        <textarea id="stuck" className="tall" value={stuck} onChange={(e) => setStuck(e.target.value)} />
      </div>

      <div className="card optin">
        <div className="card-title-row">
          <h3>Share with other founders</h3>
          <span className="badge-outline">Optional</span>
        </div>
        <div className="row">
          <input type="checkbox" id="share" checked={shareOn} onChange={(e) => setShareOn(e.target.checked)} />
          <div>
            <label htmlFor="share">
              <b>Share this topic with other founders</b>
            </label>
            <div className="small">
              Only the topic shows on the Pinboard, with your name. What you wrote above stays private. Sharing a topic
              doesn&apos;t mean anyone gets your email.
            </div>
          </div>
        </div>
        {shareOn && (
          <div>
            <div className="small" style={{ marginBottom: 6 }}>
              {suggested.length
                ? "Suggested from what you wrote. Tap to change."
                : "No match from what you wrote. Pick a topic."}
            </div>
            <div className="tags">
              {(shown.length ? shown : topics).map((t) => (
                <TagButton key={t.id} pressed={working.includes(t.id)} onClick={() => setPicked(toggle(working, t.id))}>
                  {t.label}
                </TagButton>
              ))}
              {!showAll && shown.length > 0 && (
                <button type="button" className="linkish" onClick={() => setShowAll(true)}>
                  More topics…
                </button>
              )}
            </div>
          </div>
        )}
        <div className="row">
          <input type="checkbox" id="livedchk" checked={livedOn} onChange={(e) => setLivedOn(e.target.checked)} />
          <div>
            <label htmlFor="livedchk">
              <b>I&apos;ve been through these</b>
            </label>
            <div className="small">
              Others can ask about your experience. You decide each time, and your email is shared only if you accept.
            </div>
            {livedOn && (
              <div className="tags" style={{ marginTop: 6 }}>
                {topics.map((t) => (
                  <TagButton key={t.id} pressed={lived.includes(t.id)} onClick={() => setLived(toggle(lived, t.id))}>
                    {t.label}
                  </TagButton>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
      </div>

      <button className="btn" disabled={pending} onClick={submit}>
        {pending ? "Submitting…" : "Submit update"}
      </button>
      {submitted && (
        <Toast onDismiss={() => setSubmitted(false)}>
          Update sent to Volta. The Pinboard now shows only the topics you ticked, replacing what you shared before.{" "}
          <button className="linkish" onClick={onSubmitted}>
            See your update history
          </button>{" "}
          to withdraw anything later.
        </Toast>
      )}
    </section>
  );
}

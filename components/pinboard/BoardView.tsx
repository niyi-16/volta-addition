"use client";

import { useState } from "react";
import {
  NOTE_MAX,
  activeTopics,
  askBlocker,
  confirmedMembers,
  founderById,
  founderLine,
  nameWithPlace,
  groupForTopic,
  isMember,
  newEmailIds,
  sharesFor,
} from "@/lib/pinboard/state";
import type { Founder, Topic } from "@/lib/pinboard/types";
import { nowIso, usePinboard } from "./store";
import { EmailCard, Modal, TagButton, Toast } from "./ui";

type Dialog =
  | { kind: "join"; topic: Topic }
  | { kind: "joined"; topic: Topic; emailIds: string[] }
  | { kind: "ask"; topic: Topic; recipient: Founder }
  | { kind: "asked"; topic: Topic; recipient: Founder; emailIds: string[] };

function nameList(names: string[], max = 3): string {
  if (names.length <= max) return names.join(", ");
  return `${names.slice(0, max).join(", ")} and ${names.length - max} more`;
}

/** F2 + F3: topic tiles with Join (consent first) and Ask about experience. */
export function BoardView({ founderId, readOnly = false }: { founderId: string; readOnly?: boolean }) {
  const { state, dispatch, pending } = usePinboard();
  const [filter, setFilter] = useState("all");
  const [dialog, setDialog] = useState<Dialog | null>(null);
  const [note, setNote] = useState("");
  const [left, setLeft] = useState<string | null>(null);

  const tiles = activeTopics(state)
    .map((topic) => {
      const working = sharesFor(state, topic.id, "working").map((s) => founderById(state, s.founderId));
      const lived = sharesFor(state, topic.id, "lived").map((s) => founderById(state, s.founderId));
      const group = groupForTopic(state, topic.id);
      return {
        topic,
        working,
        lived,
        inConversation: group ? confirmedMembers(state, group.id).length : 0,
        joined: isMember(state, founderId, topic.id),
      };
    })
    .filter((t) => t.working.length + t.lived.length > 0)
    .filter((t) => filter === "all" || (filter === "lived" ? t.lived.length > 0 : t.topic.category === filter))
    .sort((a, b) => b.working.length - a.working.length || a.topic.label.localeCompare(b.topic.label));

  const categories = [...new Set(activeTopics(state).map((t) => t.category))].sort();
  const display = (f: Founder) => (f.id === founderId ? "You" : nameWithPlace(f));
  const youFirst = (list: Founder[]) => [...list].sort((a, b) => Number(b.id === founderId) - Number(a.id === founderId));

  async function confirmJoin(topic: Topic) {
    const next = await dispatch({ type: "joinGroup", founderId, topicId: topic.id, now: nowIso() });
    setDialog(next ? { kind: "joined", topic, emailIds: newEmailIds(state, next) } : null);
  }

  async function sendAsk(topic: Topic, recipient: Founder) {
    const next = await dispatch({ type: "sendAsk", askerId: founderId, recipientId: recipient.id, topicId: topic.id, note, now: nowIso() });
    if (!next) return setDialog(null);
    setNote("");
    setDialog({ kind: "asked", topic, recipient, emailIds: newEmailIds(state, next) });
  }

  return (
    <section className="pane">
      <div>
        <h1>Pinboard</h1>
        <p className="sub">What founders in the residency are working on this month. Only topics people chose to share.</p>
      </div>
      <div className="filters">
        <TagButton pressed={filter === "all"} onClick={() => setFilter("all")}>
          All
        </TagButton>
        {categories.map((c) => (
          <TagButton key={c} pressed={filter === c} onClick={() => setFilter(c)}>
            {c}
          </TagButton>
        ))}
        <TagButton pressed={filter === "lived"} onClick={() => setFilter("lived")}>
          Someone&apos;s been through it
        </TagButton>
      </div>

      {left && <Toast onDismiss={() => setLeft(null)}>You left the conversation on “{left}”. Nobody else is emailed.</Toast>}

      <div className="grid">
        {tiles.map(({ topic, working, lived, inConversation, joined }) => (
          <article className="card" key={topic.id}>
            <span className="cat">{topic.category}</span>
            <h3>{topic.label}</h3>
            <div className="counts">
              <span className="lived">
                <b>{lived.length}</b> {lived.length === 1 ? "has" : "have"} been through this
              </span>
              <span>
                <b>{working.length}</b> {working.length === 1 ? "is going" : "going"} through it now
              </span>
            </div>
            <div className="people">
              {working.length ? nameList(youFirst(working).map(display)) : "Nobody is going through it right now"}
            </div>
            {lived.length > 0 ? (
              <div className="people lived-row">
                <span>Been through it:</span>
                {youFirst(lived).map((f) =>
                  f.id === founderId || readOnly ? (
                    <span key={f.id} className={f.id === founderId ? "you" : undefined}>
                      {display(f)}
                    </span>
                  ) : (
                    <button
                      key={f.id}
                      className="ask-chip"
                      onClick={() => setDialog({ kind: "ask", topic, recipient: f })}
                      title={`Ask ${f.displayName} (${founderLine(f)}) about their experience`}
                    >
                      Ask {f.displayName}
                    </button>
                  ),
                )}
              </div>
            ) : (
              <div className="people">Nobody has shared living through this yet.</div>
            )}
            <div className="small">
              {inConversation === 0
                ? "No conversation yet"
                : `${inConversation} ${inConversation === 1 ? "founder" : "founders"} in the conversation`}
            </div>
            {!readOnly &&
              (joined ? (
                <div className="row-btns">
                  <span className="you">✓ You&apos;re in</span>
                  <button
                    className="linkish"
                    disabled={pending}
                    onClick={() => {
                      dispatch({ type: "leaveGroup", founderId, topicId: topic.id, now: nowIso() });
                      setLeft(topic.label);
                    }}
                  >
                    Leave
                  </button>
                </div>
              ) : (
                <button className="btn" disabled={pending} onClick={() => setDialog({ kind: "join", topic })}>
                  Join the conversation
                </button>
              ))}
          </article>
        ))}
      </div>

      {dialog?.kind === "join" && (
        <Modal title="Join this conversation?" onClose={() => setDialog(null)}>
          <p>
            <b>{dialog.topic.label}</b>
          </p>
          <p>
            Your name and email will be shared with the other founders who join this conversation. Nobody who
            hasn&apos;t joined will see them.
          </p>
          <p className="small">
            Once at least two people have joined, everyone in the conversation gets one intro email. You can leave at
            any time.
          </p>
          <div className="row-btns">
            <button className="btn" disabled={pending} onClick={() => confirmJoin(dialog.topic)}>
              {pending ? "Joining…" : "Yes, join"}
            </button>
            <button className="btn ghost" onClick={() => setDialog(null)}>
              Cancel
            </button>
          </div>
        </Modal>
      )}

      {dialog?.kind === "joined" && (
        <JoinedResult topic={dialog.topic} emailIds={dialog.emailIds} onClose={() => setDialog(null)} />
      )}

      {dialog?.kind === "ask" && (
        <Modal title={`Ask ${dialog.recipient.displayName} about their experience`} onClose={() => setDialog(null)}>
          <p>
            <span className="small">{founderLine(dialog.recipient)}</span>
            <br />
            {dialog.recipient.displayName} has been through <b>{dialog.topic.label}</b>. Tell them what you&apos;d like
            to hear about. They see your name and this note, and decide whether to chat.
          </p>
          {(() => {
            const blocker = askBlocker(state, founderId, dialog.recipient.id, dialog.topic.id);
            return (
              <>
                <label className="fld" htmlFor="ask-note">
                  Your note
                </label>
                <textarea
                  id="ask-note"
                  maxLength={NOTE_MAX}
                  value={note}
                  placeholder="e.g. We're about to price our first annual plan and I'd love to hear how yours went."
                  onChange={(e) => setNote(e.target.value)}
                />
                <div className="small">
                  {note.length}/{NOTE_MAX} · No email addresses are shared unless they accept.
                </div>
                {blocker && <p className="warn">{blocker}</p>}
                <div className="row-btns">
                  <button
                    className="btn"
                    disabled={!!blocker || !note.trim() || pending}
                    onClick={() => sendAsk(dialog.topic, dialog.recipient)}
                  >
                    {pending ? "Sending…" : "Send request"}
                  </button>
                  <button className="btn ghost" onClick={() => setDialog(null)}>
                    Cancel
                  </button>
                </div>
              </>
            );
          })()}
        </Modal>
      )}

      {dialog?.kind === "asked" && (
        <Modal title="Request sent" onClose={() => setDialog(null)}>
          <p>
            {dialog.recipient.displayName} will get your note and can say yes or “not right now”. If they say yes, you
            both get an intro email. Nothing else is shared.
          </p>
          <p className="small">What {dialog.recipient.displayName} receives:</p>
          {state.emails
            .filter((e) => dialog.emailIds.includes(e.id))
            .map((e) => (
              <EmailCard key={e.id} email={e} />
            ))}
        </Modal>
      )}
    </section>
  );
}

function JoinedResult({ topic, emailIds, onClose }: { topic: Topic; emailIds: string[]; onClose: () => void }) {
  const { state } = usePinboard();
  const newEmails = state.emails.filter((e) => emailIds.includes(e.id));
  const group = groupForTopic(state, topic.id);
  const count = group ? confirmedMembers(state, group.id).length : 0;
  return (
    <Modal title="You're in" onClose={onClose}>
      {newEmails.length > 0 ? (
        <>
          <p>
            {count} founders are now in the conversation on <b>{topic.label}</b>. This email just went to everyone in
            it:
          </p>
          {newEmails.map((e) => (
            <EmailCard key={e.id} email={e} />
          ))}
        </>
      ) : (
        <>
          <p>
            You&apos;re the first in the conversation on <b>{topic.label}</b>. As soon as someone else joins, you both
            get an intro email.
          </p>
          <p className="small">
            Each week, founders who shared this topic but haven&apos;t joined get a nudge that doesn&apos;t name anyone.
          </p>
        </>
      )}
      <button className="btn" onClick={onClose}>
        Done
      </button>
    </Modal>
  );
}

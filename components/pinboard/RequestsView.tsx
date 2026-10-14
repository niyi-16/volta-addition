"use client";

import { useState } from "react";
import { MAX_OPEN_ASKS, founderById, founderLine, newEmailIds, openAsksBy, topicById } from "@/lib/pinboard/state";
import type { Ask } from "@/lib/pinboard/types";
import { nowIso, usePinboard } from "./store";
import { EmailCard, Modal } from "./ui";

const fmt = (iso: string) =>
  new Date(iso).toLocaleDateString("en-CA", { month: "short", day: "numeric", timeZone: "America/Halifax" });

/** F3 recipient screen (what the Accept / Not right now links open) plus the asker's view. */
export function RequestsView({ founderId }: { founderId: string }) {
  const { state, dispatch, pending } = usePinboard();
  const [introIds, setIntroIds] = useState<string[] | null>(null);

  const incoming = state.asks.filter((a) => a.recipientId === founderId).reverse();
  const outgoing = state.asks.filter((a) => a.askerId === founderId).reverse();
  const notices = state.notices.filter((n) => n.founderId === founderId).reverse();

  async function respond(ask: Ask, accept: boolean) {
    const next = await dispatch({ type: "respondAsk", askId: ask.id, founderId, accept, now: nowIso() });
    if (accept && next) setIntroIds(newEmailIds(state, next));
  }

  // C8: the asker learns only "not right now", whether declined or expired.
  const outgoingStatus = (a: Ask) =>
    a.status === "pending" ? "Waiting for a reply" : a.status === "accepted" ? "Accepted. Check your email for the intro." : "Not right now";

  return (
    <section className="pane">
      <div>
        <h1>Requests</h1>
        <p className="sub">Founders asking about something you&apos;ve been through, and requests you&apos;ve sent.</p>
      </div>

      {notices.length > 0 && (
        <div className="stack">
          {notices.map((n) => (
            <div key={n.id} className="notice">
              One of your requests: <b>{n.text}</b>. <span className="small">{fmt(n.at)}</span>
            </div>
          ))}
        </div>
      )}

      <h2>Asked of you</h2>
      {incoming.length === 0 && <p className="small">No requests yet.</p>}
      {incoming.map((a) => {
        const asker = founderById(state, a.askerId);
        return (
          <article key={a.id} className="card">
            <span className="cat">{topicById(state, a.topicId).label}</span>
            <h3>
              {asker.displayName} <span className="small">{founderLine(asker)}</span>
            </h3>
            <blockquote>{a.note}</blockquote>
            {a.status === "pending" ? (
              <>
                <p className="small">
                  Your email isn&apos;t shared unless you say yes. If you choose “not right now”, {asker.displayName} sees
                  only that.
                </p>
                <div className="row-btns">
                  <button className="btn" disabled={pending} onClick={() => respond(a, true)}>
                    Happy to chat
                  </button>
                  <button className="btn ghost" disabled={pending} onClick={() => respond(a, false)}>
                    Not right now
                  </button>
                  <button
                    className="linkish proto"
                    disabled={pending}
                    title="Prototype only: simulate no reply for 14 days"
                    onClick={() => dispatch({ type: "expireAsk", askId: a.id, now: nowIso() })}
                  >
                    Simulate 14 days, no reply
                  </button>
                </div>
              </>
            ) : (
              <p className="small">
                {a.status === "accepted" ? "You said yes" : a.status === "declined" ? "You said not right now" : "Expired"} ·{" "}
                {fmt(a.respondedAt ?? a.createdAt)}
              </p>
            )}
          </article>
        );
      })}

      <h2>You asked</h2>
      <p className="small">
        {openAsksBy(state, founderId).length} of {MAX_OPEN_ASKS} open requests in use.
      </p>
      {outgoing.length === 0 && <p className="small">You haven&apos;t asked anyone yet. Use “Ask” on a Pinboard tile.</p>}
      {outgoing.map((a) => (
        <article key={a.id} className="card">
          <span className="cat">{topicById(state, a.topicId).label}</span>
          <h3>{founderById(state, a.recipientId).displayName}</h3>
          <p className={a.status === "accepted" ? "you" : "small"}>{outgoingStatus(a)}</p>
        </article>
      ))}

      {introIds !== null && (
        <Modal title="Intro sent" onClose={() => setIntroIds(null)}>
          <p>You&apos;re connected. This email just went to both of you:</p>
          {state.emails
            .filter((e) => introIds.includes(e.id))
            .map((e) => (
              <EmailCard key={e.id} email={e} />
            ))}
          <button className="btn" onClick={() => setIntroIds(null)}>
            Done
          </button>
        </Modal>
      )}
    </section>
  );
}

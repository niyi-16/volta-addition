"use client";

import { useState } from "react";
import { confirmedMembers, isVisibleShare, topicById } from "@/lib/pinboard/state";
import type { Share, Topic, Update } from "@/lib/pinboard/types";
import { nowIso, usePinboard } from "./store";
import { Modal, Toast } from "./ui";

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-CA", { month: "short", day: "numeric", year: "numeric", timeZone: "America/Halifax" });
const fmtMonth = (iso: string) =>
  new Date(iso).toLocaleDateString("en-CA", { month: "long", year: "numeric", timeZone: "America/Halifax" });

type Confirm =
  | { kind: "share"; share: Share; topic: Topic }
  | { kind: "update"; update: Update; count: number }
  | { kind: "leave"; topic: Topic };

/** Submitted updates and what each one shared. Any consent can be withdrawn here at any time (C10). */
export function HistoryView({ founderId }: { founderId: string }) {
  const { state, dispatch, pending } = usePinboard();
  const [confirm, setConfirm] = useState<Confirm | null>(null);
  const [done, setDone] = useState<string | null>(null);

  const updates = state.updates.filter((u) => u.founderId === founderId).reverse();
  const mine = state.shares.filter((s) => s.founderId === founderId);
  const orphanShares = mine.filter((s) => !s.updateId || !updates.some((u) => u.id === s.updateId));
  const conversations = state.groups.filter((g) =>
    confirmedMembers(state, g.id).some((m) => m.founderId === founderId),
  );

  async function run() {
    if (!confirm) return;
    const now = nowIso();
    const ok =
      confirm.kind === "share"
        ? await dispatch({ type: "withdrawShare", founderId, shareId: confirm.share.id, now })
        : confirm.kind === "update"
          ? await dispatch({ type: "withdrawUpdate", founderId, updateId: confirm.update.id, now })
          : await dispatch({ type: "leaveGroup", founderId, topicId: confirm.topic.id, now });
    if (ok) {
      setDone(
        confirm.kind === "leave"
          ? `You left the conversation on “${confirm.topic.label}”.`
          : "Withdrawn. It's off the Pinboard now.",
      );
    }
    setConfirm(null);
  }

  const shareRow = (s: Share) => {
    const topic = topicById(state, s.topicId);
    const live = isVisibleShare(s);
    return (
      <li key={s.id} className="history-share">
        <span className={s.kind === "lived" ? "pill l" : "pill"}>
          {s.kind === "lived" ? "Been through it" : "Going through it now"}: {topic.label}
        </span>
        {live ? (
          <>
            <span className="status live">On the Pinboard</span>
            <button className="linkish" disabled={pending} onClick={() => setConfirm({ kind: "share", share: s, topic })}>
              Withdraw
            </button>
          </>
        ) : s.endedReason === "replaced" ? (
          <span className="status">Replaced by a later update</span>
        ) : s.withdrawnAt ? (
          <span className="status">Withdrawn {fmtDate(s.withdrawnAt)}</span>
        ) : (
          <span className="status">Not shared</span>
        )}
      </li>
    );
  };

  return (
    <section className="pane">
      <div>
        <h1>Update history</h1>
        <p className="sub">
          Every update you&apos;ve submitted and what you chose to share from it. Withdraw anything at any time. It
          comes off the Pinboard straight away.
        </p>
      </div>

      {done && <Toast onDismiss={() => setDone(null)}>{done}</Toast>}

      {updates.length === 0 && <p className="small">You haven&apos;t submitted an update yet.</p>}

      {updates.map((u) => {
        const shares = mine.filter((s) => s.updateId === u.id);
        const live = shares.filter(isVisibleShare);
        return (
          <article key={u.id} className="card">
            <div className="history-head">
              <div>
                <h3>{fmtMonth(u.submittedAt)} update</h3>
                <span className="small">Submitted {fmtDate(u.submittedAt)}</span>
              </div>
              {live.length > 0 && (
                <button
                  className="btn ghost"
                  disabled={pending}
                  onClick={() => setConfirm({ kind: "update", update: u, count: live.length })}
                >
                  Withdraw all from this update
                </button>
              )}
            </div>
            <p className="small">
              Your written answers went to Volta only. The Pinboard never stored them.
            </p>
            {shares.length ? (
              <ul className="history-list">{shares.map(shareRow)}</ul>
            ) : (
              <p className="small">You didn&apos;t share any topics in this update.</p>
            )}
          </article>
        );
      })}

      {orphanShares.length > 0 && (
        <article className="card">
          <h3>Other shares</h3>
          <ul className="history-list">{orphanShares.map(shareRow)}</ul>
        </article>
      )}

      <h2>Conversations you&apos;ve joined</h2>
      <p className="small">
        Joining shared your name and email with the others in the conversation. Leaving stops future emails. People
        who already got the intro keep it.
      </p>
      {conversations.length === 0 && <p className="small">None yet.</p>}
      <ul className="history-list">
        {conversations.map((g) => {
          const topic = topicById(state, g.topicId);
          return (
            <li key={g.id} className="history-share">
              <span className="pill">{topic.label}</span>
              <span className="status">{g.status === "introduced" ? "Introduced" : "Waiting for someone to join"}</span>
              <button className="linkish" disabled={pending} onClick={() => setConfirm({ kind: "leave", topic })}>
                Leave
              </button>
            </li>
          );
        })}
      </ul>

      {confirm && (
        <Modal
          title={confirm.kind === "leave" ? "Leave this conversation?" : "Withdraw from the Pinboard?"}
          onClose={() => setConfirm(null)}
        >
          {confirm.kind === "share" && (
            <p>
              “{confirm.topic.label}” and your name come off the Pinboard now.
              {confirm.share.kind === "lived" && " Nobody new can ask you about it."}
            </p>
          )}
          {confirm.kind === "update" && (
            <p>
              The {confirm.count} {confirm.count === 1 ? "topic" : "topics"} still live from your{" "}
              {fmtMonth(confirm.update.submittedAt)} update come off the Pinboard now.
            </p>
          )}
          {confirm.kind === "leave" && (
            <p>
              You won&apos;t get more emails about “{confirm.topic.label}”. Founders who already got the intro email
              still have it.
            </p>
          )}
          {confirm.kind !== "leave" && (
            <p className="small">Conversations you joined are separate. Leave them below if you want to.</p>
          )}
          <div className="row-btns">
            <button className="btn" disabled={pending} onClick={run}>
              {pending ? "Working…" : confirm.kind === "leave" ? "Leave" : "Withdraw"}
            </button>
            <button className="btn ghost" onClick={() => setConfirm(null)}>
              Cancel
            </button>
          </div>
        </Modal>
      )}
    </section>
  );
}

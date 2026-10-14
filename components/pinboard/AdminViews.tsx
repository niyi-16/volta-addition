"use client";

import { useState, type FormEvent } from "react";
import { Eye, EyeOff, GitMerge, Pencil, Plus, Search } from "lucide-react";
import { suggestTopics } from "@/lib/pinboard/suggest";
import {
  activeRsvps,
  activeTopics,
  confirmedMembers,
  founderById,
  founderLine,
  groupForTopic,
  newEmailIds,
  optedInFounderIds,
  myShares,
  sharesFor,
  topicById,
  type PinboardState,
} from "@/lib/pinboard/state";
import type { Founder, PinboardEvent, Topic } from "@/lib/pinboard/types";
import { EventCard, TopicPills, fmtEventTime } from "./MoreViews";
import { nowIso, usePinboard } from "./store";
import { Modal, Toast } from "./ui";

const TARGET_CONNECTIONS = 10;

function monthLabel(iso: string) {
  return new Date(iso).toLocaleDateString("en-CA", { month: "long", year: "numeric", timeZone: "America/Halifax" });
}

/** F4: aggregates and opted-in shares only (C9). */
export function OverviewView() {
  const { state, dispatch, pending } = usePinboard();
  const [nudgesSent, setNudgesSent] = useState<number | null>(null);

  const founders = state.founders.filter((f) => !f.isAdmin);
  const optedIn = optedInFounderIds(state);
  const rate = founders.length ? Math.round((optedIn.size / founders.length) * 100) : 0;

  const byMonth = new Map<string, { group: number; ask: number }>();
  for (const c of state.connections) {
    const key = monthLabel(c.createdAt);
    const row = byMonth.get(key) ?? { group: 0, ask: 0 };
    row[c.source] += 1;
    byMonth.set(key, row);
  }
  const total = state.connections.length;

  const rows = activeTopics(state)
    .map((t) => {
      const g = groupForTopic(state, t.id);
      return {
        topic: t,
        working: sharesFor(state, t.id, "working").length,
        lived: sharesFor(state, t.id, "lived").length,
        joined: g ? confirmedMembers(state, g.id).length : 0,
        introduced: g?.status === "introduced",
      };
    })
    .sort((a, b) => b.working - a.working || a.topic.label.localeCompare(b.topic.label));

  async function runNudges() {
    const next = await dispatch({ type: "runNudges", now: nowIso() });
    if (next) setNudgesSent(newEmailIds(state, next).length);
  }

  return (
    <section className="pane">
      <div>
        <h1>Overview</h1>
        <p className="sub">Counts and opted-in topics only. Private update answers never appear here.</p>
      </div>

      <div className="stats">
        <div className="stat primary">
          <span className="stat-label">Connections made without an intro from you</span>
          <span className="stat-value">{total}</span>
          <span className="small">
            Goal: {TARGET_CONNECTIONS} in one monthly update cycle ·{" "}
            {state.connections.filter((c) => c.source === "group").length} from conversations,{" "}
            {state.connections.filter((c) => c.source === "ask").length} from asks
          </span>
          <div className="meter" aria-hidden>
            <span style={{ width: `${Math.min(100, (total / TARGET_CONNECTIONS) * 100)}%` }} />
          </div>
        </div>
        <div className="stat">
          <span className="stat-label">Opt-in rate</span>
          <span className="stat-value">{rate}%</span>
          <span className="small">
            {optedIn.size} of {founders.length} founders share at least one topic
          </span>
        </div>
        <div className="stat">
          <span className="stat-label">Open requests</span>
          <span className="stat-value">{state.asks.filter((a) => a.status === "pending").length}</span>
          <span className="small">Asks waiting on a reply</span>
        </div>
      </div>

      {byMonth.size > 0 && (
        <table className="table">
          <thead>
            <tr>
              <th>Month</th>
              <th>Conversations</th>
              <th>Asks</th>
            </tr>
          </thead>
          <tbody>
            {[...byMonth].map(([m, r]) => (
              <tr key={m}>
                <td>{m}</td>
                <td>{r.group}</td>
                <td>{r.ask}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <h2>Topics</h2>
      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>Topic</th>
              <th>Going through it now</th>
              <th>Been through it</th>
              <th>In conversation</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.topic.id}>
                <td>
                  {r.topic.label}
                  <div className="small">{r.topic.category}</div>
                </td>
                <td>{r.working}</td>
                <td>{r.lived}</td>
                <td>
                  {r.joined}
                  {r.introduced && <span className="small"> · introduced</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="proto-box">
        <b>Prototype control</b>
        <p className="small">
          In the real build this runs weekly. It emails founders who shared a topic where exactly one person is waiting
          in the conversation. The email names nobody, and each founder gets at most one nudge per topic.
        </p>
        <button className="btn ghost" disabled={pending} onClick={runNudges}>
          Run the weekly nudge now
        </button>
        {nudgesSent !== null && (
          <Toast onDismiss={() => setNudgesSent(null)}>
            {nudgesSent ? `${nudgesSent} nudge emails logged. See the email log.` : "Nobody to nudge right now."}
          </Toast>
        )}
      </div>
    </section>
  );
}

/** F5: Laura edits the tag list without a developer. F6 preview shows the effect live. */
type TopicDialog = { kind: "add" } | { kind: "edit"; topic: Topic } | { kind: "merge"; topic: Topic };

export function TopicEditorView({ adminId }: { adminId: string }) {
  const { state, dispatch } = usePinboard();
  const [query, setQuery] = useState("");
  const [dialog, setDialog] = useState<TopicDialog | null>(null);
  const [tryText, setTryText] = useState("Our SR&ED claim is due and we have no idea how to price per seat.");

  const live = state.topics.filter((t) => !t.mergedInto);
  const categories = [...new Set(state.topics.map((t) => t.category))].sort();
  const suggested = suggestTopics(tryText, state.topics);
  const q = query.trim().toLowerCase();
  const rows = live
    .filter((t) => !q || [t.label, t.category, ...t.keywords].some((s) => s.toLowerCase().includes(q)))
    .sort((a, b) => a.category.localeCompare(b.category) || a.label.localeCompare(b.label));
  const activeShares = (topicId: string) =>
    state.shares.filter((s) => s.topicId === topicId && s.consentedAt && !s.withdrawnAt).length;

  return (
    <section className="pane">
      <div className="page-head">
        <div>
          <h1>Topics</h1>
          <p className="sub">
            Keywords drive the suggestion founders see in their monthly update. Changes apply straight away.
          </p>
        </div>
        <button className="btn" onClick={() => setDialog({ kind: "add" })}>
          <Plus size={16} aria-hidden /> Add topic
        </button>
      </div>

      <datalist id="categories">
        {categories.map((c) => (
          <option key={c} value={c} />
        ))}
      </datalist>

      <div className="panel">
        <div className="panel-toolbar">
          <div className="search">
            <Search size={16} aria-hidden />
            <input
              type="search"
              placeholder="Search topics or keywords"
              aria-label="Search topics or keywords"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
        </div>
        <div className="table-scroll">
          <table className="table topics-table">
            <thead>
              <tr>
                <th className="actions-col">
                  <span className="sr-only">Actions</span>
                </th>
                <th>Label</th>
                <th>Category</th>
                <th>Keywords</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((t) => {
                const shares = activeShares(t.id);
                return (
                  <tr key={t.id} className={t.hidden ? "is-hidden" : undefined}>
                    <td className="actions-col">
                      <div className="row-actions">
                        <button
                          className="row-action"
                          title="Edit"
                          aria-label={`Edit ${t.label}`}
                          onClick={() => setDialog({ kind: "edit", topic: t })}
                        >
                          <Pencil size={15} aria-hidden />
                        </button>
                        <button
                          className="row-action"
                          title={t.hidden ? "Show on Pinboard" : "Hide from Pinboard"}
                          aria-label={`${t.hidden ? "Show" : "Hide"} ${t.label}`}
                          onClick={() =>
                            dispatch({ type: "updateTopic", adminId, topicId: t.id, hidden: !t.hidden, now: nowIso() })
                          }
                        >
                          {t.hidden ? <Eye size={15} aria-hidden /> : <EyeOff size={15} aria-hidden />}
                        </button>
                        <button
                          className="row-action"
                          title="Merge into another topic"
                          aria-label={`Merge ${t.label} into another topic`}
                          onClick={() => setDialog({ kind: "merge", topic: t })}
                        >
                          <GitMerge size={15} aria-hidden />
                        </button>
                      </div>
                    </td>
                    <td>
                      <div className="cell-title">
                        {t.label}
                        {t.hidden && <span className="badge-outline">Hidden</span>}
                      </div>
                      <div className="small">
                        {shares} active {shares === 1 ? "share" : "shares"}
                      </div>
                    </td>
                    <td>{t.category}</td>
                    <td>
                      {t.keywords.length ? (
                        <div className="kw-list">
                          {t.keywords.map((k) => (
                            <span key={k} className="kw">
                              {k}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="private">No keywords</span>
                      )}
                    </td>
                  </tr>
                );
              })}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={4} className="empty-cell">
                    No topics match “{query}”.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="panel-foot">
          Showing {rows.length} of {live.length} {live.length === 1 ? "topic" : "topics"}
        </div>
      </div>

      <div className="proto-box">
        <b>Try the suggestion</b>
        <p className="small">Type what a founder might write. These are the tags they&apos;d see pre-selected.</p>
        <textarea value={tryText} onChange={(e) => setTryText(e.target.value)} />
        <div className="tags">
          {suggested.length ? (
            suggested.map((t) => (
              <span key={t.id} className="pill">
                {t.label}
              </span>
            ))
          ) : (
            <span className="small">No match. The founder would pick a topic themselves.</span>
          )}
        </div>
      </div>

      {dialog?.kind === "add" && <TopicFormModal adminId={adminId} onClose={() => setDialog(null)} />}
      {dialog?.kind === "edit" && (
        <TopicFormModal adminId={adminId} topic={dialog.topic} onClose={() => setDialog(null)} />
      )}
      {dialog?.kind === "merge" && (
        <MergeTopicModal
          adminId={adminId}
          topic={dialog.topic}
          shares={activeShares(dialog.topic.id)}
          others={live.filter((o) => o.id !== dialog.topic.id && !o.hidden)}
          onClose={() => setDialog(null)}
        />
      )}
    </section>
  );
}

const parseKeywords = (s: string) =>
  s
    .split(",")
    .map((k) => k.trim().toLowerCase())
    .filter(Boolean);

/** Add a topic, or edit one when `topic` is given. */
function TopicFormModal({ adminId, topic, onClose }: { adminId: string; topic?: Topic; onClose: () => void }) {
  const { dispatch, pending } = usePinboard();
  const [label, setLabel] = useState(topic?.label ?? "");
  const [category, setCategory] = useState(topic?.category ?? "");
  const [keywords, setKeywords] = useState(topic?.keywords.join(", ") ?? "");
  const ready = label.trim() !== "" && category.trim() !== "";

  async function save(e: FormEvent) {
    e.preventDefault();
    if (!ready) return;
    const fields = { label: label.trim(), category: category.trim(), keywords: parseKeywords(keywords), now: nowIso() };
    const saved = await dispatch(
      topic ? { type: "updateTopic", adminId, topicId: topic.id, ...fields } : { type: "addTopic", adminId, ...fields },
    );
    if (saved) onClose();
  }

  return (
    <Modal title={topic ? "Edit topic" : "Add a topic"} onClose={onClose}>
      <form className="stack" onSubmit={save}>
        <div className="form-grid">
          <label>
            Label
            <input
              autoFocus
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="e.g. Raising a first round"
            />
          </label>
          <label>
            Category
            <input list="categories" value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Fundraising" />
          </label>
          <label className="wide">
            Keywords, comma-separated
            <input value={keywords} onChange={(e) => setKeywords(e.target.value)} placeholder="seed round, angel, term sheet" />
          </label>
        </div>
        <div className="row-btns modal-actions">
          <button type="button" className="btn ghost" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn" disabled={!ready || pending}>
            {pending ? "Saving…" : topic ? "Save changes" : "Add topic"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function MergeTopicModal({
  adminId,
  topic,
  shares,
  others,
  onClose,
}: {
  adminId: string;
  topic: Topic;
  shares: number;
  others: Topic[];
  onClose: () => void;
}) {
  const { dispatch, pending } = usePinboard();
  const [intoId, setIntoId] = useState("");

  async function merge() {
    if (await dispatch({ type: "mergeTopics", adminId, fromId: topic.id, intoId, now: nowIso() })) onClose();
  }

  return (
    <Modal title={`Merge “${topic.label}”`} onClose={onClose}>
      <p>
        Its {shares} active {shares === 1 ? "share moves" : "shares move"} to the topic you pick, and “{topic.label}”
        leaves this list. Founders who already share both keep one.
      </p>
      <label className="fld">
        Merge into
        <select value={intoId} onChange={(e) => setIntoId(e.target.value)} style={{ marginTop: 6 }}>
          <option value="">Choose a topic…</option>
          {others.map((o) => (
            <option key={o.id} value={o.id}>
              {o.label} ({o.category})
            </option>
          ))}
        </select>
      </label>
      <div className="row-btns modal-actions">
        <button className="btn ghost" onClick={onClose}>
          Cancel
        </button>
        <button className="btn" disabled={!intoId || pending} onClick={merge}>
          {pending ? "Merging…" : "Merge"}
        </button>
      </div>
    </Modal>
  );
}

/** Rooms for a Happier Hour (F7): group attendees by the category of their first shared "working" topic. */
function roomsFor(state: PinboardState, eventId: string, founderIds: string[]): Array<[string, Founder[]]> {
  const rooms = new Map<string, Founder[]>();
  for (const id of founderIds) {
    // The topic picked at sign-up wins; otherwise fall back to their first shared topic.
    const signup = state.rsvps.find((r) => r.founderId === id && r.eventId === eventId)?.signupTopic;
    const first = myShares(state, id, "working")[0];
    const room = signup || (first ? topicById(state, first).category : "Open room");
    rooms.set(room, [...(rooms.get(room) ?? []), founderById(state, id)]);
  }
  return [...rooms].sort(([a], [b]) => (a === "Open room" ? 1 : b === "Open room" ? -1 : a.localeCompare(b)));
}

const csvCell = (v: string) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);

/** F8 Volta side: everyone going to each event. Topics shown only where founders opted in (C9). */
export function AdminEventsView() {
  const { state } = usePinboard();
  const [openId, setOpenId] = useState<string | null>(null);
  const open = state.events.find((e) => e.id === openId);

  return (
    <section className="pane">
      <div>
        <h1>Events</h1>
        <p className="sub">
          Who&apos;s going to each event. You see everyone who RSVP&apos;d. Topics appear only for founders who shared
          them on the Pinboard.
        </p>
      </div>

      <div className="event-grid">
        {state.events.map((ev) => {
          const going = activeRsvps(state, ev.id);
          const listed = going.filter((r) => r.showOnList).length;
          return (
            <EventCard
              key={ev.id}
              event={ev}
              going={going.length}
              faces={going.map((r) => founderById(state, r.founderId))}
              badge={!ev.listByDefault ? <span className="badge-outline">Hidden by default</span> : undefined}
              note={going.length > 0 && `${listed} listed · ${going.length - listed} hidden from founders`}
              onOpen={() => setOpenId(ev.id)}
            />
          );
        })}
      </div>

      {open && (
        <Modal wide title={open.title} onClose={() => setOpenId(null)}>
          <AdminEventDetail event={open} />
        </Modal>
      )}
    </section>
  );
}

function AdminEventDetail({ event: ev }: { event: PinboardEvent }) {
  const { state } = usePinboard();
  const [copied, setCopied] = useState(false);
  const going = activeRsvps(state, ev.id);
  const listed = going.filter((r) => r.showOnList).length;
  const rooms = ev.kind === "happier_hour" ? roomsFor(state, ev.id, going.map((r) => r.founderId)) : null;
  const roomOf = new Map(rooms?.flatMap(([room, fs]) => fs.map((f) => [f.id, room] as const)));
  const csvRows = [
    ["Name", "Role", "Company", "Location", "On attendee list", ...(rooms ? ["Room"] : [])],
    ...going.map((r) => {
      const f = founderById(state, r.founderId);
      return [f.displayName, f.role, f.companyName, f.location, r.showOnList ? "yes" : "no", ...(rooms ? [roomOf.get(f.id) ?? ""] : [])];
    }),
  ];

  async function copyCsv() {
    const csv = csvRows.map((r) => r.map(csvCell).join(",")).join("\n");
    try {
      await navigator.clipboard.writeText(csv);
      setCopied(true);
    } catch {
      setCopied(false);
      window.prompt("Copy the attendee list:", csv);
    }
  }

  return (
    <>
      <div className="event-detail-head">
        <div>
          <div>{fmtEventTime(ev.startsAt)}</div>
          <div className="small">{ev.location}</div>
        </div>
        <div className="event-stats">
          <span>
            <b>{going.length}</b> going
          </span>
          <span className="small">
            {listed} listed · {going.length - listed} hidden from founders
          </span>
        </div>
      </div>

      {going.length === 0 ? (
        <p className="small">Nobody has RSVP&apos;d yet.</p>
      ) : (
        <>
          <div className="event-detail-body table-scroll">
            <table className="table attendee-table">
              <thead>
                <tr>
                  <th>Founder</th>
                  <th>Shared topics</th>
                  <th>Attendee list</th>
                  {rooms && <th>Room</th>}
                </tr>
              </thead>
              <tbody>
                {going.map((r) => {
                  const f = founderById(state, r.founderId);
                  return (
                    <tr key={r.id}>
                      <td>
                        <b>{f.displayName}</b>
                        <div className="small">{founderLine(f)}</div>
                      </td>
                      <td>
                        <TopicPills founderId={f.id} />
                      </td>
                      <td>{r.showOnList ? "Listed" : <span className="small">Hidden</span>}</td>
                      {rooms && <td>{roomOf.get(f.id)}</td>}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {rooms && (
            <div className="rooms">
              {rooms.map(([room, fs]) => (
                <div key={room} className="room">
                  <b>{room}</b>
                  <span className="small">{fs.map((f) => f.displayName).join(", ")}</span>
                </div>
              ))}
            </div>
          )}

          <div className="row-btns">
            <button className="btn ghost" onClick={copyCsv}>
              Copy list as CSV
            </button>
            {copied && <span className="small">Copied.</span>}
          </div>
        </>
      )}
    </>
  );
}

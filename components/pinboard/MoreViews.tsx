"use client";

import { useState, type ReactNode } from "react";
import { ChevronRight } from "lucide-react";
import { activeRsvps, founderById, founderLine, myShares, topicById } from "@/lib/pinboard/state";
import type { Founder, PinboardEvent } from "@/lib/pinboard/types";
import { nowIso, usePinboard } from "./store";
import { EmailCard, Modal, initials } from "./ui";

/** Every email the app would have sent. EMAIL_MODE=log: nothing leaves the browser. */
export function EmailLogView() {
  const { state } = usePinboard();
  const emails = [...state.emails].reverse();
  return (
    <section className="pane">
      <div>
        <h1>Email log</h1>
        <p className="sub">
          Prototype only. Email runs in log mode, so these were never sent. They show what each person would receive.
        </p>
      </div>
      {emails.length === 0 && (
        <p className="small">Nothing yet. Join a conversation or ask someone about their experience on the Pinboard.</p>
      )}
      {emails.map((e) => (
        <EmailCard key={e.id} email={e} />
      ))}
    </section>
  );
}

export const fmtEventTime = (iso: string) =>
  new Date(iso).toLocaleString("en-CA", {
    weekday: "long",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "America/Halifax",
  });

/** Opted-in Pinboard topics for one founder, as pills. Nothing private. */
export function TopicPills({ founderId }: { founderId: string }) {
  const { state } = usePinboard();
  const working = myShares(state, founderId, "working").map((t) => topicById(state, t).label);
  const lived = myShares(state, founderId, "lived").map((t) => topicById(state, t).label);
  if (!working.length && !lived.length) return <span className="private">Hasn&apos;t shared topics</span>;
  return (
    <div>
      {working.map((l) => (
        <span key={`w-${l}`} className="pill">
          {l}
        </span>
      ))}
      {lived.map((l) => (
        <span key={`l-${l}`} className="pill l">
          Been through it: {l}
        </span>
      ))}
    </div>
  );
}

/** F8 founder side: RSVP, with "show me on the attendee list" as its own opt-in. */
/** Month and day for the date tile, in Halifax time. */
function dateParts(iso: string) {
  const d = new Date(iso);
  const opt = { timeZone: "America/Halifax" } as const;
  return {
    month: d.toLocaleDateString("en-CA", { ...opt, month: "short" }).replace(".", ""),
    day: d.toLocaleDateString("en-CA", { ...opt, day: "numeric" }),
  };
}

/** Summary card for one event; clicking it opens the details. */
export function EventCard({
  event,
  going,
  faces,
  badge,
  note,
  onOpen,
}: {
  event: PinboardEvent;
  going: number;
  faces: Founder[];
  badge?: ReactNode;
  note?: ReactNode;
  onOpen: () => void;
}) {
  const { month, day } = dateParts(event.startsAt);
  const shown = faces.slice(0, 5);
  return (
    <button type="button" className="event-card" onClick={onOpen} aria-label={`${event.title}: view details`}>
      <span className="event-card-top">
        <span className="date-tile" aria-hidden>
          <span>{month}</span>
          <b>{day}</b>
        </span>
        {badge}
      </span>
      <span className="event-card-title">{event.title}</span>
      <span className="small">{fmtEventTime(event.startsAt)}</span>
      <span className="small">{event.location}</span>
      <span className="event-card-foot">
        <span className="faces" aria-hidden>
          {shown.map((f) => (
            <span key={f.id} className="avatar" title={f.displayName}>
              {initials(f.displayName)}
            </span>
          ))}
          {faces.length > shown.length && <span className="avatar more">+{faces.length - shown.length}</span>}
        </span>
        <span>
          <b>{going}</b> going
        </span>
      </span>
      {note && <span className="small">{note}</span>}
      <span className="event-card-more">
        View details <ChevronRight size={14} aria-hidden />
      </span>
    </button>
  );
}

export function EventsView({ founderId }: { founderId: string }) {
  const { state } = usePinboard();
  const [openId, setOpenId] = useState<string | null>(null);
  const open = state.events.find((e) => e.id === openId);

  return (
    <section className="pane">
      <div>
        <h1>Events</h1>
        <p className="sub">See who&apos;s coming and what they&apos;re working on, so the first conversation starts at the real issue.</p>
      </div>
      <div className="event-grid">
        {state.events.map((ev) => {
          const going = activeRsvps(state, ev.id);
          const listed = going.filter((r) => r.showOnList);
          const mine = going.some((r) => r.founderId === founderId);
          return (
            <EventCard
              key={ev.id}
              event={ev}
              going={going.length}
              faces={listed.map((r) => founderById(state, r.founderId))}
              badge={mine ? <span className="badge-going">You&apos;re going</span> : undefined}
              onOpen={() => setOpenId(ev.id)}
            />
          );
        })}
      </div>
      {open && (
        <Modal wide title={open.title} onClose={() => setOpenId(null)}>
          <FounderEventDetail event={open} founderId={founderId} />
        </Modal>
      )}
    </section>
  );
}

function FounderEventDetail({ event: ev, founderId }: { event: PinboardEvent; founderId: string }) {
  const { state, dispatch, pending } = usePinboard();
  const going = activeRsvps(state, ev.id);
  const mine = going.find((r) => r.founderId === founderId);
  const listed = going.filter((r) => r.showOnList);
  const unlisted = going.length - listed.length;
  const showMe = mine?.showOnList ?? ev.listByDefault;
  const rsvp = (isGoing: boolean, showOnList: boolean) =>
    dispatch({ type: "rsvp", founderId, eventId: ev.id, going: isGoing, showOnList, now: nowIso() });

  return (
    <>
      <div className="event-detail-head">
        <div>
          <div>{fmtEventTime(ev.startsAt)}</div>
          <div className="small">
            {ev.location} · {going.length} going
          </div>
        </div>
        <div className="rsvp-box">
          <button
            className={mine ? "btn" : "btn ghost"}
            aria-pressed={!!mine}
            disabled={pending}
            onClick={() => rsvp(!mine, showMe)}
          >
            {mine ? "Going ✓" : "I'm going"}
          </button>
          {mine && (
            <label className="small check">
              <input type="checkbox" checked={mine.showOnList} disabled={pending} onChange={(e) => rsvp(true, e.target.checked)} />
              Show me on the attendee list
            </label>
          )}
        </div>
      </div>
      <div className="event-detail-body">
        <ul className="attendees">
          {listed.map((r) => (
            <li key={r.id}>
              <div>
                <b className={r.founderId === founderId ? "you" : undefined}>
                  {r.founderId === founderId
                    ? `You (${founderById(state, r.founderId).displayName})`
                    : founderById(state, r.founderId).displayName}
                </b>
                <div className="small">{founderLine(founderById(state, r.founderId))}</div>
              </div>
              <TopicPills founderId={r.founderId} />
            </li>
          ))}
          {listed.length === 0 && (
            <li>
              <span className="private">{going.length ? "Attendees haven't chosen to be listed" : "Nobody yet"}</span>
            </li>
          )}
        </ul>
        {unlisted > 0 && (
          <p className="small" style={{ padding: "10px 16px" }}>
            +{unlisted} more going who chose not to be listed{!ev.listByDefault && " (hidden by default for this event)"}.
          </p>
        )}
      </div>
    </>
  );
}

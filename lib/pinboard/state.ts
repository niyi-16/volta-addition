// In-memory Pinboard store for the Phase 1 prototype. The reducer enforces the
// consent invariants (plan §2) so the clickable flows behave like the real build.
import {
  askIntroEmail,
  askRequestEmail,
  groupIntroEmail,
  groupJoinedEmail,
  nudgeEmail,
} from "./emails";
import { eventsSeed, foundersSeed, groupsSeed, membersSeed, rsvpsSeed, sharesSeed, topicsSeed, updatesSeed } from "./seed";
import type {
  Ask,
  AuditEntry,
  Connection,
  EmailLogEntry,
  EmailTemplate,
  Founder,
  Group,
  GroupMember,
  Notice,
  Nudge,
  PinboardEvent,
  Rsvp,
  Share,
  ShareKind,
  Topic,
  Update,
} from "./types";

export const NOTE_MAX = 500;
export const MAX_OPEN_ASKS = 3;
export const NOT_RIGHT_NOW = "not right now";

export interface PinboardState {
  founders: Founder[];
  topics: Topic[];
  updates: Update[];
  shares: Share[];
  groups: Group[];
  members: GroupMember[];
  asks: Ask[];
  connections: Connection[];
  emails: EmailLogEntry[];
  audit: AuditEntry[];
  notices: Notice[];
  nudges: Nudge[]; // one per founder per topic
  events: PinboardEvent[];
  rsvps: Rsvp[];
}

export type Action =
  // Carries only chosen topic ids: free text never reaches the store (C1).
  | { type: "submitOptIns"; founderId: string; working: string[]; lived: string[]; now: string }
  | { type: "withdrawShare"; founderId: string; shareId: string; now: string }
  | { type: "withdrawUpdate"; founderId: string; updateId: string; now: string }
  // Dispatch only after the founder confirms the consent dialog (C4).
  | { type: "joinGroup"; founderId: string; topicId: string; now: string }
  | { type: "leaveGroup"; founderId: string; topicId: string; now: string }
  | { type: "sendAsk"; askerId: string; recipientId: string; topicId: string; note: string; now: string }
  | { type: "respondAsk"; askId: string; founderId: string; accept: boolean; now: string }
  | { type: "expireAsk"; askId: string; now: string }
  | { type: "runNudges"; now: string }
  | { type: "rsvp"; founderId: string; eventId: string; going: boolean; showOnList: boolean; now: string }
  | { type: "addTopic"; adminId: string; label: string; category: string; keywords: string[]; now: string }
  | { type: "updateTopic"; adminId: string; topicId: string; label?: string; category?: string; keywords?: string[]; hidden?: boolean; now: string }
  | { type: "mergeTopics"; adminId: string; fromId: string; intoId: string; now: string }
  | { type: "reset" };

export function initialState(): PinboardState {
  return {
    founders: foundersSeed,
    topics: topicsSeed,
    updates: updatesSeed,
    shares: sharesSeed,
    groups: groupsSeed,
    members: membersSeed,
    asks: [],
    connections: [],
    emails: [],
    audit: [],
    notices: [],
    nudges: [],
    events: eventsSeed,
    rsvps: rsvpsSeed,
  };
}

// ---------- selectors ----------

export const isVisibleShare = (s: Share) => s.consentedAt !== null && s.withdrawnAt === null;

export function founderById(state: PinboardState, id: string): Founder {
  const f = state.founders.find((x) => x.id === id);
  if (!f) throw new Error(`Unknown founder ${id}`);
  return f;
}

export function topicById(state: PinboardState, id: string): Topic {
  const t = state.topics.find((x) => x.id === id);
  if (!t) throw new Error(`Unknown topic ${id}`);
  return t;
}

export const activeTopics = (state: PinboardState) =>
  state.topics.filter((t) => !t.hidden && !t.mergedInto);

export function sharesFor(state: PinboardState, topicId: string, kind: ShareKind): Share[] {
  return state.shares.filter((s) => s.topicId === topicId && s.kind === kind && isVisibleShare(s));
}

export function myShares(state: PinboardState, founderId: string, kind: ShareKind): string[] {
  return state.shares
    .filter((s) => s.founderId === founderId && s.kind === kind && isVisibleShare(s))
    .map((s) => s.topicId);
}

export const HOME_BASE = "Halifax";

/** "Jordan Gallant (Charlottetown)" for founders outside Halifax, so remote founders stand out. */
export const nameWithPlace = (f: Founder) =>
  f.location && f.location !== HOME_BASE ? `${f.displayName} (${f.location})` : f.displayName;

/** "CEO, Crewlight · Halifax" */
export const founderLine = (f: Founder) =>
  [[f.role, f.companyName].filter(Boolean).join(", "), f.location].filter(Boolean).join(" · ");

export const groupForTopic = (state: PinboardState, topicId: string) =>
  state.groups.find((g) => g.topicId === topicId);

export function confirmedMembers(state: PinboardState, groupId: string): GroupMember[] {
  return state.members.filter((m) => m.groupId === groupId && m.leftAt === null);
}

export function isMember(state: PinboardState, founderId: string, topicId: string): boolean {
  const g = groupForTopic(state, topicId);
  return !!g && confirmedMembers(state, g.id).some((m) => m.founderId === founderId);
}

export const openAsksBy = (state: PinboardState, askerId: string) =>
  state.asks.filter((a) => a.askerId === askerId && a.status === "pending");

/** Why this ask can't be sent, or null if it can. */
export function askBlocker(state: PinboardState, askerId: string, recipientId: string, topicId: string): string | null {
  if (askerId === recipientId) return "You can't ask yourself.";
  if (!sharesFor(state, topicId, "lived").some((s) => s.founderId === recipientId))
    return "They no longer share this experience.";
  if (openAsksBy(state, askerId).some((a) => a.recipientId === recipientId))
    return "You already have a request waiting with them.";
  if (openAsksBy(state, askerId).length >= MAX_OPEN_ASKS)
    return `You can have ${MAX_OPEN_ASKS} open requests at a time.`;
  return null;
}

/** Ids of emails in `next` that weren't in `prev`, e.g. what an action just sent. */
export function newEmailIds(prev: PinboardState, next: PinboardState | null): string[] {
  if (!next) return [];
  const seen = new Set(prev.emails.map((e) => e.id));
  return next.emails.filter((e) => !seen.has(e.id)).map((e) => e.id);
}

export const activeRsvps = (state: PinboardState, eventId: string) =>
  state.rsvps.filter((r) => r.eventId === eventId && r.cancelledAt === null);

export const optedInFounderIds = (state: PinboardState) =>
  new Set(state.shares.filter(isVisibleShare).map((s) => s.founderId));

// ---------- reducer ----------

type Draft = PinboardState;

// Random ids so rows created here never collide with rows added by hand in the database.
function nextId(_d: Draft, prefix: string): string {
  return `${prefix}-${crypto.randomUUID().slice(0, 13)}`;
}

function audit(d: Draft, founderId: string | null, action: string, entity: string, entityId: string, at: string) {
  d.audit = [...d.audit, { id: nextId(d, "a"), founderId, action, entity, entityId, at }];
}

function logEmail(d: Draft, template: EmailTemplate, to: string[], email: { subject: string; body: string }, at: string): string {
  const id = nextId(d, "e");
  d.emails = [...d.emails, { id, template, toFounderIds: to, ...email, mode: "log", sentAt: at }];
  return id;
}

function connect(d: Draft, source: Connection["source"], sourceId: string, founderIds: string[], at: string) {
  d.connections = [...d.connections, { id: nextId(d, "c"), source, sourceId, founderIds, createdAt: at }];
}

function notify(d: Draft, founderId: string, text: string, at: string) {
  d.notices = [...d.notices, { id: nextId(d, "n"), founderId, text, at }];
}

function endShare(d: Draft, founderId: string, shareId: string, reason: "withdrawn" | "replaced", now: string) {
  d.shares = d.shares.map((s) => {
    if (s.id !== shareId || s.founderId !== founderId || !isVisibleShare(s)) return s;
    audit(d, founderId, reason === "withdrawn" ? "withdraw" : "replace", "share", s.id, now);
    return { ...s, withdrawnAt: now, endedReason: reason };
  });
}

export function reducer(state: PinboardState, action: Action): PinboardState {
  if (action.type === "reset") return initialState();
  const d: Draft = { ...state };

  switch (action.type) {
    case "submitOptIns": {
      // Each update is a fresh consent: it replaces whatever the founder shared before.
      const { founderId, now } = action;
      const update: Update = { id: nextId(d, "u"), founderId, submittedAt: now };
      d.updates = [...d.updates, update];
      audit(d, founderId, "update_submit", "update", update.id, now);
      for (const s of d.shares.filter((x) => x.founderId === founderId && isVisibleShare(x))) {
        endShare(d, founderId, s.id, "replaced", now);
      }
      const wanted: Array<[ShareKind, string[]]> = [["working", action.working], ["lived", action.lived]];
      for (const [kind, topicIds] of wanted) {
        for (const topicId of new Set(topicIds)) {
          const id = nextId(d, "s");
          d.shares = [...d.shares, { id, founderId, topicId, updateId: update.id, kind, consentedAt: now, withdrawnAt: null, endedReason: null }];
          audit(d, founderId, "share", "share", id, now);
        }
      }
      return d;
    }

    case "withdrawShare": {
      endShare(d, action.founderId, action.shareId, "withdrawn", action.now);
      return d;
    }

    case "withdrawUpdate": {
      for (const s of d.shares.filter((x) => x.updateId === action.updateId && isVisibleShare(x))) {
        endShare(d, action.founderId, s.id, "withdrawn", action.now);
      }
      return d;
    }

    case "joinGroup": {
      const { founderId, topicId, now } = action;
      if (isMember(d, founderId, topicId)) return state;
      let group = groupForTopic(d, topicId);
      if (!group) {
        group = { id: nextId(d, "g"), topicId, status: "open", introducedAt: null };
        d.groups = [...d.groups, group];
      }
      const memberId = nextId(d, "m");
      d.members = [...d.members, { id: memberId, groupId: group.id, founderId, confirmedAt: now, leftAt: null }];
      audit(d, founderId, "join_confirm", "group_member", memberId, now);

      const topic = topicById(d, topicId);
      const members = confirmedMembers(d, group.id).map((m) => founderById(d, m.founderId));
      const memberIds = members.map((m) => m.id);

      if (group.status === "open" && members.length >= 2) {
        logEmail(d, "group_intro", memberIds, groupIntroEmail(topic, members), now);
        const introduced: Group = { ...group, status: "introduced", introducedAt: now };
        d.groups = d.groups.map((g) => (g.id === group.id ? introduced : g));
        connect(d, "group", group.id, memberIds, now);
      } else if (group.status === "introduced") {
        logEmail(d, "group_joined", memberIds, groupJoinedEmail(topic, founderById(d, founderId), members), now);
        connect(d, "group", group.id, memberIds, now);
      }
      return d;
    }

    case "leaveGroup": {
      const group = groupForTopic(d, action.topicId);
      if (!group) return state;
      d.members = d.members.map((m) => {
        if (m.groupId === group.id && m.founderId === action.founderId && m.leftAt === null) {
          audit(d, action.founderId, "leave", "group_member", m.id, action.now);
          return { ...m, leftAt: action.now };
        }
        return m;
      });
      return d;
    }

    case "sendAsk": {
      const { askerId, recipientId, topicId, now } = action;
      if (askBlocker(d, askerId, recipientId, topicId)) return state;
      const note = action.note.trim().slice(0, NOTE_MAX);
      const ask: Ask = { id: nextId(d, "k"), askerId, recipientId, topicId, note, status: "pending", createdAt: now, respondedAt: null };
      d.asks = [...d.asks, ask];
      audit(d, askerId, "ask", "ask", ask.id, now);
      const asker = founderById(d, askerId);
      const recipient = founderById(d, recipientId);
      logEmail(d, "ask_request", [recipientId], askRequestEmail(ask, asker, recipient, topicById(d, topicId)), now);
      return d;
    }

    case "respondAsk": {
      const ask = d.asks.find((a) => a.id === action.askId);
      if (!ask || ask.status !== "pending" || ask.recipientId !== action.founderId) return state;
      const updated: Ask = { ...ask, status: action.accept ? "accepted" : "declined", respondedAt: action.now };
      d.asks = d.asks.map((a) => (a.id === ask.id ? updated : a));
      audit(d, action.founderId, action.accept ? "accept" : "decline", "ask", ask.id, action.now);
      if (action.accept) {
        const asker = founderById(d, ask.askerId);
        const recipient = founderById(d, ask.recipientId);
        logEmail(d, "ask_intro", [asker.id, recipient.id], askIntroEmail(updated, asker, recipient, topicById(d, ask.topicId)), action.now);
        connect(d, "ask", ask.id, [asker.id, recipient.id], action.now);
      } else {
        notify(d, ask.askerId, NOT_RIGHT_NOW, action.now);
      }
      return d;
    }

    case "expireAsk": {
      const ask = d.asks.find((a) => a.id === action.askId);
      if (!ask || ask.status !== "pending") return state;
      d.asks = d.asks.map((a) => (a.id === ask.id ? { ...a, status: "expired", respondedAt: action.now } : a));
      audit(d, null, "expire", "ask", ask.id, action.now);
      notify(d, ask.askerId, NOT_RIGHT_NOW, action.now);
      return d;
    }

    case "runNudges": {
      for (const group of d.groups) {
        if (group.status !== "open") continue;
        const members = confirmedMembers(d, group.id);
        if (members.length !== 1) continue;
        const memberIds = new Set(members.map((m) => m.founderId));
        const sharers = new Set(
          d.shares
            .filter((s) => s.topicId === group.topicId && isVisibleShare(s) && !memberIds.has(s.founderId))
            .map((s) => s.founderId),
        );
        const topic = topicById(d, group.topicId);
        for (const founderId of sharers) {
          if (d.nudges.some((n) => n.founderId === founderId && n.topicId === group.topicId)) continue;
          d.nudges = [...d.nudges, { id: nextId(d, "nu"), founderId, topicId: group.topicId, sentAt: action.now }];
          logEmail(d, "nudge", [founderId], nudgeEmail(topic), action.now);
        }
      }
      return d;
    }

    case "rsvp": {
      const { founderId, eventId, going, showOnList, now } = action;
      if (!d.events.some((e) => e.id === eventId)) return state;
      const existing = d.rsvps.find((r) => r.eventId === eventId && r.founderId === founderId);
      const next: Rsvp = existing
        ? { ...existing, showOnList, cancelledAt: going ? null : (existing.cancelledAt ?? now) }
        : { id: nextId(d, "r"), eventId, founderId, showOnList, signupTopic: null, createdAt: now, cancelledAt: going ? null : now };
      d.rsvps = existing ? d.rsvps.map((r) => (r.id === existing.id ? next : r)) : [...d.rsvps, next];
      audit(d, founderId, going ? "rsvp" : "rsvp_cancel", "rsvp", next.id, now);
      return d;
    }

    case "addTopic": {
      const label = action.label.trim();
      if (!label) return state;
      const id = nextId(d, "t");
      d.topics = [...d.topics, { id, label, category: action.category.trim() || "Other", keywords: action.keywords, hidden: false, mergedInto: null }];
      audit(d, action.adminId, "topic_add", "topic", id, action.now);
      return d;
    }

    case "updateTopic": {
      const { topicId, adminId, now, type: _type, ...patch } = action;
      void _type;
      const clean = Object.fromEntries(Object.entries(patch).filter(([, v]) => v !== undefined));
      d.topics = d.topics.map((t) => (t.id === topicId ? { ...t, ...clean } : t));
      audit(d, adminId, "topic_update", "topic", topicId, now);
      return d;
    }

    case "mergeTopics": {
      const { fromId, intoId, adminId, now } = action;
      if (fromId === intoId) return state;
      // Repoint shares; if the founder already shares the target, drop the duplicate.
      d.shares = d.shares.map((s) => {
        if (s.topicId !== fromId) return s;
        const dup = d.shares.some((o) => o.topicId === intoId && o.founderId === s.founderId && o.kind === s.kind && isVisibleShare(o));
        return dup ? { ...s, withdrawnAt: s.withdrawnAt ?? now, endedReason: s.endedReason ?? "replaced" } : { ...s, topicId: intoId };
      });
      d.asks = d.asks.map((a) => (a.topicId === fromId ? { ...a, topicId: intoId } : a));
      const fromGroup = groupForTopic(d, fromId);
      const intoGroup = groupForTopic(d, intoId);
      if (fromGroup && !intoGroup) {
        d.groups = d.groups.map((g) => (g.id === fromGroup.id ? { ...g, topicId: intoId } : g));
      } else if (fromGroup && intoGroup) {
        // Members consented to a conversation on the old topic; move them across without re-introducing.
        const already = new Set(confirmedMembers(d, intoGroup.id).map((m) => m.founderId));
        d.members = d.members.map((m) =>
          m.groupId !== fromGroup.id ? m : already.has(m.founderId) ? { ...m, leftAt: m.leftAt ?? now } : { ...m, groupId: intoGroup.id },
        );
        d.groups = d.groups.filter((g) => g.id !== fromGroup.id);
      }
      d.topics = d.topics.map((t) => (t.id === fromId ? { ...t, mergedInto: intoId, hidden: true } : t));
      audit(d, adminId, "topic_merge", "topic", fromId, now);
      return d;
    }
  }
}

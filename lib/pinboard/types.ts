// Mirrors the data model in the implementation plan (§4) so Phase 2 can swap
// the in-memory store for Postgres without reshaping the UI.

export interface Founder {
  id: string;
  email: string;
  displayName: string;
  companyName: string;
  isAdmin: boolean;
  role: string;
  companyDescription: string;
  stage: string;
  teamSize: number | null;
  location: string;
  visitsVolta: string; // how often they come into Volta: Daily, Weekly, Rarely, Never
}

export interface Topic {
  id: string;
  label: string;
  category: string;
  keywords: string[];
  hidden: boolean;
  mergedInto: string | null;
}

export type ShareKind = "working" | "lived";

/** A submitted monthly update. Metadata only: the written answers are never stored (C1). */
export interface Update {
  id: string;
  founderId: string;
  submittedAt: string;
}

export interface Share {
  id: string;
  founderId: string;
  topicId: string;
  updateId: string | null;
  kind: ShareKind;
  consentedAt: string | null;
  withdrawnAt: string | null;
  // "withdrawn": the founder took it back. "replaced": a later update superseded it.
  endedReason: "withdrawn" | "replaced" | null;
}

export interface Group {
  id: string;
  topicId: string;
  status: "open" | "introduced";
  introducedAt: string | null;
}

export interface GroupMember {
  id: string;
  groupId: string;
  founderId: string;
  confirmedAt: string;
  leftAt: string | null;
}

export type AskStatus = "pending" | "accepted" | "declined" | "expired";

export interface Ask {
  id: string;
  askerId: string;
  recipientId: string;
  topicId: string;
  note: string;
  status: AskStatus;
  createdAt: string;
  respondedAt: string | null;
}

export interface Connection {
  id: string;
  source: "group" | "ask";
  sourceId: string;
  founderIds: string[];
  createdAt: string;
}

export type EmailTemplate =
  | "nudge"
  | "group_intro"
  | "group_joined"
  | "ask_request"
  | "ask_intro";

export interface EmailLogEntry {
  id: string;
  template: EmailTemplate;
  toFounderIds: string[];
  subject: string;
  body: string;
  mode: "log";
  sentAt: string;
}

export interface AuditEntry {
  id: string;
  founderId: string | null;
  action: string;
  entity: string;
  entityId: string;
  at: string;
}

export interface PinboardEvent {
  id: string;
  title: string;
  startsAt: string;
  location: string;
  kind: "lunch" | "happier_hour" | "breakfast" | "other";
  // Default for each RSVP's "show me on the attendee list" (the CEO Breakfast defaults to off).
  listByDefault: boolean;
}

export interface Rsvp {
  id: string;
  eventId: string;
  founderId: string;
  // Separate opt-in: other founders see this RSVP only when true. Laura always sees it.
  showOnList: boolean;
  // Topic picked when signing up (Happier Hour), used to place them in a room.
  signupTopic: string | null;
  createdAt: string;
  cancelledAt: string | null;
}

export interface Nudge {
  id: string;
  founderId: string;
  topicId: string;
  sentAt: string;
}

// In-app notice, e.g. the "not right now" message for a declined ask (C8).
export interface Notice {
  id: string;
  founderId: string;
  text: string;
  at: string;
}

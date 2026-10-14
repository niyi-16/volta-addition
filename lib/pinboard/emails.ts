// Email templates (plan §6). Every template lists what it must never contain;
// keep that in mind when editing copy.
import type { Ask, Founder, Topic } from "./types";

export const EMAIL_FROM = "pinboard@volta.example"; // (to confirm) real Volta sender
export const APP_URL = "https://pinboard.volta.example"; // (to confirm) hosting

const SIGNOFF = "\n\nVolta Pinboard\nYou're getting this because of something you chose on the Pinboard.";

function memberLine(f: Founder): string {
  return `• ${f.displayName}, ${f.companyName} · ${f.email}`;
}

/** Never contains names (C6). */
export function nudgeEmail(topic: Topic) {
  return {
    subject: `A founder wants to talk about ${topic.label}`,
    body:
      `A founder wants to talk about ${topic.label}, a topic you shared on the Pinboard.\n\n` +
      `If you'd like to compare notes, join the conversation: ${APP_URL}/pinboard\n\n` +
      `Joining is optional. Your name is shared only with others who join.` +
      SIGNOFF,
  };
}

/** To confirmed members only (C5). */
export function groupIntroEmail(topic: Topic, members: Founder[]) {
  return {
    subject: `Intro: founders talking about ${topic.label}`,
    body:
      `Hi ${members.map((m) => m.displayName).join(", ")},\n\n` +
      `You each joined the Pinboard conversation on ${topic.label} and agreed to share your name and email with each other:\n\n` +
      members.map(memberLine).join("\n") +
      `\n\nReply all to find a time for a chat or call. Nobody else is copied.` +
      SIGNOFF,
  };
}

/** New joiner + existing (already-consented) members. */
export function groupJoinedEmail(topic: Topic, joiner: Founder, members: Founder[]) {
  return {
    subject: `${joiner.displayName} joined the ${topic.label} conversation`,
    body:
      `${joiner.displayName} (${joiner.companyName}) just joined the Pinboard conversation on ${topic.label}.\n\n` +
      `Everyone in the conversation:\n\n` +
      members.map(memberLine).join("\n") +
      `\n\nReply all to say hello.` +
      SIGNOFF,
  };
}

/** Asker name, topic and note, plus accept/decline links. No emails for either side (C7). */
export function askRequestEmail(ask: Ask, asker: Founder, recipient: Founder, topic: Topic) {
  return {
    subject: `${asker.displayName} would like to hear about your experience with ${topic.label}`,
    body:
      `Hi ${recipient.displayName},\n\n` +
      `${asker.displayName} (${asker.companyName}) saw that you've been through ${topic.label} and would like to hear what it was like.\n\n` +
      `Their note:\n"${ask.note}"\n\n` +
      `Happy to chat:   ${APP_URL}/asks/${ask.id}/accept\n` +
      `Not right now:   ${APP_URL}/asks/${ask.id}/decline\n\n` +
      `Neither of your email addresses is shared unless you accept. If you choose "not right now", ` +
      `${asker.displayName} sees only that, with no reason given. The request expires in 14 days.` +
      SIGNOFF,
  };
}

/** Sent to both once the recipient accepts. */
export function askIntroEmail(ask: Ask, asker: Founder, recipient: Founder, topic: Topic) {
  return {
    subject: `Intro: ${asker.displayName} and ${recipient.displayName} on ${topic.label}`,
    body:
      `Hi ${asker.displayName} and ${recipient.displayName},\n\n` +
      `${recipient.displayName} is happy to share what ${topic.label} was like. ` +
      `This is about experience, not advice.\n\n` +
      `${asker.displayName}'s note:\n"${ask.note}"\n\n` +
      [asker, recipient].map(memberLine).join("\n") +
      `\n\nReply all to find a time.` +
      SIGNOFF,
  };
}

"use client";

import { useEffect, useRef, type ReactNode } from "react";
import type { EmailLogEntry } from "@/lib/pinboard/types";
import { EMAIL_FROM } from "@/lib/pinboard/emails";
import { founderById } from "@/lib/pinboard/state";
import { usePinboard } from "./store";

export const initials = (name: string) =>
  name
    .split(/\s+/)
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

export function Modal({
  title,
  onClose,
  wide = false,
  children,
}: {
  title: string;
  onClose: () => void;
  wide?: boolean;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    if (dialog && !dialog.open) dialog.showModal();
  }, []);
  return (
    <dialog ref={ref} className={wide ? "modal wide" : "modal"} aria-label={title} onClose={onClose} onCancel={onClose}>
      <div className="modal-head">
        <h2>{title}</h2>
        <button className="icon-btn" aria-label="Close" onClick={onClose}>
          ×
        </button>
      </div>
      {children}
    </dialog>
  );
}

const TEMPLATE_LABEL: Record<EmailLogEntry["template"], string> = {
  nudge: "Nudge",
  group_intro: "Group intro",
  group_joined: "Joined",
  ask_request: "Ask request",
  ask_intro: "Ask intro",
};

export function EmailCard({ email }: { email: EmailLogEntry }) {
  const { state } = usePinboard();
  const to = email.toFounderIds.map((id) => founderById(state, id));
  return (
    <article className="email">
      <header>
        <span className="pill">{TEMPLATE_LABEL[email.template]}</span>
        <dl>
          <dt>From</dt>
          <dd>{EMAIL_FROM}</dd>
          <dt>To</dt>
          <dd>{to.map((f) => `${f.displayName} <${f.email}>`).join(", ")}</dd>
          <dt>Subject</dt>
          <dd>
            <b>{email.subject}</b>
          </dd>
        </dl>
      </header>
      <pre>{email.body}</pre>
    </article>
  );
}

export function Toast({ children, onDismiss }: { children: ReactNode; onDismiss?: () => void }) {
  return (
    <div className="toast" role="status">
      <div>{children}</div>
      {onDismiss && (
        <button className="icon-btn" aria-label="Dismiss" onClick={onDismiss}>
          ×
        </button>
      )}
    </div>
  );
}

export function TagButton({
  pressed,
  onClick,
  children,
}: {
  pressed: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button type="button" className="tag" aria-pressed={pressed} onClick={onClick}>
      {children}
    </button>
  );
}

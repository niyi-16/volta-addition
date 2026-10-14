"use client";

import {
  Building2,
  CalendarDays,
  ChevronsUpDown,
  FileEdit,
  Home,
  LayoutGrid,
  Mail,
  MessageSquare,
  PanelLeft,
  RefreshCw,
  RotateCcw,
  Tags,
  type LucideIcon,
} from "lucide-react";
import { useState } from "react";
import type { PinboardState } from "@/lib/pinboard/state";
import { AdminEventsView, OverviewView, TopicEditorView } from "./AdminViews";
import { BoardView } from "./BoardView";
import { HistoryView } from "./HistoryView";
import { EmailLogView, EventsView } from "./MoreViews";
import { RequestsView } from "./RequestsView";
import { PinboardProvider, usePinboard } from "./store";
import { UpdateView } from "./UpdateView";
import { initials } from "./ui";

type View = "update" | "board" | "requests" | "events" | "overview" | "topics" | "emails";
type NavItem = [View, string, LucideIcon];

const FOUNDER_NAV: NavItem[] = [
  ["board", "Pinboard", LayoutGrid],
  ["update", "Monthly update", FileEdit],
  ["requests", "Requests", MessageSquare],
  ["events", "Events", CalendarDays],
];
const ADMIN_NAV: NavItem[] = [
  ["overview", "Overview", Home],
  ["topics", "Topics", Tags],
  ["events", "Events", CalendarDays],
  ["board", "Pinboard", LayoutGrid],
];


export function PinboardApp({ initialState }: { initialState: PinboardState }) {
  return (
    <PinboardProvider initialState={initialState}>
      <Shell />
    </PinboardProvider>
  );
}

function Shell() {
  const { state, dispatch, reload, pending, error, clearError } = usePinboard();
  const [personaId, setPersonaId] = useState("f-tomasz");
  const [view, setView] = useState<View>("board");
  const [updateTab, setUpdateTab] = useState<"form" | "history">("form");
  const [collapsed, setCollapsed] = useState(false);
  // Rows can be deleted by hand in the database; fall back to the first founder.
  const persona = state.founders.find((f) => f.id === personaId) ?? state.founders.find((f) => !f.isAdmin);
  if (!persona) return <p className="loading">No founders in the database. Run npm run db:reset.</p>;
  const nav = persona.isAdmin ? ADMIN_NAV : FOUNDER_NAV;
  const pendingForMe = state.asks.filter((a) => a.recipientId === persona.id && a.status === "pending").length;
  const unreadNotices = state.notices.filter((n) => n.founderId === persona.id).length;

  function switchPersona(id: string) {
    setPersonaId(id);
    const admin = state.founders.find((f) => f.id === id)?.isAdmin;
    if (view !== "emails") setView(admin ? "overview" : "board");
  }

  const current = [...nav, ["emails", "Email log", Mail] as NavItem].find(([v]) => v === view);

  async function resetDemo() {
    if (!window.confirm("Reset the database to the seed data? Everything done in the demo is cleared.")) return;
    await dispatch({ type: "reset" });
    setPersonaId("f-tomasz");
    setView("board");
  }

  const menuButton = ([v, label, Icon]: NavItem, badge = 0) => (
    <li key={v}>
      <button className="sb-button" data-active={view === v} title={collapsed ? label : undefined} onClick={() => setView(v)}>
        <Icon aria-hidden />
        <span className="sb-text">{label}</span>
        {badge > 0 && <span className="sb-badge">{badge}</span>}
      </button>
    </li>
  );

  return (
    <div className="app" data-collapsed={collapsed}>
      <aside className="sidebar" aria-label="Portal">
        <div className="sb-header">
          <div className="sb-workspace">
            <span className="sb-logo">
              <Building2 aria-hidden />
            </span>
            <span className="sb-text">
              <b>Volta</b>
              <small>{persona.isAdmin ? "Residency admin" : "Founder portal"}</small>
            </span>
          </div>
        </div>

        <nav className="sb-content">
          <div className="sb-group">
            <div className="sb-label">Navigation</div>
            <ul className="sb-menu">
              {nav.map((item) => menuButton(item, item[0] === "requests" ? pendingForMe + unreadNotices : 0))}
            </ul>
          </div>
          <div className="sb-group">
            <div className="sb-label">Prototype</div>
            <ul className="sb-menu">{menuButton(["emails", "Email log", Mail], state.emails.length)}</ul>
          </div>
        </nav>

        <div className="sb-footer">
          <label className="sb-button sb-persona" title="Viewing as">
            <span className="avatar">{initials(persona.displayName)}</span>
            <span className="sb-text">
              <b>{persona.displayName}</b>
              <small>{[persona.role, persona.companyName].filter(Boolean).join(", ")}</small>
            </span>
            <ChevronsUpDown className="sb-chevron" aria-hidden />
            <select aria-label="Viewing as" value={persona.id} onChange={(e) => switchPersona(e.target.value)}>
              <optgroup label="Volta">
                {state.founders
                  .filter((f) => f.isAdmin)
                  .map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.displayName} (residency lead)
                    </option>
                  ))}
              </optgroup>
              <optgroup label="Founders">
                {state.founders
                  .filter((f) => !f.isAdmin)
                  .map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.displayName} · {f.companyName}
                    </option>
                  ))}
              </optgroup>
            </select>
          </label>
        </div>
      </aside>

      <div className="main-col">
        <header className="topbar">
          <button className="icon-button" aria-label="Toggle sidebar" onClick={() => setCollapsed(!collapsed)}>
            <PanelLeft aria-hidden />
          </button>
          <div className="topbar-title">
            <h1>Volta</h1>
            <span className="muted">· Founder Pinboard{current ? ` · ${current[1]}` : ""}</span>
            <span className="badge-outline" title="Made-up founders, stored in Postgres (pinboard schema). Emails are logged, never sent.">
              Prototype · mock data
            </span>
          </div>
          <div className="topbar-actions">
            {pending && (
              <span className="muted small" aria-live="polite">
                Saving…
              </span>
            )}
            <button className="icon-button" aria-label="Reload from database" title="Reload from database" disabled={pending} onClick={reload}>
              <RefreshCw aria-hidden />
            </button>
            <button className="icon-button" aria-label="Reset demo data" title="Reset demo data" disabled={pending} onClick={resetDemo}>
              <RotateCcw aria-hidden />
            </button>
          </div>
        </header>

        {error && (
          <div className="errorbar" role="alert">
            <span>Database error: {error}</span>
            <button className="icon-btn" aria-label="Dismiss" onClick={clearError}>
              ×
            </button>
          </div>
        )}

        <main className="workspace">
        {/* key: switching persona resets form state, like a fresh login */}
        <div key={persona.id} className="pane-wrap">
          {view === "update" && (
            <>
              <div className="subtabs" role="tablist" aria-label="Monthly update">
                {(
                  [
                    ["form", "This month", null],
                    ["history", "History", state.updates.filter((u) => u.founderId === persona.id).length],
                  ] as const
                ).map(([tab, label, count]) => (
                  <button
                    key={tab}
                    role="tab"
                    aria-selected={updateTab === tab}
                    onClick={() => setUpdateTab(tab)}
                  >
                    {label}
                    {count ? <span className="subtab-count">{count}</span> : null}
                  </button>
                ))}
              </div>
              {updateTab === "form" ? (
                <UpdateView founderId={persona.id} onSubmitted={() => setUpdateTab("history")} />
              ) : (
                <HistoryView founderId={persona.id} />
              )}
            </>
          )}
          {view === "board" && <BoardView founderId={persona.id} readOnly={persona.isAdmin} />}
          {view === "requests" && <RequestsView founderId={persona.id} />}
          {view === "events" &&
            (persona.isAdmin ? <AdminEventsView /> : <EventsView founderId={persona.id} />)}
          {view === "overview" && <OverviewView />}
          {view === "topics" && <TopicEditorView adminId={persona.id} />}
          {view === "emails" && <EmailLogView />}
        </div>
        </main>
      </div>
    </div>
  );
}

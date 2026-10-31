"use client";
import { useEffect, useRef, useState } from "react";
import type { Workspace } from "../types";
import { getSupabase } from "@/lib/supabase";
import { jsonRequest } from "../client";
export function AccountWorkspace({
  workspace,
  onOpen,
  onLeave,
}: {
  workspace: Workspace;
  onOpen: (ownerId: string, state: Workspace | null) => void;
  onLeave: () => void;
}) {
  const [account, setAccount] = useState(false),
    [enabled, setEnabled] = useState(false),
    [consent, setConsent] = useState(false),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false),
    [saveTick, setSaveTick] = useState(0),
    [saving, setSaving] = useState(false);
  const revision = useRef<string | null>(null),
    owner = useRef<string | null>(null),
    last = useRef("");
  const inFlight = useRef(false);
  const open = useRef(onOpen);
  useEffect(() => {
    open.current = onOpen;
  }, [onOpen]);
  const leave = useRef(onLeave);
  useEffect(() => {
    leave.current = onLeave;
  }, [onLeave]);
  useEffect(() => {
    const db = getSupabase();
    if (!db) return;
    void db.auth
      .getUser()
      .then(async ({ data }) => {
        setAccount(!!data.user);
        if (
          data.user &&
          sessionStorage.getItem("syrka-roadmaps:active-account") ===
            data.user.id
        ) {
          try {
            const r = await jsonRequest<{
              ownerId: string;
              state: Workspace | null;
              revision: string | null;
            }>("/api/workspace");
            if (r.ownerId !== data.user.id) return;
            owner.current = r.ownerId;
            revision.current = r.revision;
            last.current = r.state ? JSON.stringify(r.state) : "";
            open.current(r.ownerId, r.state);
            setConsent(true);
            setEnabled(true);
          } catch (e) {
            setMessage((e as Error).message);
          }
        }
      })
      .catch(() => {});
    const { data } = db.auth.onAuthStateChange((_event, session) => {
      setAccount(!!session?.user);
      if (owner.current && session?.user.id !== owner.current) {
        localStorage.removeItem("syrka-roadmaps:account:" + owner.current);
        owner.current = null;
        sessionStorage.removeItem("syrka-roadmaps:active-account");
        setEnabled(false);
        setConsent(false);
        leave.current();
      }
    });
    return () => data.subscription.unsubscribe();
  }, []);
  useEffect(() => {
    if (!enabled || !consent || busy || workspace.person.fictional) return;
    const serialized = JSON.stringify(workspace);
    if (last.current === serialized) return;
    const timer = setTimeout(async () => {
      if (inFlight.current) return;
      inFlight.current = true;
      setSaving(true);
      try {
        const r = await jsonRequest<{ revision: string }>("/api/workspace", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            state: workspace,
            revision: revision.current,
          }),
        });
        revision.current = r.revision;
        last.current = serialized;
        setMessage("Saved to your private account.");
      } catch (e) {
        setEnabled(false);
        setMessage((e as Error).message);
      } finally {
        inFlight.current = false;
        setSaving(false);
        setSaveTick((n) => n + 1);
      }
    }, 900);
    return () => clearTimeout(timer);
  }, [workspace, enabled, consent, saveTick, busy]);
  useEffect(() => {
    const reset = () => {
      setEnabled(false);
      setConsent(false);
      sessionStorage.removeItem("syrka-roadmaps:active-account");
      revision.current = null;
      setMessage("Account snapshot deleted; cloud saving is paused.");
    };
    window.addEventListener("syrka-account-deleted", reset);
    return () => window.removeEventListener("syrka-account-deleted", reset);
  }, []);
  if (!account) return null;
  return (
    <section className="account-workspace" aria-label="Account workspace">
      <div>
        <strong>
          {enabled ? "Private account workspace" : "Your account is signed in"}
        </strong>
        <p className="small">
          {enabled
            ? "Reviewed records, saved destinations and progress sync to this account. Original CV files stay on this device."
            : "Open your account workspace to resume another device. This browser’s guest workspace stays separate."}
        </p>
      </div>
      {!enabled && (
        <>
          <label className="inline-check">
            <input
              type="checkbox"
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
            />
            Save my reviewed profile and progress privately to my account.
          </label>
          <button
            className="secondary"
            disabled={!consent || busy}
            onClick={async () => {
              setBusy(true);
              try {
                const r = await jsonRequest<{
                  ownerId: string;
                  state: Workspace | null;
                  revision: string | null;
                }>("/api/workspace");
                owner.current = r.ownerId;
                sessionStorage.setItem(
                  "syrka-roadmaps:active-account",
                  r.ownerId,
                );
                revision.current = r.revision;
                last.current = r.state ? JSON.stringify(r.state) : "";
                onOpen(r.ownerId, r.state);
                setEnabled(true);
                setMessage(
                  "Account workspace opened. Import or edit your profile here; guest data is not uploaded automatically.",
                );
              } catch (e) {
                setMessage((e as Error).message);
              } finally {
                setBusy(false);
              }
            }}
          >
            {busy ? "Opening…" : "Open account workspace"}
          </button>
        </>
      )}
      <button
        className="text-button"
        disabled={busy || saving}
        onClick={async () => {
          setBusy(true);
          if (
            enabled &&
            consent &&
            !workspace.person.fictional &&
            last.current !== JSON.stringify(workspace)
          ) {
            try {
              const saved = await jsonRequest<{ revision: string }>(
                "/api/workspace",
                {
                  method: "PUT",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    state: workspace,
                    revision: revision.current,
                  }),
                },
              );
              revision.current = saved.revision;
              last.current = JSON.stringify(workspace);
            } catch (e) {
              setMessage(
                "Sign-out paused to protect unsaved work. Export a backup or resolve the save error: " +
                  (e as Error).message,
              );
              setBusy(false);
              return;
            }
          }
          const r = await getSupabase()?.auth.signOut();
          if (r?.error) {
            setMessage("Sign-out failed; please retry.");
            setBusy(false);
            return;
          }
          if (owner.current)
            localStorage.removeItem("syrka-roadmaps:account:" + owner.current);
          sessionStorage.removeItem("syrka-roadmaps:active-account");
          setEnabled(false);
          setAccount(false);
          onLeave();
          setBusy(false);
        }}
      >
        Sign out
      </button>
      {message && <p role="status">{message}</p>}
    </section>
  );
}

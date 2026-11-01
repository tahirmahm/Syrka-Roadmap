"use client";
import { useCallback, useEffect, useRef, useState } from "react";
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
  const mounted = useRef(false),
    authGeneration = useRef(0),
    authOwner = useRef<string | null | undefined>(undefined),
    loadGeneration = useRef(0),
    requests = useRef(new Set<AbortController>()),
    inFlight = useRef<object | null>(null),
    manual = useRef<object | null>(null);
  const current = useCallback(
    (generation: number, expectedOwner: string) =>
      mounted.current &&
      authGeneration.current === generation &&
      authOwner.current === expectedOwner,
    [],
  );
  const invalidate = useCallback(() => {
    authGeneration.current++;
    loadGeneration.current++;
    for (const request of requests.current) request.abort();
    requests.current.clear();
    inFlight.current = null;
    manual.current = null;
    if (mounted.current) {
      setBusy(false);
      setSaving(false);
    }
  }, []);
  const removeLocalAccount = (id: string | null | undefined) => {
    if (id)
      try {
        localStorage.removeItem("syrka-roadmaps:account:" + id);
      } catch {
        /* Local storage can be disabled. */
      }
  };
  const activeAccount = () => {
    try {
      return sessionStorage.getItem("syrka-roadmaps:active-account");
    } catch {
      return null;
    }
  };
  const clearActiveAccount = () => {
    try {
      sessionStorage.removeItem("syrka-roadmaps:active-account");
    } catch {
      /* No persisted connection remains. */
    }
  };

  const open = useRef(onOpen);
  useEffect(() => {
    open.current = onOpen;
  }, [onOpen]);
  const leave = useRef(onLeave);
  useEffect(() => {
    leave.current = onLeave;
  }, [onLeave]);
  useEffect(() => {
    mounted.current = true;
    const db = getSupabase(),
      generation = authGeneration.current;
    if (!db)
      return () => {
        mounted.current = false;
        invalidate();
      };
    void db.auth
      .getUser()
      .then(async ({ data }) => {
        if (!mounted.current || generation !== authGeneration.current) return;
        const expectedOwner = data.user?.id || null;
        if (
          authOwner.current !== undefined &&
          authOwner.current !== expectedOwner
        )
          return;
        authOwner.current = expectedOwner;
        setAccount(!!expectedOwner);
        if (
          expectedOwner &&
          !owner.current &&
          !manual.current &&
          activeAccount() === expectedOwner
        ) {
          const load = ++loadGeneration.current,
            controller = new AbortController();
          requests.current.add(controller);
          try {
            const r = await jsonRequest<{
              ownerId: string;
              state: Workspace | null;
              revision: string | null;
            }>("/api/workspace", {
              headers: { "X-Roadmaps-Owner": expectedOwner },
              signal: controller.signal,
            });
            if (
              !current(generation, expectedOwner) ||
              load !== loadGeneration.current ||
              r.ownerId !== expectedOwner
            )
              return;
            owner.current = expectedOwner;
            revision.current = r.revision;
            last.current = r.state ? JSON.stringify(r.state) : "";
            open.current(expectedOwner, r.state);
            setConsent(true);
            setEnabled(true);
          } catch (e) {
            if (
              current(generation, expectedOwner) &&
              load === loadGeneration.current
            )
              setMessage((e as Error).message);
          } finally {
            requests.current.delete(controller);
          }
        }
      })
      .catch(() => {
        /* Auth state notifications remain authoritative if user lookup fails. */
      });
    const { data } = db.auth.onAuthStateChange((event, session) => {
      if (!mounted.current) return;
      const nextOwner = session?.user.id || null,
        previous = authOwner.current;
      // INITIAL_SESSION and the pending getUser lookup may describe the same mount.
      // Recording that initial identity must not cancel its legitimate restore.
      if (previous === undefined && event === "INITIAL_SESSION") {
        authOwner.current = nextOwner;
        setAccount(!!nextOwner);
        return;
      }
      setAccount(!!nextOwner);
      if (previous === nextOwner) return;
      const oldOwner = owner.current,
        wasConnected = !!oldOwner || !!activeAccount();
      authOwner.current = nextOwner;
      invalidate();
      removeLocalAccount(oldOwner);
      owner.current = null;
      revision.current = null;
      last.current = "";
      clearActiveAccount();
      setEnabled(false);
      setConsent(false);
      setMessage("");
      if (wasConnected) leave.current();
    });
    return () => {
      mounted.current = false;
      invalidate();
      data.subscription.unsubscribe();
    };
  }, [current, invalidate]);
  useEffect(() => {
    const expectedOwner = owner.current,
      generation = authGeneration.current;
    if (
      !enabled ||
      !consent ||
      busy ||
      workspace.person.fictional ||
      !expectedOwner ||
      !current(generation, expectedOwner)
    )
      return;
    const serialized = JSON.stringify(workspace);
    if (last.current === serialized) return;
    const timer = setTimeout(async () => {
      if (
        inFlight.current ||
        manual.current ||
        !current(generation, expectedOwner) ||
        owner.current !== expectedOwner
      )
        return;
      const request = {},
        controller = new AbortController();
      inFlight.current = request;
      requests.current.add(controller);
      setSaving(true);
      try {
        const r = await jsonRequest<{ revision: string }>("/api/workspace", {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            "X-Roadmaps-Owner": expectedOwner,
          },
          body: JSON.stringify({
            state: workspace,
            revision: revision.current,
          }),
          signal: controller.signal,
        });
        if (
          !current(generation, expectedOwner) ||
          owner.current !== expectedOwner
        )
          return;
        revision.current = r.revision;
        last.current = serialized;
        setMessage("Saved to your private account.");
      } catch (e) {
        if (
          current(generation, expectedOwner) &&
          owner.current === expectedOwner
        ) {
          setEnabled(false);
          setMessage((e as Error).message);
        }
      } finally {
        requests.current.delete(controller);
        if (inFlight.current === request) {
          inFlight.current = null;
          if (current(generation, expectedOwner)) {
            setSaving(false);
            setSaveTick((n) => n + 1);
          }
        }
      }
    }, 900);
    return () => clearTimeout(timer);
  }, [workspace, enabled, consent, saveTick, busy, current]);
  useEffect(() => {
    const pause = () => {
      invalidate();
      owner.current = null;
      last.current = "";
      setEnabled(false);
      setConsent(false);
      clearActiveAccount();
      revision.current = null;
    };
    const reset = () => {
      pause();
      setMessage("Account snapshot deleted; cloud saving is paused.");
    };
    const localReset = () => {
      pause();
      setMessage(
        "Local records reset. Cloud saving is paused; the account snapshot was not deleted.",
      );
    };
    window.addEventListener("syrka-account-deleted", reset);
    window.addEventListener("syrka-local-reset", localReset);
    return () => {
      window.removeEventListener("syrka-account-deleted", reset);
      window.removeEventListener("syrka-local-reset", localReset);
    };
  }, [invalidate]);
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
              const expectedOwner = authOwner.current,
                generation = authGeneration.current;
              if (
                !expectedOwner ||
                !consent ||
                manual.current ||
                !current(generation, expectedOwner)
              )
                return;
              const operation = {},
                load = ++loadGeneration.current,
                controller = new AbortController();
              manual.current = operation;
              requests.current.add(controller);
              setBusy(true);
              try {
                const r = await jsonRequest<{
                  ownerId: string;
                  state: Workspace | null;
                  revision: string | null;
                }>("/api/workspace", {
                  headers: { "X-Roadmaps-Owner": expectedOwner },
                  signal: controller.signal,
                });
                if (
                  !current(generation, expectedOwner) ||
                  load !== loadGeneration.current ||
                  r.ownerId !== expectedOwner
                )
                  return;
                owner.current = expectedOwner;
                try {
                  sessionStorage.setItem(
                    "syrka-roadmaps:active-account",
                    expectedOwner,
                  );
                } catch {
                  /* Account sync still works for this session. */
                }
                revision.current = r.revision;
                last.current = r.state ? JSON.stringify(r.state) : "";
                open.current(expectedOwner, r.state);
                setEnabled(true);
                setMessage(
                  "Account workspace opened. Import or edit your profile here; guest data is not uploaded automatically.",
                );
              } catch (e) {
                if (
                  current(generation, expectedOwner) &&
                  load === loadGeneration.current
                )
                  setMessage((e as Error).message);
              } finally {
                requests.current.delete(controller);
                if (manual.current === operation) {
                  manual.current = null;
                  if (current(generation, expectedOwner)) setBusy(false);
                }
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
          const expectedOwner = authOwner.current,
            generation = authGeneration.current;
          if (
            !expectedOwner ||
            manual.current ||
            inFlight.current ||
            !current(generation, expectedOwner)
          )
            return;
          const operation = {},
            controller = new AbortController();
          manual.current = operation;
          requests.current.add(controller);
          setBusy(true);
          try {
            if (
              enabled &&
              consent &&
              owner.current === expectedOwner &&
              !workspace.person.fictional &&
              last.current !== JSON.stringify(workspace)
            ) {
              try {
                const saved = await jsonRequest<{ revision: string }>(
                  "/api/workspace",
                  {
                    method: "PUT",
                    headers: {
                      "Content-Type": "application/json",
                      "X-Roadmaps-Owner": expectedOwner,
                    },
                    body: JSON.stringify({
                      state: workspace,
                      revision: revision.current,
                    }),
                    signal: controller.signal,
                  },
                );
                if (
                  !current(generation, expectedOwner) ||
                  owner.current !== expectedOwner
                )
                  return;
                revision.current = saved.revision;
                last.current = JSON.stringify(workspace);
              } catch (e) {
                if (current(generation, expectedOwner))
                  setMessage(
                    "Sign-out paused to protect unsaved work. Export a backup or resolve the save error: " +
                      (e as Error).message,
                  );
                return;
              }
            }
            if (!current(generation, expectedOwner)) return;
            const result = await getSupabase()?.auth.signOut();
            if (!current(generation, expectedOwner)) return; // The auth listener already handled a change.
            if (result?.error) {
              setMessage("Sign-out failed; please retry.");
              return;
            }
            removeLocalAccount(owner.current);
            owner.current = null;
            authOwner.current = null;
            revision.current = null;
            last.current = "";
            clearActiveAccount();
            invalidate();
            setEnabled(false);
            setConsent(false);
            setAccount(false);
            leave.current();
          } catch {
            if (current(generation, expectedOwner))
              setMessage(
                "Sign-out failed; your local workspace is preserved. Please retry.",
              );
          } finally {
            requests.current.delete(controller);
            if (manual.current === operation) {
              manual.current = null;
              if (current(generation, expectedOwner)) setBusy(false);
            }
          }
        }}
      >
        Sign out
      </button>
      {message && <p role="status">{message}</p>}
    </section>
  );
}

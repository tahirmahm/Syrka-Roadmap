import { expectedWorkspaceOwner } from "@/odyssey/server/workspace-owner";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { boundedJSON } from "@/odyssey/server/http";
import { parseWorkspace } from "@/odyssey/profile";
import { z } from "zod";
const payload = z
  .object({ state: z.unknown(), revision: z.string().nullable() })
  .strict();
const reply = (body: unknown, status = 200) =>
  NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "private, no-store" },
  });
async function session() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL,
    key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  const jar = await cookies();
  const db = createServerClient(url, key, {
    cookies: {
      getAll: () => jar.getAll(),
      setAll: (values) => {
        for (const v of values) jar.set(v.name, v.value, v.options);
      },
    },
  });
  const {
    data: { user },
    error,
  } = await db.auth.getUser();
  return user && !error ? { db, user } : null;
}
export async function GET(req: NextRequest) {
  try {
    const s = await session();
    if (!s)
      return reply(
        { error: "Sign in to open your private account workspace." },
        401,
      );
    if (!expectedWorkspaceOwner(req.headers, s.user.id, false))
      return reply(
        {
          error:
            "Account changed while this request was pending. Reopen your own workspace.",
        },
        409,
      );
    const r = await s.db
      .from("workspace_snapshots")
      .select("state,updated_at")
      .eq("owner_id", s.user.id)
      .maybeSingle();
    if (r.error)
      return reply(
        {
          error:
            "Account storage is unavailable. Keep a local export; the Roadmaps snapshot migration may need applying.",
        },
        503,
      );
    const state = r.data ? parseWorkspace(JSON.stringify(r.data.state)) : null;
    if (r.data && !state)
      return reply(
        {
          error:
            "The saved workspace requires recovery and has not been overwritten.",
        },
        409,
      );
    return reply({
      ownerId: s.user.id,
      state,
      revision: r.data?.updated_at || null,
    });
  } catch {
    return reply({ error: "Account storage is temporarily unavailable." }, 503);
  }
}
export async function PUT(req: NextRequest) {
  // Only same-origin, explicit JSON requests; auth is verified server-side and RLS remains active.
  if (
    req.headers.get("origin") !== req.nextUrl.origin ||
    !req.headers.get("content-type")?.includes("application/json")
  )
    return reply({ error: "Same-origin JSON request required." }, 403);
  try {
    const s = await session();
    if (!s) return reply({ error: "Sign in before saving account data." }, 401);
    if (!expectedWorkspaceOwner(req.headers, s.user.id))
      return reply(
        {
          error:
            "Account changed or intended owner is missing. Your existing workspace was not modified.",
        },
        409,
      );
    const x = payload.parse(await boundedJSON(req, 2_000_000));
    const state = parseWorkspace(JSON.stringify(x.state));
    if (!state || state.person.fictional)
      return reply(
        {
          error:
            "Save a reviewed personal workspace, not a fictional demonstration.",
        },
        400,
      );
    const profile = await s.db
      .from("profiles")
      .upsert(
        { id: s.user.id, display_name: state.person.name },
        { onConflict: "id" },
      );
    if (profile.error)
      return reply({ error: "The account profile could not be saved." }, 503);
    const updated = new Date(
      Math.max(Date.now(), x.revision ? Date.parse(x.revision) + 1 : 0),
    ).toISOString();
    const row = {
      owner_id: s.user.id,
      schema_version: 2,
      state,
      updated_at: updated,
    };
    const r = x.revision
      ? await s.db
          .from("workspace_snapshots")
          .update(row)
          .eq("owner_id", s.user.id)
          .eq("updated_at", x.revision)
          .select("updated_at")
          .maybeSingle()
      : await s.db
          .from("workspace_snapshots")
          .insert(row)
          .select("updated_at")
          .single();
    if (r.error?.code === "23505" || (!r.error && !r.data))
      return reply(
        {
          error:
            "Another device saved newer work. Export this device’s work, then reopen the account workspace before saving.",
        },
        409,
      );
    if (r.error)
      return reply(
        { error: "Account save failed. Your local workspace is intact." },
        503,
      );
    return reply({ revision: r.data!.updated_at });
  } catch {
    return reply(
      {
        error:
          "Invalid or unavailable account save. Your existing snapshot was not replaced.",
      },
      400,
    );
  }
}

export async function DELETE(req: NextRequest) {
  if (
    req.headers.get("origin") !== req.nextUrl.origin ||
    !req.headers.get("content-type")?.includes("application/json")
  )
    return reply({ error: "Same-origin JSON request required." }, 403);
  try {
    const s = await session();
    if (!s)
      return reply(
        { error: "Sign in to delete your private account snapshot." },
        401,
      );
    if (!expectedWorkspaceOwner(req.headers, s.user.id))
      return reply(
        {
          error:
            "Account changed or intended owner is missing. No snapshot was deleted.",
        },
        409,
      );
    const r = await s.db
      .from("workspace_snapshots")
      .delete()
      .eq("owner_id", s.user.id);
    return r.error
      ? reply({ error: "Could not delete the account snapshot." }, 503)
      : reply({ deleted: true });
  } catch {
    return reply(
      { error: "Account deletion is temporarily unavailable." },
      503,
    );
  }
}

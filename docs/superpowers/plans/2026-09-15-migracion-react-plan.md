# Tonocromía React/Next.js Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild Tonocromía as a Next.js app (participant flow + investigator panel) backed by Postgres + Vercel Blob, deployable to Vercel and runnable locally with `npm run dev`.

**Architecture:** Next.js 14 App Router + TypeScript. `app/api/*` route handlers own all writes (Postgres via `@vercel/postgres`, audio files via `@vercel/blob`). Client components hold the participant/admin UI; a `data-skin` attribute on `<html>` (persisted in `localStorage`) switches between the "editorial" and "futurista" CSS themes without duplicating component logic.

**Tech Stack:** Next.js 14, React 18, TypeScript, `@vercel/postgres`, `@vercel/blob`, `fluent-ffmpeg` + `ffmpeg-static` + `ffprobe-static` (server-side audio transcode/duration), Vitest (unit tests for pure logic).

Reference spec: [`docs/superpowers/specs/2026-09-15-migracion-react-diseno.md`](../specs/2026-09-15-migracion-react-diseno.md)

---

## File Structure

```
package.json, tsconfig.json, next.config.mjs, .env.local.example
lib/
  db.ts            -- @vercel/postgres client + query helpers
  schema.sql       -- table definitions
  constants.ts     -- EMOTIONS, TEXTURES, MAX_COLORS, MAX_TOTAL_DURATION_MS
  audio.ts         -- transcodeAndProbe() used by the upload route
  auth.ts          -- admin session cookie sign/verify
lib/__tests__/
  audio.test.ts
  auth.test.ts
  duration.test.ts
app/
  layout.tsx
  globals.css
  page.tsx                       -- participant flow root (client component)
  api/
    fragments/route.ts           -- GET active fragments for participants
    submissions/route.ts         -- POST a completed submission
    admin/login/route.ts         -- POST password -> session cookie
    admin/fragments/route.ts     -- GET all / POST upload / PATCH reorder-rename-toggle / DELETE
    admin/results/route.ts       -- GET all submissions+responses
    admin/results/csv/route.ts   -- GET CSV export
  panel/page.tsx                 -- admin panel shell (client component)
components/
  skin/SkinProvider.tsx
  skin/SkinToggle.tsx
  onboarding/LogoScreen.tsx
  onboarding/AliasScreen.tsx
  onboarding/IntroScreen.tsx
  player/AudioCarousel.tsx
  player/AudioCircle.tsx
  player/Waveform.ts              -- pure peak/path math, no JSX
  panels/ColorWheelPanel.tsx
  panels/EmotionWheelPicker.tsx
  panels/TexturePanel.tsx
  admin/AdminLogin.tsx
  admin/FragmentsTab.tsx
  admin/ResultsTab.tsx
```

---

## Task 1: Project scaffold

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.mjs`, `.gitignore`, `.env.local.example`
- Create: `app/layout.tsx`, `app/globals.css`, `app/page.tsx` (placeholder)

- [ ] **Step 1: Scaffold Next.js**

```bash
npx create-next-app@latest . --typescript --app --no-tailwind --no-eslint --src-dir=false --import-alias "@/*" --use-npm
```

Answer "Yes" if it asks to install into the non-empty directory (only `docs/` and `.git/` exist so far).

- [ ] **Step 2: Add runtime dependencies**

```bash
npm install @vercel/postgres @vercel/blob fluent-ffmpeg ffmpeg-static ffprobe-static
npm install -D vitest @types/fluent-ffmpeg
```

- [ ] **Step 3: Add `.env.local.example`**

```
POSTGRES_URL=
BLOB_READ_WRITE_TOKEN=
ADMIN_PASSWORD=Mimosos7
ADMIN_SESSION_SECRET=change-me-to-a-random-string
```

- [ ] **Step 4: Add a `test` script to `package.json`**

```json
"scripts": {
  "dev": "next dev",
  "build": "next build",
  "start": "next start",
  "test": "vitest run"
}
```

- [ ] **Step 5: Verify the scaffold runs**

Run: `npm run dev`
Expected: server starts on `http://localhost:3000` with the default Next.js page.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "Scaffold Next.js app for Tonocromía"
```

---

## Task 2: Database schema and client

**Files:**
- Create: `lib/schema.sql`
- Create: `lib/db.ts`

- [ ] **Step 1: Write the schema**

`lib/schema.sql`:
```sql
create table if not exists fragments (
  id text primary key,
  label text not null,
  audio_url text,
  duration_ms integer not null default 0,
  order_index integer not null,
  active boolean not null default true
);

create table if not exists submissions (
  id uuid primary key default gen_random_uuid(),
  alias text not null,
  submitted_at timestamptz not null default now()
);

create table if not exists responses (
  submission_id uuid not null references submissions(id) on delete cascade,
  fragment_id text not null references fragments(id) on delete cascade,
  colors jsonb not null default '[]',
  emotion text,
  texture text,
  primary key (submission_id, fragment_id)
);
```

- [ ] **Step 2: Write the DB client with a migration helper**

`lib/db.ts`:
```typescript
import { sql } from "@vercel/postgres";
import { readFileSync } from "fs";
import { join } from "path";

export { sql };

export async function ensureSchema() {
  const schema = readFileSync(join(process.cwd(), "lib/schema.sql"), "utf-8");
  const statements = schema.split(";").map(s => s.trim()).filter(Boolean);
  for (const statement of statements) {
    await sql.query(statement);
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add lib/schema.sql lib/db.ts
git commit -m "Add Postgres schema and client helper"
```

Note: `ensureSchema()` is called once from the fragments seeding step (Task 4) and is
safe to re-run (`create table if not exists`).

---

## Task 3: Shared constants and pure duration/CSV logic (TDD)

**Files:**
- Create: `lib/constants.ts`
- Create: `lib/__tests__/duration.test.ts`
- Create: `lib/duration.ts`

- [ ] **Step 1: Write the failing test for the duration cap**

`lib/__tests__/duration.test.ts`:
```typescript
import { describe, it, expect } from "vitest";
import { MAX_TOTAL_DURATION_MS, wouldExceedLimit } from "../duration";

describe("wouldExceedLimit", () => {
  it("allows activating a fragment when the new total stays under 10 minutes", () => {
    const activeDurations = [60_000, 60_000]; // 2 min already active
    expect(wouldExceedLimit(activeDurations, 5 * 60_000)).toBe(false);
  });

  it("blocks activating a fragment that would push the total over 10 minutes", () => {
    const activeDurations = [9 * 60_000];
    expect(wouldExceedLimit(activeDurations, 2 * 60_000)).toBe(true);
  });

  it("exposes the 10 minute constant in milliseconds", () => {
    expect(MAX_TOTAL_DURATION_MS).toBe(10 * 60 * 1000);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run lib/__tests__/duration.test.ts`
Expected: FAIL — `../duration` does not exist yet.

- [ ] **Step 3: Implement**

`lib/duration.ts`:
```typescript
export const MAX_TOTAL_DURATION_MS = 10 * 60 * 1000;

export function wouldExceedLimit(activeDurationsMs: number[], candidateMs: number): boolean {
  const currentTotal = activeDurationsMs.reduce((sum, d) => sum + d, 0);
  return currentTotal + candidateMs > MAX_TOTAL_DURATION_MS;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run lib/__tests__/duration.test.ts`
Expected: PASS (3 tests)

- [ ] **Step 5: Add the emotion/texture constants (no test needed — static data)**

`lib/constants.ts`:
```typescript
export const MAX_COLORS = 5;

export const EMOTIONS = [
  "Plenitud", "Serenidad", "Resignación", "Añoranza", "Melancolía",
  "Desesperación", "Entusiasmo", "Empoderamiento", "Pánico", "Desorientación",
  "Alivio", "Impotencia", "Irritación", "Vulnerabilidad", "Magnetismo",
  "Seducción", "Apatía",
];

export const TEXTURES = [
  "Suave / Terciopelado", "Cristalino / Afilado", "Áspero / Granulado",
  "Denso / Pesado", "Vibrante / Eléctrico", "Líquido / Fluido",
  "Eólico / Gaseoso", "Metálico / Escarchado",
];
export const TEXTURE_OTHER_LABEL = "Otro";
```

- [ ] **Step 6: Commit**

```bash
git add lib/constants.ts lib/duration.ts lib/__tests__/duration.test.ts
git commit -m "Add emotion/texture constants and duration-cap logic with tests"
```

---

## Task 4: Admin auth (TDD)

**Files:**
- Create: `lib/auth.ts`
- Create: `lib/__tests__/auth.test.ts`
- Create: `app/api/admin/login/route.ts`

- [ ] **Step 1: Write the failing test**

`lib/__tests__/auth.test.ts`:
```typescript
import { describe, it, expect } from "vitest";
import { signSession, verifySession } from "../auth";

describe("admin session token", () => {
  it("verifies a token it just signed", () => {
    const token = signSession("secret-key");
    expect(verifySession(token, "secret-key")).toBe(true);
  });

  it("rejects a token signed with a different secret", () => {
    const token = signSession("secret-key");
    expect(verifySession(token, "other-secret")).toBe(false);
  });

  it("rejects a garbage token", () => {
    expect(verifySession("not-a-real-token", "secret-key")).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run lib/__tests__/auth.test.ts`
Expected: FAIL — `../auth` does not exist.

- [ ] **Step 3: Implement using HMAC (no extra dependency, Node's built-in `crypto`)**

`lib/auth.ts`:
```typescript
import { createHmac, timingSafeEqual } from "crypto";

const PAYLOAD = "tonocromia-admin";

export function signSession(secret: string): string {
  const signature = createHmac("sha256", secret).update(PAYLOAD).digest("hex");
  return `${PAYLOAD}.${signature}`;
}

export function verifySession(token: string, secret: string): boolean {
  const [payload, signature] = token.split(".");
  if (payload !== PAYLOAD || !signature) return false;
  const expected = createHmac("sha256", secret).update(PAYLOAD).digest("hex");
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run lib/__tests__/auth.test.ts`
Expected: PASS (3 tests)

- [ ] **Step 5: Wire the login route**

`app/api/admin/login/route.ts`:
```typescript
import { NextRequest, NextResponse } from "next/server";
import { signSession } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const { password } = await req.json();
  if (password !== process.env.ADMIN_PASSWORD) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  const token = signSession(process.env.ADMIN_SESSION_SECRET!);
  const res = NextResponse.json({ ok: true });
  res.cookies.set("tonocromia_admin", token, {
    httpOnly: true, sameSite: "lax", secure: true, path: "/", maxAge: 60 * 60 * 8,
  });
  return res;
}
```

- [ ] **Step 6: Commit**

```bash
git add lib/auth.ts lib/__tests__/auth.test.ts app/api/admin/login/route.ts
git commit -m "Add HMAC-based admin session auth"
```

---

## Task 5: Audio transcode + duration probe

**Files:**
- Create: `lib/audio.ts`

- [ ] **Step 1: Implement (no unit test — exercises real ffmpeg binaries; covered by the
  manual verification in Task 9)**

`lib/audio.ts`:
```typescript
import ffmpeg from "fluent-ffmpeg";
import ffmpegPath from "ffmpeg-static";
import ffprobePath from "ffprobe-static";
import { Readable } from "stream";

ffmpeg.setFfmpegPath(ffmpegPath as string);
ffmpeg.setFfprobePath(ffprobePath.path);

export interface TranscodeResult {
  buffer: Buffer;
  durationMs: number;
  contentType: string;
}

// Transcodes to a mono 64kbps AAC/M4A — small enough for many short spoken/musical
// fragments while staying broadly playable in browsers. Bitrate steps down further
// if the source is unusually long, so one heavy upload can't blow past the app's
// 10-minute total budget on its own.
export async function transcodeAndProbe(input: Buffer): Promise<TranscodeResult> {
  const probedSeconds = await probeDurationSeconds(input);
  const bitrate = probedSeconds > 120 ? "48k" : "64k";

  const chunks: Buffer[] = [];
  await new Promise<void>((resolve, reject) => {
    ffmpeg(Readable.from(input))
      .audioChannels(1)
      .audioBitrate(bitrate)
      .format("adts")
      .on("error", reject)
      .on("end", resolve)
      .pipe()
      .on("data", (chunk: Buffer) => chunks.push(chunk));
  });
  const buffer = Buffer.concat(chunks);
  const durationMs = Math.round(await probeDurationSeconds(buffer) * 1000);
  return { buffer, durationMs, contentType: "audio/aac" };
}

function probeDurationSeconds(input: Buffer): Promise<number> {
  return new Promise((resolve, reject) => {
    const stream = Readable.from(input);
    ffmpeg.ffprobe(stream as any, (err, data) => {
      if (err) return reject(err);
      resolve(data.format.duration ?? 0);
    });
  });
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/audio.ts
git commit -m "Add server-side audio transcode and duration probe"
```

---

## Task 6: Fragments API (list, upload, reorder/rename/toggle, delete)

**Files:**
- Create: `app/api/fragments/route.ts`
- Create: `app/api/admin/fragments/route.ts`

- [ ] **Step 1: Public read endpoint for the participant flow**

`app/api/fragments/route.ts`:
```typescript
import { NextResponse } from "next/server";
import { sql, ensureSchema } from "@/lib/db";

export async function GET() {
  await ensureSchema();
  const { rows } = await sql`
    select id, label, audio_url, duration_ms
    from fragments where active = true order by order_index asc
  `;
  return NextResponse.json(rows);
}
```

- [ ] **Step 2: Admin endpoint — list all, upload, patch, delete**

`app/api/admin/fragments/route.ts`:
```typescript
import { NextRequest, NextResponse } from "next/server";
import { put, del } from "@vercel/blob";
import { sql, ensureSchema } from "@/lib/db";
import { transcodeAndProbe } from "@/lib/audio";
import { wouldExceedLimit } from "@/lib/duration";
import { verifySession } from "@/lib/auth";
import { randomUUID } from "crypto";

function requireAdmin(req: NextRequest) {
  const token = req.cookies.get("tonocromia_admin")?.value;
  return !!token && verifySession(token, process.env.ADMIN_SESSION_SECRET!);
}

export async function GET(req: NextRequest) {
  if (!requireAdmin(req)) return NextResponse.json({}, { status: 401 });
  await ensureSchema();
  const { rows } = await sql`select * from fragments order by order_index asc`;
  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  if (!requireAdmin(req)) return NextResponse.json({}, { status: 401 });
  const form = await req.formData();
  const file = form.get("file") as File;
  const label = String(form.get("label") ?? file.name);
  const inputBuffer = Buffer.from(await file.arrayBuffer());

  const { buffer, durationMs, contentType } = await transcodeAndProbe(inputBuffer);

  const { rows: activeRows } = await sql`
    select duration_ms from fragments where active = true
  `;
  if (wouldExceedLimit(activeRows.map(r => r.duration_ms), durationMs)) {
    return NextResponse.json(
      { error: "Este audio superaría el límite de 10 minutos totales activos." },
      { status: 422 },
    );
  }

  const id = randomUUID();
  const blob = await put(`fragments/${id}.aac`, buffer, {
    access: "public", contentType,
  });

  const { rows: maxOrder } = await sql`select coalesce(max(order_index), -1) as m from fragments`;
  await sql`
    insert into fragments (id, label, audio_url, duration_ms, order_index, active)
    values (${id}, ${label}, ${blob.url}, ${durationMs}, ${maxOrder[0].m + 1}, true)
  `;
  return NextResponse.json({ id, label, audioUrl: blob.url, durationMs });
}

export async function PATCH(req: NextRequest) {
  if (!requireAdmin(req)) return NextResponse.json({}, { status: 401 });
  const { id, label, active, orderIndex } = await req.json();

  if (active === true) {
    const { rows: activeRows } = await sql`
      select duration_ms from fragments where active = true and id != ${id}
    `;
    const { rows: thisFragment } = await sql`select duration_ms from fragments where id = ${id}`;
    if (wouldExceedLimit(activeRows.map(r => r.duration_ms), thisFragment[0].duration_ms)) {
      return NextResponse.json(
        { error: "Activar este fragmento superaría el límite de 10 minutos totales." },
        { status: 422 },
      );
    }
  }

  if (label !== undefined) await sql`update fragments set label = ${label} where id = ${id}`;
  if (active !== undefined) await sql`update fragments set active = ${active} where id = ${id}`;
  if (orderIndex !== undefined) await sql`update fragments set order_index = ${orderIndex} where id = ${id}`;
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  if (!requireAdmin(req)) return NextResponse.json({}, { status: 401 });
  const { id } = await req.json();
  const { rows } = await sql`select audio_url from fragments where id = ${id}`;
  if (rows[0]?.audio_url) await del(rows[0].audio_url);
  await sql`delete from fragments where id = ${id}`;
  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 3: Commit**

```bash
git add app/api/fragments/route.ts app/api/admin/fragments/route.ts
git commit -m "Add fragments API: public list, admin upload/patch/delete with 10-min cap"
```

---

## Task 7: Submissions API + CSV export

**Files:**
- Create: `app/api/submissions/route.ts`
- Create: `app/api/admin/results/route.ts`
- Create: `app/api/admin/results/csv/route.ts`

- [ ] **Step 1: Accept a finished submission**

`app/api/submissions/route.ts`:
```typescript
import { NextRequest, NextResponse } from "next/server";
import { sql, ensureSchema } from "@/lib/db";

export async function POST(req: NextRequest) {
  await ensureSchema();
  const { alias, responses } = await req.json();
  const { rows } = await sql`
    insert into submissions (alias) values (${alias}) returning id
  `;
  const submissionId = rows[0].id;
  for (const r of responses) {
    await sql`
      insert into responses (submission_id, fragment_id, colors, emotion, texture)
      values (${submissionId}, ${r.fragmentId}, ${JSON.stringify(r.colors)}, ${r.emotion}, ${r.texture})
    `;
  }
  return NextResponse.json({ ok: true, submissionId });
}
```

- [ ] **Step 2: Admin read of all results, grouped**

`app/api/admin/results/route.ts`:
```typescript
import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { verifySession } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const token = req.cookies.get("tonocromia_admin")?.value;
  if (!token || !verifySession(token, process.env.ADMIN_SESSION_SECRET!)) {
    return NextResponse.json({}, { status: 401 });
  }
  const { rows } = await sql`
    select s.alias, s.submitted_at, r.fragment_id, r.colors, r.emotion, r.texture
    from submissions s join responses r on r.submission_id = s.id
    order by s.submitted_at desc
  `;
  return NextResponse.json(rows);
}
```

- [ ] **Step 3: CSV export (reuses the same query, one row per color)**

`app/api/admin/results/csv/route.ts`:
```typescript
import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { verifySession } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const token = req.cookies.get("tonocromia_admin")?.value;
  if (!token || !verifySession(token, process.env.ADMIN_SESSION_SECRET!)) {
    return NextResponse.json({}, { status: 401 });
  }
  const { rows } = await sql`
    select s.alias, s.submitted_at, r.fragment_id, r.colors, r.emotion, r.texture
    from submissions s join responses r on r.submission_id = s.id
    order by s.submitted_at desc
  `;
  const header = ["apodo", "enviado_en", "fragmento_id", "color_numero", "hex", "matiz", "saturacion", "luminosidad", "emocion", "textura"];
  const lines = [header.join(",")];
  for (const row of rows) {
    const colors = row.colors as { hex: string; hue: number; saturation: number; lightness: number }[];
    (colors.length ? colors : [null]).forEach((c, i) => {
      const cells = [
        row.alias, row.submitted_at.toISOString(), row.fragment_id, c ? String(i + 1) : "",
        c?.hex ?? "", c?.hue ?? "", c?.saturation ?? "", c?.lightness ?? "", row.emotion ?? "", row.texture ?? "",
      ];
      lines.push(cells.map(v => /[",\n]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : String(v)).join(","));
    });
  }
  return new NextResponse(lines.join("\n"), {
    headers: { "Content-Type": "text/csv", "Content-Disposition": "attachment; filename=tonocromia_resultados.csv" },
  });
}
```

- [ ] **Step 4: Commit**

```bash
git add app/api/submissions/route.ts app/api/admin/results/route.ts app/api/admin/results/csv/route.ts
git commit -m "Add submissions endpoint and admin results + CSV export"
```

---

## Task 8: Skin system (editorial / futurista tokens + toggle)

**Files:**
- Create: `app/globals.css` (extend the scaffolded one)
- Create: `components/skin/SkinProvider.tsx`
- Create: `components/skin/SkinToggle.tsx`

- [ ] **Step 1: Define both skins as CSS variables keyed by `[data-skin]`**

Append to `app/globals.css` (palette values taken directly from the approved
`Rumbo Cromático` mockup):
```css
:root {
  --font-display: 'Inria Serif', serif;
  --font-label: 'Lexend Zetta', sans-serif;
  --font-body: 'Inter', sans-serif;
}
[data-skin="editorial"] {
  --bg: #f4f2ee; --ink: #161616; --muted: #8a8a8a; --line: #e4e1da;
  --panel: #17151c; --accent: #c1553a; --accent-strong: #111111;
}
[data-skin="futurista"] {
  --bg: #0a0a10; --ink: #f2f0f7; --muted: #a99dc9; --line: rgba(255,255,255,0.12);
  --panel: #12111a; --accent: #8b5cf6; --accent-strong: #22d3ee;
  --font-display: 'Unbounded', sans-serif;
}
body { background: var(--bg); color: var(--ink); }
```

- [ ] **Step 2: `SkinProvider` — reads/writes `localStorage`, sets `data-skin` on `<html>`**

`components/skin/SkinProvider.tsx`:
```tsx
"use client";
import { createContext, useContext, useEffect, useState } from "react";

type Skin = "editorial" | "futurista";
const SkinContext = createContext<{ skin: Skin; setSkin: (s: Skin) => void }>({
  skin: "editorial", setSkin: () => {},
});

export function SkinProvider({ children }: { children: React.ReactNode }) {
  const [skin, setSkinState] = useState<Skin>("editorial");

  useEffect(() => {
    const stored = localStorage.getItem("tonocromia_skin") as Skin | null;
    if (stored === "editorial" || stored === "futurista") setSkinState(stored);
  }, []);

  useEffect(() => {
    document.documentElement.dataset.skin = skin;
  }, [skin]);

  function setSkin(next: Skin) {
    setSkinState(next);
    localStorage.setItem("tonocromia_skin", next);
  }

  return <SkinContext.Provider value={{ skin, setSkin }}>{children}</SkinContext.Provider>;
}

export function useSkin() {
  return useContext(SkinContext);
}
```

- [ ] **Step 3: `SkinToggle` component (used on the logo screen)**

`components/skin/SkinToggle.tsx`:
```tsx
"use client";
import { useSkin } from "./SkinProvider";

export function SkinToggle() {
  const { skin, setSkin } = useSkin();
  return (
    <div className="skin-toggle" role="group" aria-label="Elegir estilo visual">
      <button type="button" className={skin === "editorial" ? "active" : ""} onClick={() => setSkin("editorial")}>
        Editorial
      </button>
      <button type="button" className={skin === "futurista" ? "active" : ""} onClick={() => setSkin("futurista")}>
        Futurista
      </button>
    </div>
  );
}
```

- [ ] **Step 4: Wrap the app in `app/layout.tsx`**

Modify `app/layout.tsx` to import `./globals.css`, load the four Google Fonts
(`Inria Serif`, `Lexend Zetta`, `Inter`, `Unbounded`) via `next/font/google`, and wrap
`children` in `<SkinProvider>`.

- [ ] **Step 5: Commit**

```bash
git add app/globals.css components/skin app/layout.tsx
git commit -m "Add editorial/futurista skin system with persisted toggle"
```

---

## Task 9: Participant flow UI

**Files:**
- Create: `components/onboarding/LogoScreen.tsx`, `AliasScreen.tsx`, `IntroScreen.tsx`
- Create: `components/player/Waveform.ts`, `AudioCircle.tsx`, `AudioCarousel.tsx`
- Create: `components/panels/ColorWheelPanel.tsx`, `EmotionWheelPicker.tsx`, `TexturePanel.tsx`
- Modify: `app/page.tsx`

- [ ] **Step 1: Port the pure waveform math (no JSX, directly portable from the
  original file)**

`components/player/Waveform.ts` — port `fallbackPeaks`, `buildWavePath`,
`livePeaksFromAnalyser` from `tonocromia.html` lines 635-693 and 729-743 verbatim
(they are framework-agnostic math functions), exporting each by name.

- [ ] **Step 2: Build `AudioCircle`** — owns one `<audio>` element via `useRef`, an
  `AnalyserNode` created lazily on first `play()` (inside the user gesture) and
  reconnected defensively (wrapped in try/catch, same as the original
  `ensureAudioGraph`) whenever the circle becomes the active one, fixing pendiente 2.4.
  Redraws the SVG path every `requestAnimationFrame` tick while active and playing.

- [ ] **Step 3: Build `AudioCarousel`** — holds `focalIndex` state separately from the
  list of fragments; pointer drag/swipe updates only a CSS `transform` on each circle
  (no re-render of the fragment list itself), fixing pendiente 2.1. Renders the 3 task
  icons (color/emotion/texture), the scrub bar, and the "Enviar respuestas" button
  (disabled until every fragment has colors + emotion + texture).

- [ ] **Step 4: Build `EmotionWheelPicker`** — a `scroll-snap-type: y mandatory` list
  with a fixed visual "drawer" overlay in the middle; on `scroll` (debounced via
  `requestAnimationFrame`), compute which option's row center is closest to the
  container's vertical center and mark that one selected. Renders all 17 `EMOTIONS`.

- [ ] **Step 5: Build `TexturePanel`** — a responsive grid (`grid-template-columns:
  repeat(2, minmax(0, 1fr))`, no fixed pixel widths, so it fits inside any mobile
  viewport) rendering the 8 `TEXTURES` plus a 9th "Otro" tile that reveals a text
  input when selected, fixing pendiente 2.2 and 2.6.

- [ ] **Step 6: Build `ColorWheelPanel`** — port the canvas hue/saturation wheel and
  lightness slider from `tonocromia.html` lines 1084-1167 into a React component with
  local `useState` for the picker's hue/sat/light and the fragment's chosen palette
  (max `MAX_COLORS`).

- [ ] **Step 7: Wire `app/page.tsx`** as the screen-state machine (`logo | apodo |
  intro | flow | thanks`), fetching `/api/fragments` on mount and POSTing to
  `/api/submissions` on send, mirroring `state.screen` from the original file.

- [ ] **Step 8: Manual verification**

Run: `npm run dev`, open on a real phone (not just devtools) on the same network.
Expected: can complete all 17 fragments end to end, audio never stops while a panel is
open, texture grid fully visible, emotion picker snaps to the centered drawer.

- [ ] **Step 9: Commit**

```bash
git add components/onboarding components/player components/panels app/page.tsx
git commit -m "Build participant flow: carousel, color wheel, emotion picker, textures"
```

---

## Task 10: Investigator panel UI

**Files:**
- Create: `components/admin/AdminLogin.tsx`, `FragmentsTab.tsx`, `ResultsTab.tsx`
- Create: `app/panel/page.tsx`

- [ ] **Step 1: `AdminLogin`** — password field, POSTs to `/api/admin/login`, shows
  "Contraseña incorrecta." inline on 401.

- [ ] **Step 2: `FragmentsTab`** — lists fragments from `GET /api/admin/fragments`
  with reorder (▲▼ patch `orderIndex`), rename (inline edit, patch `label`),
  active/inactive toggle (patch `active`, surfacing the 422 "superaría el límite de 10
  minutos" error inline if returned), delete (confirm, then `DELETE`), and a drag-and-
  drop upload zone (`POST` multipart to the same route) with a running "X:XX / 10:00"
  total built from the fetched list's `duration_ms` sum.

- [ ] **Step 3: `ResultsTab`** — fetch `GET /api/admin/results`, group client-side by
  `alias` into participant cards (same shape as `renderAdminResults` in the original
  file), plus a "Exportar CSV" link to `/api/admin/results/csv`.

- [ ] **Step 4: `app/panel/page.tsx`** — renders `AdminLogin` until a session exists
  (probe with a HEAD/GET that 401s), then tabs between `FragmentsTab` and `ResultsTab`.

- [ ] **Step 5: Manual verification**

Run: `npm run dev`, visit `/panel`, log in with the password from
`ADMIN_PASSWORD`, upload a short audio file, confirm it appears with a real duration,
try to push the total over 10 minutes and confirm the block, submit one test
participant run and confirm it shows up in Resultados and in the CSV download.

- [ ] **Step 6: Commit**

```bash
git add components/admin app/panel
git commit -m "Build investigator panel: login, fragment management, results + CSV"
```

---

## Task 11: Seed the 17 fragments

**Files:**
- Create: `scripts/seed-fragments.ts`

- [ ] **Step 1: Write a one-off seed script** that inserts 17 `fragments` rows with
  `audio_url = null`, `duration_ms = 0`, sequential `order_index`, `active = false`
  (inactive until the investigator uploads real audio for each, since a `null`
  `audio_url` fragment would otherwise be playable-but-silent in the carousel):

```typescript
import { sql, ensureSchema } from "../lib/db";

const LABELS = Array.from({ length: 17 }, (_, i) => `Fragmento ${i + 1}`);

async function main() {
  await ensureSchema();
  for (let i = 0; i < LABELS.length; i++) {
    await sql`
      insert into fragments (id, label, order_index, active)
      values (${`f${i + 1}`}, ${LABELS[i]}, ${i}, false)
      on conflict (id) do nothing
    `;
  }
  console.log("Seeded", LABELS.length, "fragments");
}

main();
```

- [ ] **Step 2: Run it against the configured database**

Run: `npx tsx scripts/seed-fragments.ts`
Expected: `Seeded 17 fragments`

- [ ] **Step 3: Commit**

```bash
git add scripts/seed-fragments.ts
git commit -m "Add fragment seed script"
```

---

## Task 12: Deploy to Vercel

**Files:**
- Create: `vercel.json` (only if a non-default setting is needed — start without one)

- [ ] **Step 1: Push the repo to GitHub** (ask the user for the remote if one isn't
  already configured — do not create a new GitHub repo without confirming the name).

- [ ] **Step 2: In the Vercel dashboard, import the repository**, then add the
  **Postgres** (Neon) and **Blob** integrations from the Storage tab — this
  auto-populates `POSTGRES_URL` and `BLOB_READ_WRITE_TOKEN` as environment variables.

- [ ] **Step 3: Add the remaining environment variables** in Vercel project settings:
  `ADMIN_PASSWORD`, `ADMIN_SESSION_SECRET` (a long random string, different from the
  local dev one).

- [ ] **Step 4: Trigger a deploy and run the seed script against production** (`npx
  vercel env pull .env.production.local` then `npx tsx scripts/seed-fragments.ts` with
  those env vars loaded).

- [ ] **Step 5: Manual verification on the live URL**

Visit the deployed URL on a phone, confirm the app loads, the skin toggle works, and
`/panel` logs in with the production `ADMIN_PASSWORD`.

---

## Self-Review Notes

- **Spec coverage:** every row of the pendientes table in the spec maps to a step above
  (2.1 → Task 9 Step 3, 2.2 → Task 9 Step 5, 2.3 → Tasks 4/6/7/10, 2.4 → Task 9 Step 2,
  2.5 → Task 9 Step 4, 2.6 → Task 9 Step 5); the 10-minute cap is enforced in both the
  upload and the activate-toggle code paths (Task 6); the dual skin is Task 8; CSV
  export is Task 7.
- **Type consistency:** `fragmentId`/`durationMs`/`orderIndex` naming is kept
  consistent between the API request/response bodies (Tasks 6-7) and the client
  components that call them (Tasks 9-10).
- **Scope confirmed with user:** results stay list + CSV only, no aggregate charts
  panel (per the user's explicit choice during brainstorming).

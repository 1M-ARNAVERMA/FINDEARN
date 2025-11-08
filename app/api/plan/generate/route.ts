// app/api/plan/generate/route.ts
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { sbWithClientId } from "@/lib/supabaseServer";

const AI_KEY = process.env.AI_API_KEY!;
const YT_KEY = process.env.YOUTUBE_API_KEY!;
const GB_KEY = process.env.GOOGLE_BOOKS_KEY!;
const GH_TOKEN = process.env.GITHUB_TOKEN!;

const inputSchema = z.object({
  topic: z.string().min(2),
  exam: z.string().optional(),
  timeValue: z.number().int().positive(),
  timeUnit: z.enum(["days", "weeks", "months"]),
  difficulty: z.enum(["beginner", "intermediate", "advanced"]),
  clientId: z.string().min(2),
});

const aiPlanSchema = z.object({
  milestones: z
    .array(
      z.object({
        title: z.string(),
        description: z.string().optional().default(""),
        est_hours: z.number().min(1).max(40),
        queries: z.object({
          youtube: z.array(z.string()).optional().default([]),
          github: z.array(z.string()).optional().default([]),
          books: z.array(z.string()).optional().default([]),
          wikipedia: z.array(z.string()).optional().default([]),
          stackexchange: z.array(z.string()).optional().default([]),
        }),
      })
    )
    .min(3)
    .max(7),
});

function unitToDays(value: number, unit: "days" | "weeks" | "months") {
  if (unit === "days") return value;
  if (unit === "weeks") return value * 7;
  return value * 30; // approx for months
}

function difficultyMultiplier(d: "beginner" | "intermediate" | "advanced") {
  // beginner needs more time, advanced a bit less
  if (d === "beginner") return 1.3;
  if (d === "advanced") return 0.9;
  return 1.0;
}

async function callAIPlan(
  topic: string,
  exam?: string,
  totalHours?: number,
  difficulty?: string
) {
  const prompt = `
Return ONLY JSON in this exact shape:
{
  "milestones": [
    {
      "title": "string",
      "description": "string",
      "est_hours": number(1-40),
      "queries": {
        "youtube": ["search term", ...],
        "github": ["search term", ...],
        "books": ["search term", ...],
        "wikipedia": ["page term", ...],
        "stackexchange": ["search term", ...]
      }
    }
  ]
}
Constraints:
- 3 to 7 milestones
- Make queries specific to each milestone
- Topic: "${topic}"
- Goal/Exam: "${exam ?? "general proficiency"}"
- Target total study hours (approx): ${Math.max(6, Math.round(totalHours ?? 20))} hours
- Learner level: ${difficulty ?? "intermediate"}
- No extra text, no markdown, only JSON.`;

  const resp = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${AI_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "openai/gpt-4o-mini",
      temperature: 0.2,
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
    }),
  });

  if (!resp.ok) throw new Error(`AI error: ${resp.status} ${await resp.text()}`);
  const data = await resp.json();
  const text = data.choices?.[0]?.message?.content ?? "{}";
  const parsed = aiPlanSchema.safeParse(JSON.parse(text));
  if (!parsed.success) throw new Error("AI JSON did not match schema: " + parsed.error.message);
  return parsed.data;
}

async function fetchYouTube(q: string, limit = 3) {
  const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&q=${encodeURIComponent(
    q
  )}&maxResults=${limit}&key=${YT_KEY}`;
  const j = await fetch(url).then((r) => r.json()).catch(() => null);
  return (
    j?.items?.map((it: any) => ({
      source: "youtube",
      title: it.snippet.title,
      url: `https://www.youtube.com/watch?v=${it.id.videoId}`,
      meta: { channel: it.snippet.channelTitle },
    })) ?? []
  );
}

async function fetchBooks(q: string, limit = 3) {
  const url = `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(q)}&maxResults=${limit}&key=${GB_KEY}`;
  const j = await fetch(url).then((r) => r.json()).catch(() => null);
  return (
    j?.items?.map((b: any) => ({
      source: "books",
      title: b.volumeInfo?.title,
      url: b.volumeInfo?.infoLink,
      meta: { authors: b.volumeInfo?.authors, preview: b.volumeInfo?.previewLink },
    })) ?? []
  );
}

async function fetchGitHub(q: string, limit = 3) {
  const url = `https://api.github.com/search/repositories?q=${encodeURIComponent(q)}&per_page=${limit}`;
  const j = await fetch(url, { headers: { Authorization: `Bearer ${GH_TOKEN}` } })
    .then((r) => r.json())
    .catch(() => null);
  return (
    j?.items?.map((repo: any) => ({
      source: "github",
      title: repo.full_name,
      url: repo.html_url,
      meta: { stars: repo.stargazers_count },
    })) ?? []
  );
}

async function fetchWikipedia(term: string) {
  const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(term)}`;
  const j = await fetch(url).then((r) => r.json()).catch(() => null);
  if (j?.title && j?.content_urls?.desktop?.page) {
    return [
      {
        source: "wikipedia",
        title: j.title,
        url: j.content_urls.desktop.page,
        meta: { extract: (j.extract || "").slice(0, 240) },
      },
    ];
  }
  return [];
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { topic, exam, timeValue, timeUnit, difficulty, clientId } = inputSchema.parse(body);
    const sb = sbWithClientId(clientId);

    // 1) compute hours budget
    const days = unitToDays(timeValue, timeUnit);
    const baselineHoursPerDay = 2; // tweak later
    const totalHoursBudget = Math.max(
      6,
      Math.round(days * baselineHoursPerDay * difficultyMultiplier(difficulty))
    );

    // 2) plan from AI for that budget
    const plan = await callAIPlan(topic, exam, totalHoursBudget, difficulty);

    // 3) normalize est_hours to fit budget
    const sumAI = plan.milestones.reduce((s: number, m: any) => s + (m.est_hours || 0), 0) || 1;
    const scale = totalHoursBudget / sumAI;
    const normalized = plan.milestones.map((m: any) => {
      const h = Math.max(1, Math.min(40, Math.round((m.est_hours || 2) * scale)));
      return { ...m, est_hours: h };
    });

    // 4) create roadmap with structured fields
    const { data: r, error: er } = await sb
      .from("roadmaps")
      .insert({
        client_id: clientId,
        topic,
        exam,
        time_value: timeValue,
        time_unit: timeUnit,
        difficulty,
        deadline_date: null,
      })
      .select("id")
      .single();
    if (er) throw new Error(er.message);
    const roadmapId = r.id as string;

    // 5) insert milestones
    const rows = normalized.map((m: any, i: number) => ({
      client_id: clientId,
      roadmap_id: roadmapId,
      title: m.title,
      description: m.description || "",
      order_index: i,
      est_hours: m.est_hours,
    }));
    const { data: ms, error: em } = await sb.from("milestones").insert(rows).select("id,order_index");
    if (em) throw new Error(em.message);
    const idByIdx = new Map<number, string>();
    ms?.forEach((x: any) => idByIdx.set(x.order_index, x.id));

    // 6) fetch resources per milestone
    const allResources: any[] = [];
    for (let i = 0; i < normalized.length; i++) {
      const m = normalized[i];
      const mid = idByIdx.get(i)!;
      const q = m.queries || {};

      const buckets = await Promise.all([
        ...(q.youtube || []).map((s: string) => fetchYouTube(s)),
        ...(q.books || []).map((s: string) => fetchBooks(s)),
        ...(q.github || []).map((s: string) => fetchGitHub(s)),
        ...(q.wikipedia || []).map((s: string) => fetchWikipedia(s)),
      ]);
      const flat = buckets.flat();
      flat.forEach((res: any, idx: number) => {
        allResources.push({
          client_id: clientId,
          milestone_id: mid,
          source: res.source,
          title: res.title,
          url: res.url,
          meta: res.meta || {},
          rank_score: 1 - idx * 0.01,
        });
      });
    }
    if (allResources.length) await sb.from("resources").insert(allResources);

    return NextResponse.json({ roadmapId });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json({ error: e.message || "Failed" }, { status: 500 });
  }
}

// app/api/plan/generate/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { sbWithClientId } from '@/lib/supabaseServer';

const AI_KEY = process.env.AI_API_KEY!;
const YT_KEY = process.env.YOUTUBE_API_KEY!;
const GB_KEY = process.env.GOOGLE_BOOKS_KEY!;
const GH_TOKEN = process.env.GITHUB_TOKEN!;

const inputSchema = z.object({
  topic: z.string().min(2),
  exam: z.string().optional(),
  deadline: z.string().optional(), // yyyy-mm-dd
  clientId: z.string().min(2)
});

const aiPlanSchema = z.object({
  milestones: z.array(z.object({
    title: z.string(),
    description: z.string().optional().default(''),
    est_hours: z.number().min(1).max(40),
    queries: z.object({
      youtube: z.array(z.string()).optional().default([]),
      github: z.array(z.string()).optional().default([]),
      books: z.array(z.string()).optional().default([]),
      wikipedia: z.array(z.string()).optional().default([]),
      stackexchange: z.array(z.string()).optional().default([]),
    })
  })).min(1)
});

async function callAIPlan(topic: string, exam?: string, deadline?: string) {
  // Example: OpenRouter-style key ("sk-or-..."). Adjust URL/model if you use a different provider.
  const prompt = `
You are FindEarn's planner. Return ONLY JSON matching this schema:
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
- Make queries highly specific to the milestone
- Assume learner target: "${topic}" for "${exam ?? 'general proficiency'}"
- Deadline: "${deadline ?? 'unspecified'}" (use it to size est_hours roughly)
- No extra text, no markdown, pure JSON.

Now produce the JSON plan.`;

  const resp = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${AI_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'openai/gpt-4o-mini', // pick the model you have access to
      temperature: 0.2,
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' }
    })
  });

  if (!resp.ok) throw new Error(`AI error: ${resp.status} ${await resp.text()}`);
  const data = await resp.json();
  const text = data.choices?.[0]?.message?.content ?? '{}';
  const parsed = aiPlanSchema.safeParse(JSON.parse(text));
  if (!parsed.success) throw new Error('AI JSON did not match schema: ' + parsed.error.message);
  return parsed.data;
}

async function fetchYouTube(q: string, limit = 3) {
  const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(q)}&maxResults=${limit}&key=${YT_KEY}&type=video`;
  const j = await fetch(url).then(r=>r.json()).catch(()=>null);
  return j?.items?.map((it:any)=>({
    source:'youtube',
    title: it.snippet.title,
    url: `https://www.youtube.com/watch?v=${it.id.videoId}`,
    meta: { channel: it.snippet.channelTitle }
  })) ?? [];
}

async function fetchBooks(q: string, limit = 3) {
  const url = `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(q)}&maxResults=${limit}&key=${GB_KEY}`;
  const j = await fetch(url).then(r=>r.json()).catch(()=>null);
  return j?.items?.map((b:any)=>({
    source:'books',
    title: b.volumeInfo?.title,
    url: b.volumeInfo?.infoLink,
    meta: { authors: b.volumeInfo?.authors, preview: b.volumeInfo?.previewLink }
  })) ?? [];
}

async function fetchGitHub(q: string, limit = 3) {
  const url = `https://api.github.com/search/repositories?q=${encodeURIComponent(q)}&per_page=${limit}`;
  const j = await fetch(url, { headers: { Authorization: `Bearer ${GH_TOKEN}` }}).then(r=>r.json()).catch(()=>null);
  return j?.items?.map((repo:any)=>({
    source:'github',
    title: repo.full_name,
    url: repo.html_url,
    meta: { stars: repo.stargazers_count }
  })) ?? [];
}

async function fetchWikipedia(term: string) {
  const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(term)}`;
  const j = await fetch(url).then(r=>r.json()).catch(()=>null);
  if (j?.title && j?.content_urls?.desktop?.page) {
    return [{
      source:'wikipedia',
      title: j.title,
      url: j.content_urls.desktop.page,
      meta: { extract: (j.extract || '').slice(0, 240) }
    }];
  }
  return [];
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { topic, exam, deadline, clientId } = inputSchema.parse(body);
    const sb = sbWithClientId(clientId);

    // 1) Plan from AI
    const plan = await callAIPlan(topic, exam, deadline);

    // 2) Create roadmap
    const { data: r, error: er } = await sb
      .from('roadmaps')
      .insert({ client_id: clientId, topic, exam, deadline_date: deadline ?? null })
      .select('id')
      .single();
    if (er) throw new Error(er.message);
    const roadmapId = r.id as string;

    // 3) Insert milestones
    const milestonesRows = plan.milestones.map((m, i) => ({
      client_id: clientId,
      roadmap_id: roadmapId,
      title: m.title,
      description: m.description || '',
      order_index: i,
      est_hours: m.est_hours
    }));
    const { data: insertedMilestones, error: em } = await sb.from('milestones').insert(milestonesRows).select('id, order_index');
    if (em) throw new Error(em.message);

    // 4) For each milestone, run API fetches based on AI queries
    // Map by order_index to keep alignment
    const idByIndex = new Map<number,string>();
    insertedMilestones?.forEach((row:any)=> idByIndex.set(row.order_index, row.id));

    const allResources: any[] = [];
    for (let i = 0; i < plan.milestones.length; i++) {
      const m = plan.milestones[i];
      const milestoneId = idByIndex.get(i)!;

      const chunks: any[] = [];
      await Promise.all([
        ...(m.queries.youtube || []).map(q => fetchYouTube(q).then(r => chunks.push(...r))),
        ...(m.queries.books || []).map(q => fetchBooks(q).then(r => chunks.push(...r))),
        ...(m.queries.github || []).map(q => fetchGitHub(q).then(r => chunks.push(...r))),
        ...(m.queries.wikipedia || []).map(q => fetchWikipedia(q).then(r => chunks.push(...r))),
        // StackExchange can be added similarly if needed
      ]);

      // Attach milestone id + client
      chunks.forEach((c, idx) => {
        allResources.push({
          client_id: clientId,
          milestone_id: milestoneId,
          source: c.source,
          title: c.title,
          url: c.url,
          meta: c.meta ?? {},
          rank_score: 1 - (idx * 0.01) // simple ordering
        });
      });
    }

    if (allResources.length) {
      await sb.from('resources').insert(allResources);
    }

    return NextResponse.json({ roadmapId });
  } catch (e:any) {
    console.error(e);
    return NextResponse.json({ error: e.message || 'Failed' }, { status: 500 });
  }
}

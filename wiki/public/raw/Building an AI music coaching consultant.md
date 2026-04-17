# Building an AI Music Coaching Consultant

[claude.ai](https://claude.ai/chat/dbd8569c-fdc9-4143-96f5-1c9158b24eb4) · Created 2026-04-02


**You**

I want a high-level, on-demand consultant. less “teacher,” more coach + second opinion + problem-solver. Right now: Teacher → Cobin→ Practice What you’re building: Teacher → Cobin ↔ Consultant Agent → Practice That middle layer is where reflection and refinement happen.

1. Piece & Passage Consultation (core feature) Function: Cobin can ask things like: • “How should I interpret this phrase?” • “Why does this shift sound unstable?” • “What’s the best fingering here?”

Output should be: • Specific (bar numbers, technique) • Prioritized (1–2 key fixes, not 10 ideas) • Actionable (what to do next, not theory dump)

1. Recording-Based Feedback (essential) Function: • Upload a short clip • Get: • What’s working • What’s not • What to fix next
2. Interpretation & Musical Thinking Function: • Style guidance (Baroque vs Romantic, etc.) • Phrasing suggestions • Musical structure explanation
3. Curated Knowledge Layer Instead of dumping resources, you: • Pre-select: • Editions • Recordings • Exercises • The agent references them when relevant This turns generic AI into her library system.
4. “Second Opinion Mode” (very high value) Function: Cobin can ask: • “My teacher said X—do you agree?” • “Is this interpretation convincing?”
	To avoid her replacing thinking with asking. The agent should sometimes respond with: “Try X and compare two versions—what do you hear?”

That’s how she builds musicianship.

i am a software engineer with experience working and building with ai, but i'm not an expert with advanced audio or digital processing at all. I want to build the simplest and most functional pipeline to accomplish this. how do i do this in 2026? suggest to me the best system design for this as well as the resources / libraries that I would need.

---

**Claude**

This is a well-scoped problem. Let me give you a clean system design that matches your constraints (simple pipeline, 2026 tools, no deep DSP expertise needed).

## Core Architecture

```
User (Cobin) → React/Next.js Frontend
                    ↓
              API Layer (Next.js routes or FastAPI)
                    ↓
         ┌──────────┴──────────┐
         ↓                     ↓
   Claude API              Audio Pipeline
 (consultation,          (Whisper/Gemini
  interpretation,         transcription +
  second opinion)         description)
         ↓                     ↓
         └──────────┬──────────┘
                    ↓
            Curated Knowledge
            Layer (RAG/static)
```

The key insight: **you don't need to process audio signals yourself**. You convert audio → rich text description, then Claude does all the reasoning. This sidesteps DSP entirely.

---

## The Audio Pipeline (Your Hardest Problem, Solved Simply)

For recording feedback, the 2026 stack is:

**Option A — Gemini 2.0 Flash (recommended)** Google's multimodal model accepts audio directly. You send the raw audio file and a structured prompt. It returns a musical description. Then you pass *that* into Claude with your curated context. One API call, no transcription step.

**Option B — OpenAI Whisper + GPT-4o Audio** GPT-4o also accepts audio natively now. Similar pattern. Slightly less musical nuance than Gemini in benchmarks but very solid.

**Option C — AssemblyAI Universal-2** If you want a dedicated audio API with music understanding built in (tempo, key, structure). More expensive, more structured output. Worth it if musical metadata matters to you.

**My recommendation:** Gemini 2.0 Flash for audio intake → Claude Sonnet for consultation reasoning. You get the best of both: Gemini's multimodal audio parsing + Claude's nuanced, instructable reasoning.

---

## System Design by Feature

### 1\. Piece & Passage Consultation

This is pure Claude with a well-engineered system prompt. Structure it as:

```
System prompt:
- Role: expert music consultant (not teacher)
- Constraint: respond with ≤2 prioritized fixes
- Format: bar reference → observation → specific action
- Persona rules: second-opinion mode triggers, reflection prompts

User message:
- Piece name + composer
- Bar range in question  
- The question
- [optional] relevant curated resource references
```

No special libraries needed. This is prompt engineering + a clean API call.

### 2\. Recording-Based Feedback

```
1. User records/uploads audio (Web Audio API in browser, or just <input type="file">)
2. Send to Gemini 2.0 Flash with prompt:
   "Describe this piano performance in detail: intonation, rhythm, 
    phrasing, dynamics, articulation, tempo stability. 
    Reference approximate timestamps."
3. Take Gemini's description → inject into Claude prompt:
   "Here is a description of Cobin's recording: [description]
    Piece: [X], Context: [curated notes about this piece]
    Give feedback: what's working, what's not, 1 priority fix."
4. Return Claude's response
```

Libraries: just `fetch` + `FormData` for the Gemini call. That's it.

### 3\. Curated Knowledge Layer

This is a **static JSON/markdown file you maintain**, not a database. Start simple:

```json
{
  "pieces": {
    "bach_invention_1": {
      "edition": "Henle Urtext #...",
      "reference_recordings": ["Glenn Gould 1981", "Angela Hewitt"],
      "technique_focus": ["two-voice independence", "articulation in baroque style"],
      "common_issues": ["rushing in bar 3", "over-pedaling"],
      "exercises": ["Hanon 3 for finger independence"]
    }
  }
}
```

At query time, you look up the piece and inject the relevant block into Claude's context. This is what makes it feel like *her* consultant vs. generic AI. You can graduate to a vector DB (Pinecone, Supabase pgvector) later if the library grows, but honestly a well-structured JSON file will take you far.

### 4\. Second Opinion Mode

This is a system prompt instruction + a classifier. When Cobin phrases something as "my teacher said X," Claude is instructed to:

- Affirm what's valid
- Offer nuance where it exists
- Sometimes respond with a reflection prompt instead of an answer

You can implement the "sometimes reflect instead of answer" behavior with a simple rule in the system prompt: *"When the question is interpretive rather than technical, respond with a comparative listening exercise 30% of the time."* Crude but effective.

---

## Tech Stack Recommendation

| Layer | Choice | Why |
| --- | --- | --- |
| Frontend | Next.js 15 (App Router) | Easy API routes, good audio handling |
| Audio capture | Browser `MediaRecorder` API | Zero deps, works everywhere |
| Audio understanding | Gemini 2.0 Flash | Native audio, no DSP needed |
| Consultation reasoning | Claude Sonnet 4 | Best instructable reasoning |
| Knowledge layer | Local JSON → Supabase later | Start simple |
| Auth (if needed) | Clerk or NextAuth | Fast to implement |
| Deployment | Vercel | Trivial with Next.js |

---

## What to Build First (Sequenced)

**Week 1:** Claude consultation with system prompt + static knowledge JSON. Text only. This gives you the core value immediately.

**Week 2:** Add audio upload → Gemini → Claude pipeline. Test with a few recordings.

**Week 3:** Build the curated knowledge layer properly for the specific pieces Cobin is working on. This is high-leverage and underrated.

**Week 4:** Second opinion mode, reflection prompts, UI polish.

---

## The One Trap to Avoid

Don't build a generic "AI music tutor." The entire value is the **curated knowledge layer** — the specific editions, recordings, and exercises *you* select. That's what separates this from just asking Claude directly. Invest disproportionately in that JSON file.

Want me to scaffold the Next.js project structure, write the Claude system prompt, or design the Gemini audio → Claude handoff in code?
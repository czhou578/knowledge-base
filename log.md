Log.md is chronological. It's an append-only record of what happened and when — ingests, queries, lint passes.

A useful tip: if each entry starts with a consistent prefix (e.g. ## [2026-04-02] ingest | Article Title), the log becomes parseable with simple unix tools — grep "^## \[" log.md | tail -5 gives you the last 5 entries. The log gives you a timeline of the wiki's evolution and helps you understand what's been done recently.

---

## [2026-04-02] ingest | Essentia Python Tutorial
- **File**: `Essentia Python tutorial — Essentia 2.1-beta6-dev documentation.md`
- **Category**: Libraries — Audio Analysis
- **Source**: https://essentia.upf.edu/essentia_python_tutorial.html
- **Description**: Open-source library and tools for audio and music analysis, description and synthesis.
- **Stats**: 3,728 words · 48 links

## [2026-04-02] ingest | Essentia Tonal Key Example (GitHub)
- **File**: `essentia_src_examples_python_example_tonal_key_by_steps_streaming.py at master.md`
- **Category**: Libraries — Audio Analysis
- **Source**: https://github.com/MTG/essentia/blob/master/src/examples/python/example_tonal_key_by_steps_streaming.py
- **Description**: C++ library for audio and music analysis, description and synthesis, including Python bindings — streaming key detection example.
- **Stats**: 163 words · 2 links

## [2026-04-02] ingest | librosa — Python Library for Audio and Music Analysis
- **File**: `librosa_librosa_ Python library for audio and music analysis.md`
- **Category**: Libraries — Audio Analysis
- **Source**: https://github.com/librosa/librosa
- **Description**: Python library for audio and music analysis.
- **Stats**: 640 words · 12 links

## [2026-04-02] ingest | 2026 Python MIR Libraries for Real-Time Music Analysis
- **File**: `2026 Python MIR Libraries for Real-Time Music Analysis.md`
- **Category**: Libraries — MIR General
- **Source**: https://grok.com/c/d6810b68-5ee5-4665-959a-686d3801ac1b?rid=ad87f142-2547-40f5-a775-946028696e58
- **Description**: Grok-generated overview of Python MIR libraries for real-time music analysis.
- **Stats**: 862 words · 1 link

## [2026-04-02] ingest | Building an AI Music Coaching Consultant
- **File**: `Building an AI music coaching consultant.md`
- **Category**: Project Planning
- **Source**: https://claude.ai/chat/dbd8569c-fdc9-4143-96f5-1c9158b24eb4
- **Description**: Claude conversation (2 messages) scoping the AI music coaching consultant project.
- **Stats**: 1,168 words · 1 link

## [2026-04-04] ingest | Music Information Retrieval Libraries for Real-Time Analysis
- **File**: `Music information retrieval libraries for real-time analysis.md`
- **Category**: Research & Conversations
- **Source**: https://claude.ai/chat/73ad6dc8-269c-43ff-b9e9-d4d1786472fc
- **Description**: Claude conversation (12 messages) exploring MIR libraries suitable for real-time analysis.
- **Stats**: 2,872 words · 11 links

## [2026-04-04] ingest | Bibliography — MIR Research References
- **File**: `Bibliography — MIR Research References.md`
- **Category**: References
- **Source**: (internal — compiled from conversation 73ad6dc8)
- **Description**: Complete bibliography of all URLs referenced by Claude across the MIR conversation. 97 sources covering MIR libraries, violin-specific analysis, pitch estimation, beat tracking, and transfer learning.
- **Stats**: 879 words · 102 links

## [2026-04-04] ingest | Building an AI Music Coaching Consultant (Claude–Gemini Pipeline)
- **File**: `claude-gemini-pipeline.md`
- **Category**: Other
- **Source**: https://claude.ai/chat/dbd8569c-fdc9-4143-96f5-1c9158b24eb4
- **Description**: Claude conversation (4 messages) on the Claude–Gemini pipeline for the music coaching consultant.
- **Stats**: 1,621 words · 1 link

## [undated] ingest | Project Tech Stack
- **File**: `Project Tech Stack.md`
- **Category**: Architecture
- **Source**: (internal)
- **Description**: Overview of the technology stack for the knowledge-base / wiki project.
- **Stats**: 324 words · 0 links

## [2026-04-16] query | Ideal Pipeline — Violin Coaching Agent
- **Question**: What is the ideal pipeline to build the violin coaching agent?
- **Sources consulted**: Music information retrieval libraries for real-time analysis, 2026 Python MIR Libraries for Real-Time Music Analysis, Building an AI music coaching consultant, claude-gemini-pipeline, Bibliography — MIR Research References
- **Output filed**: `Ideal Pipeline — Violin Coaching Agent.md` → Category: Project Planning
- **Summary**: Synthesized a 3-stage pipeline (ingestion → diagnostics → consultation). Stage 1: sounddevice/librosa. Stage 2: pYIN for intonation, Aubio+Madmom for rhythm, librosa for timbre/harmonics. Stage 3: Claude Sonnet with structured feature summaries. Includes CREPE fine-tuning strategy and a 5-week build sequence.
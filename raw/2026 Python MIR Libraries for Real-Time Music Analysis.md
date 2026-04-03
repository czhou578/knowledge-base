---
title: "2026 Python MIR Libraries for Real-Time Music Analysis"
source: "https://grok.com/c/d6810b68-5ee5-4665-959a-686d3801ac1b?rid=ad87f142-2547-40f5-a775-946028696e58"
author:
published:
created: 2026-04-02
description: "Grok is an AI assistant built by xAI. Chat, create images, write code, and get real-time answers from the web and X."
tags:
  - "clippings"
---
i want to build a layer for an agentic application that serves as a music consultant: taking in played notes in its ingestion layer. Standard LLMs cannot "hear" pitch or rhythm errors accurately. Your engineer must use dedicated MIR (Music Information Retrieval) libraries for the diagnostic layer. What python libraries are the most popular for real-time rhythm and onset detection, and extracting musical features like timbre and harmonics as of 2026?

**As of 2026, the most popular and actively maintained Python libraries for Music Information Retrieval (MIR) in this exact use case—real-time rhythm/onset detection plus extraction of musical features like timbre (e.g., MFCCs, spectral centroid/flux/contrast) and harmonics (e.g., chroma, harmonic-percussive separation)—are Librosa, Aubio, Madmom, and Essentia.**

These four dominate MIR research, tutorials, ISMIR resources, and practical applications. They appear consistently in 2025–2026 comparisons, benchmarks, and awesome lists. No major new contender has displaced them for real-time audio diagnostics.

### Popularity (GitHub stars as of early 2026)

- **Librosa**: ~8.3k stars — the clear overall leader and “standard” for music/audio analysis.
- **Aubio**: ~3.7k stars.
- **Essentia** (with Python bindings): ~3.5k stars.
- **Madmom**: ~1.6k stars (but extremely strong in rhythm-specific benchmarks).

All are on PyPI, well-documented, and have active communities.

### 1\. Real-time rhythm and onset detection (key for spotting rhythm errors in played notes)

Standard LLMs fail here because they lack precise temporal resolution on raw audio. These libraries use DSP + ML (RNN/CNN) for accurate onset/beat tracking in streaming mode.

| Library | Real-time strength | Key functions for rhythm/onset | Notes |
| --- | --- | --- | --- |
| **Aubio** | Best-in-class for true real-time (designed for it) | aubio.onset, aubio.tempo, aubio.beat, pitch tracking | Lightweight C core + Python bindings. Explicitly built for live audio (low latency). Great for microphone input. |
| **Madmom** | Excellent (online processors) | madmom.features.beats.DBNBeatTrackingProcessor, RNNBeatProcessor, CNNOnsetDetector | State-of-the-art ML models (top MIREX ranks historically). Supports online/streaming onset & beat tracking. Ideal for diagnostic layer. |
| **Librosa** | Good (with streaming adapter) | librosa.onset.onset\_detect, librosa.beat.beat\_track | Most popular overall; works in real-time via PyAudio/sounddevice + frame buffering. Not as low-latency native as Aubio/Madmom. |
| **Essentia** | Good (efficient C++ backend) | Rhythm/beat trackers, onset algorithms | Can be wired into real-time pipelines; strong tempo/BPM estimation. |

**Recommendation for your agentic layer**: Start with **Aubio + Madmom** for the rhythm/onset diagnostic core. They give the highest accuracy and lowest latency for live note detection. Use Madmom’s ML-based detectors when you need state-of-the-art rhythm error flagging; fall back to Aubio for simpler/lower-resource setups.

### 2\. Extracting musical features (timbre + harmonics)

These are essential for a music consultant (e.g., “your timbre is too bright/nasal,” “harmonics suggest wrong fingering,” pitch error analysis).

| Library | Timbre features | Harmonic features | Notes |
| --- | --- | --- | --- |
| **Librosa** | MFCCs, spectral centroid/flux/contrast/rolloff, zero-crossing rate, RMS energy | Chroma (pitch class), harmonic-percussive source separation (HPSS), tonality | Easiest high-level API. De-facto standard for feature engineering in MIR/ML pipelines. |
| **Essentia** | Huge set of low-level descriptors (timbre models, spectral shape, etc.) + high-level (danceability, etc.) | Chroma, HPCP (harmonic pitch class profile), tonal features | Most comprehensive extractor. Excellent for detailed harmonic/timbre diagnostics. Python API is very complete. |
| **Librosa or Essentia** | (combined with above) | — | Often paired together. |
| **Aubio/Madmom** | Basic spectral features | Limited | Use them mainly for rhythm/onset; pipe output to Librosa/Essentia for timbre/harmonics. |

**Recommendation**: Use **Librosa** (or Essentia) as the feature-extraction backbone. It integrates seamlessly with the real-time onset/beat output from Aubio/Madmom (e.g., segment audio at detected onsets → extract MFCCs/chroma per note → diagnose pitch/timbre/rhythm errors).

### Practical integration advice for your agentic ingestion + diagnostic layer

1. **Ingestion (microphone → real-time audio)**: Pair any of the above with sounddevice, PyAudio, or pysndfile for streaming buffers. Aubio and Madmom are easiest to run in a tight real-time loop.
2. **Diagnostic pipeline example (conceptual)**:
	- Stream audio → Aubio/Madmom → detect onsets/beats (rhythm error flag if timing deviates from expected score/tempo).
		- At each onset → Librosa/Essentia → extract pitch (compare to expected note), MFCCs/spectral (timbre feedback), chroma (harmonic content).
		- Feed cleaned features + error flags to your LLM agent for natural-language consultant output (“You’re rushing the 8th note and the timbre is too bright—try relaxing your embouchure”).
3. **Performance tips for real-time**:
	- Use short analysis frames (e.g., 20–50 ms) + overlap.
		- Madmom’s DBN/RNN processors or Aubio’s C core keep latency under 50 ms on modern hardware.
		- Librosa/Essentia are fast enough when you only process at detected onsets (not every frame).

These libraries are battle-tested in production music apps, research, and real-time systems. Librosa gives you the broadest ecosystem and easiest start; layer Aubio/Madmom on top for the real-time rhythm accuracy your agent needs (which generic LLMs simply cannot match). All are free/open-source and install via pip install librosa aubio madmom essentia (Essentia may need the Python bindings package).

If you share more details (e.g., target instrument, latency budget, or whether you’ll also do symbolic MIDI input), I can suggest exact code skeletons or architecture for the diagnostic layer.
# Ideal Pipeline — Violin Coaching Agent

Internal · Query synthesis from raw sources · Created 2026-04-16

---

This page synthesizes the recommended architecture for a real-time violin coaching agent from the research collected across this knowledge base. It is intended as a practical implementation reference, ordered by build sequence.

---

## Overview

The core insight from the research is this: **you do not need to process audio signals yourself at every layer.** The pipeline is best thought of in three distinct stages:

1. **Ingestion** — get clean audio into numpy arrays
2. **Diagnostics** — run MIR libraries to extract pitch, rhythm, and timbre features
3. **Consultation** — pass structured feature output into Claude for natural-language coaching feedback

Each stage has a recommended library set. The mistake to avoid is collapsing all three into one black-box model call — that loses the precision that makes the diagnostic layer actually useful.

---

## Stage 1 — Ingestion Layer

**Goal:** capture audio (mic or file) into a float32 numpy array at 44100 Hz.

| Use case | Library | Notes |
| --- | --- | --- |
| File upload (WAV, FLAC) | `soundfile` | Simplest entrypoint. Returns numpy array directly. |
| Live microphone stream | `sounddevice` | Callback-based. Wraps PortAudio. Works on Mac/Windows/Linux. |
| Auto-resample + mono mixdown | `librosa.load()` | Handles format conversion in one call. Best for file-based ingestion. |

**Recommended chunk size for violin:** 0.5–1.0 seconds per chunk. Vibrato runs at 3–8 Hz, so you need at least 0.25s to capture one full cycle. Intonation assessment needs enough note for the pitch to settle after the attack transient.

**Silence gate:** use a simple RMS energy threshold (`-40 dB`) to avoid running your MIR pipeline on silence between phrases. No ML required here.

```python
import soundfile as sf
import librosa

# File-based (recommended starting point)
audio, sr = librosa.load("student_performance.wav", sr=44100, mono=True)

# Silence gate
import numpy as np
def is_playing(chunk, threshold_db=-40.0):
    rms = np.sqrt(np.mean(chunk ** 2))
    if rms == 0:
        return False
    return 20 * np.log10(rms) > threshold_db
```

---

## Stage 2 — Diagnostic Layer

This is the core of the violin-specific intelligence. Three separate sub-problems to solve independently.

### 2a. Pitch / Intonation (the hardest problem)

**Primary tool: pYIN via `librosa.pyin()`**

pYIN is the most robust pitch estimator for violin out of the box. It handles vibrato, portamento, and the continuous pitch space of unfretted strings better than simpler autocorrelation methods.

```python
f0, voiced_flag, voiced_prob = librosa.pyin(
    audio,
    fmin=librosa.note_to_hz('G3'),   # open G string ~196 Hz
    fmax=librosa.note_to_hz('E7'),   # top of violin range ~2637 Hz
    sr=sr
)
```

**Converting to cents deviation from equal temperament:**

```python
def hz_to_cents_deviation(f0_hz, A4=440.0):
    """Returns deviation in cents from the nearest equal-temperament pitch."""
    semitones_from_A4 = 12 * np.log2(f0_hz / A4)
    nearest_semitone = np.round(semitones_from_A4)
    deviation_cents = (semitones_from_A4 - nearest_semitone) * 100
    return deviation_cents
```

A deviation beyond ±20 cents on a sustained note is a diagnosable intonation error. Note: trained violinists intentionally deviate from equal temperament in ensemble playing (Pythagorean/just intonation) — flag this in your system prompt so Claude doesn't call it an error.

**When to upgrade to CREPE:**

Use `torchcrepe` (PyTorch reimplementation) when you need sub-bin pitch resolution or you want to fine-tune on violin-specific data. The key limitations to know before touching it:

- Viterbi jump constraint of **2.4 semitones** breaks on fast string crossings — disable Viterbi and use `weighted_argmax` decoder instead
- Underperforms in the **high register** (above ~E6 / 1300 Hz) — fall back to pYIN above 800 Hz
- Pre-trained CREPE is biased toward **equal temperament** — fine-tune on the **Violin Etudes dataset (ISMIR 2022)** if you need accurate intonation assessment
- Cannot handle **double stops** — detect and skip frames where two strings are played simultaneously

```python
import torchcrepe

pitch, periodicity = torchcrepe.predict(
    audio, sr, hop_length=512,
    fmin=librosa.note_to_hz('G3'),
    fmax=librosa.note_to_hz('E7'),
    model='full',
    decoder=torchcrepe.decode.weighted_argmax,  # no Viterbi jump cap
    return_periodicity=True
)
```

### 2b. Rhythm & Onset Detection

**Primary tools: Aubio + Madmom**

| Library | Strength | Use case |
| --- | --- | --- |
| `aubio` | Lowest latency, designed for live audio | Real-time onset/beat detection, live coaching loop |
| `madmom` | State-of-the-art ML accuracy (top MIREX ranks) | Post-phrase rhythm analysis, DBN beat tracking |
| `librosa` (fallback) | Easiest API, good via PyAudio + frame buffering | Prototyping, onset detection at recorded-file granularity |

**Recommendation:** Use Aubio for live streaming and Madmom for detailed rhythm error diagnosis on uploaded recordings.

```python
import aubio

# Onset detection — live stream
onset_detector = aubio.onset("default", buf_size=512, hop_size=256, samplerate=44100)

# Madmom — beat tracking on a file
from madmom.features.beats import DBNBeatTrackingProcessor, RNNBeatProcessor
proc = DBNBeatTrackingProcessor(fps=100)
act = RNNBeatProcessor()(audio)
beats = proc(act)
```

### 2c. Timbre & Harmonic Features

**Primary tool: Librosa** (or Essentia for deeper analysis)

| Feature | Function | Diagnostic use |
| --- | --- | --- |
| MFCCs | `librosa.feature.mfcc()` | Timbre fingerprint — detects bow quality, tonal color |
| Spectral centroid | `librosa.feature.spectral_centroid()` | Brightness — "too bright/nasal" feedback |
| Chroma (HPCP) | `librosa.feature.chroma_cqt()` | Harmonic content — pitch class accuracy over phrases |
| HPSS | `librosa.effects.hpss()` | Separates harmonics from percussive noise (bow scratch, etc.) |
| Spectral flux | `librosa.onset.onset_strength()` | Energy change between frames — bowing attack characterization |

```python
mfccs       = librosa.feature.mfcc(y=audio, sr=sr, n_mfcc=13)
centroid    = librosa.feature.spectral_centroid(y=audio, sr=sr)
chroma      = librosa.feature.chroma_cqt(y=audio, sr=sr)
harmonic, _ = librosa.effects.hpss(audio)
```

---

## Stage 3 — Consultation Layer

**Tool: Claude Sonnet (via Anthropic API)**

Once the diagnostic layer extracts features, you pass a structured summary into Claude's context alongside your curated knowledge about the specific piece.

**Prompt structure:**

```
System:
  You are an expert violin consultant (not a teacher).
  Respond with ≤2 prioritized observations.
  Format: bar reference → observation → specific action.
  When the question is interpretive, sometimes respond with a listening exercise instead.
  Intonation deviations < 20 cents may be intentional (Pythagorean/just). Do not flag these as errors.

User:
  Piece: [Piece name], Bar range: [X–Y]
  Intonation: [pYIN/CREPE cents-deviation summary]
  Rhythm: [Aubio/Madmom onset timing vs. expected]
  Timbre: [MFCCs / spectral centroid summary]
  [Curated knowledge block for this piece]
  
  Question: [Student's question or diagnostic trigger]
```

---

## Integration Architecture

```
Microphone / File Upload
        ↓
  sounddevice / librosa.load()
        ↓
  Silence gate (RMS)
        ↓
  ┌──────────────────────────────┐
  │      Diagnostic Layer        │
  │  pYIN → cents deviation      │
  │  Aubio/Madmom → onset/beat   │
  │  librosa → MFCCs / chroma    │
  └──────────────────────────────┘
        ↓
  Structured feature summary
        ↓
  Claude Sonnet + curated knowledge JSON
        ↓
  Natural-language coaching feedback
```

---

## Recommended Build Sequence

| Phase | What to build | Libraries |
| --- | --- | --- |
| 1 (Week 1) | File-based ingestion + pYIN intonation + Claude consultation (text only) | `librosa`, `soundfile`, Anthropic API |
| 2 (Week 2) | Add live mic stream via sounddevice + silence gate | `sounddevice` |
| 3 (Week 3) | Aubio onset detection + rhythm error flagging | `aubio` |
| 4 (Week 4) | Madmom DBN beat tracking + timbre features (MFCCs, centroid, HPSS) | `madmom`, `librosa` |
| 5 (Week 5+) | CREPE fine-tuning on Violin Etudes for high-precision intonation | `torchcrepe`, Violin Etudes dataset |

---

## Key Pitfalls to Avoid

- **Don't use Gemini alone for violin-level feedback.** Gemini's multimodal audio is too coarse for fine-grained articulation and intonation nuance on bowed strings. Use it only as a fallback for general phrase description, not precise diagnostics.
- **Don't flag intentional expressive intonation as errors.** Train Claude with explicit awareness that ±20¢ deviations can be stylistic.
- **Don't run CREPE's Viterbi on passages with string crossings.** Disable it and use `weighted_argmax`.
- **Don't skip the silence gate.** Running your MIR pipeline on silent frames wastes compute and produces garbage output.
- **Start with pYIN, not CREPE.** pYIN is production-ready out of the box. CREPE fine-tuning is a Phase 5 investment, not a Day 1 requirement.

---

## Sources

- [Music information retrieval libraries for real-time analysis](https://claude.ai/chat/73ad6dc8-269c-43ff-b9e9-d4d1786472fc) — Full conversation: MIR library survey, CREPE fine-tuning strategy, ingestion layer code, cents deviation formula
- [2026 Python MIR Libraries for Real-Time Music Analysis](https://grok.com/c/d6810b68-5ee5-4665-959a-686d3801ac1b) — Library comparison: Librosa, Aubio, Madmom, Essentia; GitHub star rankings; real-time latency tradeoffs
- [Building an AI music coaching consultant](https://claude.ai/chat/dbd8569c-fdc9-4143-96f5-1c9158b24eb4) — System design: Gemini → Claude handoff, curated knowledge layer, second-opinion mode, build sequence
- [claude-gemini-pipeline.md](https://claude.ai/chat/dbd8569c-fdc9-4143-96f5-1c9158b24eb4) — Critical evaluation: Gemini audio quality limitations, lossy two-model hop problem, LlamaIndex recommendation
- [Constrained Harmonic Resynthesis — ISMIR 2022](https://archives.ismir.net/ismir2022/paper/000062.pdf) — Viterbi jump constraint details, Violin Etudes dataset findings
- [Violin Etudes & CREPE Fine-Tuning — ISMIR 2022 Poster](https://ismir2022program.ismir.net/poster_247.html) — Fine-tuning outperforms pre-trained CREPE; equal-temperament bias in F0 estimators

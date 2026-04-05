# Q: How does torchcrepe work, and how is it relevant to my violin coaching project?

**Date:** 2026-04-04  
**Sources:** [github.com/maxrmorrison/torchcrepe](https://github.com/maxrmorrison/torchcrepe), [pypi.org/project/torchcrepe](https://pypi.org/project/torchcrepe/)

---

## Answer

### What is torchcrepe?

`torchcrepe` is a **PyTorch reimplementation of the CREPE pitch tracker** — the original was written in TensorFlow by researchers at NYU. It runs a 6-layer convolutional neural network directly on raw audio waveforms to predict pitch (fundamental frequency, F0) with frame-by-frame resolution.

Install it with:

```bash
pip install torchcrepe
```

---

### How it works (for your ingestion layer)

#### 1. Audio load and hop length

```python
import torchcrepe

audio, sr = torchcrepe.load.audio('student_performance.wav')

# 5ms hop length — gives you a pitch estimate every 5ms
hop_length = int(sr / 200.)
```

#### 2. Predict pitch

```python
fmin = librosa.note_to_hz('G3')   # ~196 Hz — lowest open violin string
fmax = librosa.note_to_hz('E7')   # ~2637 Hz — top of practical violin range

pitch = torchcrepe.predict(
    audio, sr, hop_length,
    fmin=fmin,
    fmax=fmax,
    model='full',          # 'tiny' is faster but less accurate
    batch_size=2048,
    device='cuda:0'        # or 'cpu' if no GPU
)
# pitch shape: (1, n_frames) — one F0 value per hop
```

The output is a frequency in Hz for every frame. For a 0.5s chunk at 44100 Hz with a 5ms hop, you get 100 pitch values.

#### 3. Also retrieve periodicity (confidence)

Periodicity tells you how voiced/harmonic a frame is — crucial for violin because rests, bow changes, and silent regions should not contribute to intonation analysis.

```python
pitch, periodicity = torchcrepe.predict(
    audio, sr, hop_length,
    fmin=fmin, fmax=fmax,
    model='full',
    decoder=torchcrepe.decode.weighted_argmax,   # see decoding section
    return_periodicity=True
)
```

---

### Decoding strategies — why this matters for violin

By default torchcrepe uses **Viterbi decoding**, which smooths pitch transitions by penalizing large jumps. This works well for speech but **breaks for violin** because:

- Fast string crossings can jump >2.4 semitones between frames
- The Viterbi jump penalty incorrectly flags these as errors and produces wrong pitch values

**For your violin agent, use `weighted_argmax` instead:**

```python
pitch, periodicity = torchcrepe.predict(
    audio, sr, hop_length,
    fmin=fmin, fmax=fmax,
    model='full',
    decoder=torchcrepe.decode.weighted_argmax,  # no jump penalty
    return_periodicity=True
)
```

Available decoders:
- `torchcrepe.decode.viterbi` — default; smooth but breaks on fast string crossings
- `torchcrepe.decode.weighted_argmax` — recommended for violin; handles abrupt jumps
- `torchcrepe.decode.argmax` — raw argmax; noisiest, not recommended

---

### Filtering and thresholding

After getting pitch and periodicity, filter out noisy frames before sending to your coaching agent:

```python
win_length = 3   # 3 frames × 5ms hop = 15ms window

# Smooth noisy confidence signal
periodicity = torchcrepe.filter.median(periodicity, win_length)

# Mask frames where pitch is unreliable (tune threshold for your mic)
pitch = torchcrepe.threshold.At(0.4)(pitch, periodicity)
# 0.4 is a reasonable starting point; higher = stricter voiced detection

# Smooth pitch quantization artifacts (optional)
pitch = torchcrepe.filter.mean(pitch, win_length)
```

**Silence handling** — CREPE was never trained on silent audio, so it sometimes gives high confidence to pitch in silent frames. Fix:

```python
# Set periodicity to 0 in regions quieter than -60 dBFS
periodicity = torchcrepe.threshold.Silence(-60.)(periodicity, audio, sr, hop_length)
```

For more control, use `torchcrepe.threshold.Hysteresis` which requires consecutive voiced frames, reducing spurious detections from bow noise or pizzicato taps.

---

### Computing the pitch embedding (for fine-tuning)

torchcrepe exposes CREPE's internal representation — the 5th max-pooling layer — as a pretrained embedding. This is the entry point for **fine-tuning on violin data**:

```python
# Get the raw probability distribution (360 pitch bins)
batch = next(torchcrepe.preprocess(audio, sr, hop_length))
probabilities = torchcrepe.infer(batch)   # shape: (n_frames, 360)

# Or get the learned feature embedding
embeddings = torchcrepe.embed(audio, sr, hop_length)
```

The 360 bins span C1–B7 in 20-cent steps. Sub-bin resolution is achieved by taking a weighted average — which is why `weighted_argmax` outperforms raw `argmax`.

---

### File-based API (for uploaded recordings)

If your student uploads a recording instead of streaming live, there are direct file utilities:

```python
torchcrepe.predict_from_file(audio_file, hop_length, fmin, fmax, model, ...)
torchcrepe.predict_from_file_to_file(
    audio_file,
    output_pitch_file,
    output_periodicity_file,
    ...
)
```

---

### Two model sizes

| Model | Accuracy | Speed | Use case |
|---|---|---|---|
| `'tiny'` | Lower | Faster (CPU-friendly) | Prototype / real-time on weak hardware |
| `'full'` | Higher | Slower | Production intonation assessment |

For a violin coaching application with post-phrase feedback (not real-time tuner needle), use `'full'`.

---

### How this fits your AI music consultant architecture

```
Violin audio (sounddevice/soundfile)
        ↓
torchcrepe.predict(...)     ← runs here; outputs Hz per frame
  - decoder: weighted_argmax
  - return_periodicity=True
  - Silence threshold applied
        ↓
cents_deviation = 1200 * log2(pitch / nearest_equal_temperament_note)
        ↓
Intonation summary (mean deviation, worst bars, vibrato width)
        ↓
Claude Sonnet — consultation prompt + curated knowledge context
        ↓
Actionable feedback to student
```

The key insight from your conversation with Claude: **you don't need to understand the neural network internals**. torchcrepe handles all the pitch extraction. Your job as the engineer is to configure `fmin`/`fmax` for violin range, pick `weighted_argmax` decoder, apply silence thresholding, and convert the Hz output to cents for intonation analysis.

---

## Sources

- [torchcrepe — GitHub (maxrmorrison)](https://github.com/maxrmorrison/torchcrepe) — primary reference
- [torchcrepe — PyPI](https://pypi.org/project/torchcrepe/)
- [CREPE Paper — ICASSP 2018](https://arxiv.org/pdf/1802.06182)
- [ISMIR 2022 — Violin Etudes & CREPE Fine-Tuning](https://ismir2022program.ismir.net/poster_247.html) — key finding: fine-tune on violin data for best results
- [Viterbi jump constraint problem — ISMIR 2022 Full Paper](https://archives.ismir.net/ismir2022/paper/000062.pdf)

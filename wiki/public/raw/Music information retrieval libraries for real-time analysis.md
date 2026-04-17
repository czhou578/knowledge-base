# Music Information Retrieval Libraries for Real-Time Analysis

[claude.ai](https://claude.ai/chat/73ad6dc8-269c-43ff-b9e9-d4d1786472fc) · Created 2026-04-04


**You**

i want to build a layer for an agentic application that serves as a music consultant: taking in played notes in its ingestion layer. Standard LLMs cannot "hear" pitch or rhythm errors accurately. Your engineer must use dedicated MIR (Music Information Retrieval) libraries for the diagnostic layer. What python libraries are the most popular for real-time rhythm and onset detection, and extracting musical features like timbre and harmonics as of 2026?

---

**Claude**

Great research gathered. Let me now render this as an in-depth reference diagram and explanation.

---

**You**

i want to do this specifically for violin music.

---

**Claude**

Great focus — violin is one of the most demanding instruments to analyze computationally because of its continuous pitch (no frets), expressive techniques like vibrato and portamento, and the way bow pressure/speed affect timbre. Let me refine the stack specifically for violin.

---

**You**

How do I compute cents deviation from equal temperament for violin intonation assessment?

---

**Claude**

Great question — this is the mathematical core of your intonation diagnostic layer. Let me show you the formula, the code, and the violin-specific considerations.

---

**You**

Tell me more about librosa onset and rhythm features for a music agent

---

**Claude**

Good — I now have thorough, current documentation detail. Let me lay this out clearly with a reference diagram and full code.

---

**You**

How should I fine-tune CREPE for violin intonation detection? What are the limitations?

---

**Claude**

Good — I now have everything needed: the architecture details, the Violin Etudes dataset findings, the Viterbi jump constraint issue, and the torchcrepe fine-tuning pathway. Let me write this up comprehensively.

---

**Understanding CREPE's architecture before you touch it**

CREPE's six convolutional layers operate directly on the time-domain audio signal, producing a 360-dimensional output vector. Each of the 360 nodes corresponds to a specific pitch value in cents — bins are spaced at uniform 20-cent intervals covering C1 to B7 (32.70 Hz to 1975.5 Hz). [arXiv](https://arxiv.org/pdf/1802.06182) The final pitch estimate is a weighted average of those bins, which theoretically gives sub-bin resolution — but those 20-cent bins are also the hard floor on what the model can discriminate before post-processing.

This architecture has two structural properties that matter for your fine-tuning strategy:

- The **early convolutional layers** learn waveform features (quasi-periodicity, harmonic structure). These generalize well and need less updating.
- The **final fully-connected classifier** maps those features to the 360-bin pitch distribution. This is where instrument-specific biases live and where fine-tuning does the most work.

---

**The key violin-specific limitations to understand first**

Before writing a line of training code, the research is explicit about what breaks:

The Viterbi implementations of standard F0 estimators are restrictive for violin: pYIN does not allow a jump bigger than 2.5 semitones between consecutive frames, and that number is 2.4 semitones for CREPE. These restrictions are detrimental to violin performance analysis, as it is common to see very fast and abrupt string crossings in violin repertoire. [Ismir](https://archives.ismir.net/ismir2022/paper/000062.pdf)

For the violin, performance is low when the sound in the tested tracks is too high compared to other tracks of the same instrument in training. [arXiv](https://ar5iv.labs.arxiv.org/html/1802.06182) — meaning the upper register (positions IV–VII on the E string) is systematically underrepresented in CREPE's training data.

Existing data-driven F0 estimators may overfit to equal temperament [Ismir](https://ismir2022program.ismir.net/poster_247.html) — a serious problem for violin pedagogy, since trained violinists routinely deviate from 12-TET in favor of Pythagorean or just intonation in ensemble playing. A model biased toward ET will incorrectly flag deliberate expressive deviations as errors.

---

**The recommended dataset: Violin Etudes (ISMIR 2022)**

The Violin Etudes dataset is a 27.8-hour violin performance dataset constructed with domain knowledge in instrument pedagogy and a novel automatic F0-labeling paradigm. CREPE trained on Violin Etudes outperforms the widely-used pre-trained version trained on multiple manually-labeled datasets. [Ismir](https://ismir2022program.ismir.net/poster_247.html)

This is the most important practical finding for your project: **fine-tuning on Violin Etudes is better than using pre-trained CREPE out of the box**, even when testing on datasets the model has never seen. It's available for research purposes and is your primary training data source.

The Constrained Harmonic Resynthesis method used in Violin Etudes simultaneously enhances datasets and F0 estimators by silencing frames that don't satisfy harmonic amplitude constraints — acting as a barrier to wrong F0 estimates during the iterative re-labeling process. [Ismir](https://archives.ismir.net/ismir2022/paper/000062.pdf)

---

**The fine-tuning strategy using `torchcrepe`**

`torchcrepe` is the right vehicle — it's the PyTorch reimplementation that exposes the model internals for gradient updates.

```python
import torch
import torch.nn as nn
import torchcrepe

# Step 1: Load the pre-trained CREPE model
model = torchcrepe.load.model(device='cuda', capacity='full')

# Step 2: Freeze early convolutional layers, unfreeze later ones + classifier
# CREPE has 6 conv blocks + a dense output layer
# Strategy: freeze blocks 0-3, fine-tune blocks 4-5 + dense
for name, param in model.named_parameters():
    # Freeze first 4 conv blocks
    if any(f'layer{i}' in name for i in range(4)):
        param.requires_grad = False
    else:
        param.requires_grad = True  # fine-tune later layers + classifier

# Step 3: Use a low learning rate — pre-trained weights are good,
# we're nudging them toward violin timbre, not retraining from scratch
optimizer = torch.optim.Adam(
    filter(lambda p: p.requires_grad, model.parameters()),
    lr=1e-4,           # 10x lower than typical training LR
    weight_decay=1e-5
)

# Step 4: Loss function — same as original CREPE
# Binary cross-entropy against a Gaussian-smoothed target distribution
# centered on the true F0 bin
def gaussian_target(f0_hz, n_bins=360, fmin=32.70, fmax=1975.5):
    """Create a soft Gaussian label centered on the true F0 bin."""
    cents = 1200 * torch.log2(torch.tensor(f0_hz) / fmin)
    bins = torch.linspace(0, 1200 * torch.log2(torch.tensor(fmax/fmin)), n_bins)
    sigma = 25.0  # cents — determines label softness
    target = torch.exp(-0.5 * ((bins - cents) / sigma) ** 2)
    return target / target.sum()  # normalize to probability distribution

criterion = nn.BCEWithLogitsLoss()
```

**The key parameter decisions:**

- **Freeze depth:** Freeze the first 4 of 6 conv blocks. The early layers have learned waveform periodicity features that transfer perfectly to violin. Only the later layers and classifier need to adapt to violin timbre.
- **Learning rate:** Use 1e-4 or lower. The pre-trained weights are already good — catastrophic forgetting is a real risk at higher learning rates.
- **Label smoothing (Gaussian targets):** CREPE uses soft targets rather than one-hot, with a Gaussian spread of ~25 cents around the true bin. Keep this — it's what allows sub-bin interpolation.

---

**Handling the Viterbi jump constraint problem**

The 2.4-semitone inter-frame jump limit breaks on string crossings. The fix is to **disable Viterbi entirely for passages with high string-crossing density**, and instead use raw argmax or weighted argmax decoding:

```python
import torchcrepe

# For passages you know contain fast string crossings:
pitch, periodicity = torchcrepe.predict(
    audio, sr, hop_length,
    fmin=librosa.note_to_hz('G3'),   # violin range
    fmax=librosa.note_to_hz('E7'),
    model='full',
    decoder=torchcrepe.decode.weighted_argmax,  # no Viterbi jump constraint
    return_periodicity=True
)

# Post-process: median-filter the periodicity, then threshold
periodicity = torchcrepe.filter.median(periodicity, win_length=3)
pitch = torchcrepe.threshold.At(0.4)(pitch, periodicity)  # tune threshold for violin
```

You can detect string-crossing passages automatically by looking for inter-frame F0 jumps > 2 semitones in a preliminary pYIN pass, then switching decoders selectively on those windows.

---

**Upper-register compensation**

CREPE underperforms in the violin's high register (roughly E6 and above, ~1300 Hz). Two practical mitigations:

First, ensure your fine-tuning data includes etudes and exercises in high positions — Kreutzer, Dont, and Rode etudes cover the upper registers extensively. Second, add a register-specific confidence check: if the measured F0 is above ~800 Hz and CREPE's confidence is below 0.6, fall back to pYIN, which handles high-register violin more consistently because its heuristics don't have a register-dependent training bias.

---

**Summary: limitations map**

| Limitation | Severity | Mitigation |
| --- | --- | --- |
| Viterbi jump cap (2.4 semitones) | High — breaks on string crossings | Disable Viterbi; use `weighted_argmax` |
| Equal temperament bias | Medium — flags expressive intonation | Fine-tune on Violin Etudes; widen acceptance threshold to ±20¢ |
| High-register degradation (>E6) | Medium | Blend with pYIN above 800 Hz |
| 20-cent bin floor | Low — sub-bin interp compensates | Use weighted average output, not argmax |
| Silent regions get high confidence | Low | Apply `torchcrepe.threshold.Silence` |
| Monophonic only | Hard constraint | CREPE cannot handle double stops — detect and skip those frames |

The double-stop constraint is the one with no workaround within CREPE: when a violinist plays two strings simultaneously, CREPE will latch onto whichever partial is stronger and give you a meaningless confidence score. Detect double stops first (spectral peak counting or basic-pitch), and exclude those frames from intonation assessment entirely.

---

**You**

start with the ingestion layer, where it detects the violin sounds being played. which python libraries is the easiest? i'm a software engineer with experience building agents but with absolutely no experience building such music applications and doing any kind of advanced audio processing.

---

**Claude**

Good starting point. The ingestion layer is actually the most approachable part of this whole stack — it's mostly I/O, not signal processing. You don't need to understand DSP to get clean audio into your pipeline.

Here's what you need to do at this layer:

1. Capture audio from a microphone in real time (or load a file)
2. Get it into a numpy array at the right sample rate
3. Chunk it into frames your MIR libraries can process

That's it. The MIR libraries handle everything after that.

---

**The two libraries you need**

**`sounddevice`** — microphone capture and playback. Think of it as the `requests` library of audio: it gets audio in and out with minimal ceremony. It wraps PortAudio, works on Mac/Windows/Linux, and gives you numpy arrays directly.

**`soundfile`** — reading/writing audio files (WAV, FLAC, OGG). If your agent accepts uploaded recordings rather than live mic input, this is all you need for ingestion.

```bash
pip install sounddevice soundfile numpy
```

That's the full dependency list for the ingestion layer.

---

**Pattern A — File-based ingestion (easiest to start with)**

If your student uploads a recording, this is the entire ingestion layer:

```python
import soundfile as sf
import numpy as np

def load_recording(path: str, target_sr: int = 44100):
    """
    Load any audio file into a numpy array.
    Returns (audio_array, sample_rate).
    audio_array shape: (n_samples,) for mono, (n_samples, 2) for stereo
    """
    audio, sr = sf.read(path, dtype='float32')

    # Violin recordings are mono — if stereo, mix down
    if audio.ndim == 2:
        audio = audio.mean(axis=1)

    # Most MIR libraries expect 22050 or 44100 Hz
    # soundfile gives you whatever the file was recorded at
    # If it doesn't match, resample (see note below)
    return audio, sr

audio, sr = load_recording("student_performance.wav")
print(f"Loaded {len(audio)/sr:.1f} seconds at {sr} Hz")
# → Loaded 42.3 seconds at 44100 Hz
```

Resampling note: if the file's sample rate doesn't match what your MIR libraries expect, add `pip install resampy` and call `resampy.resample(audio, sr, target_sr)`. librosa does this automatically on load, which is why many people just use `librosa.load()` for file ingestion — it handles format conversion, stereo mixdown, and resampling in one call:

```python
import librosa

audio, sr = librosa.load("student_performance.wav", sr=44100, mono=True)
# sr=44100 → resamples automatically if the file is at a different rate
# mono=True → mixes stereo down automatically
```

---

**Pattern B — Live microphone ingestion**

This is where `sounddevice` shines. The key mental model is a **callback function**: sounddevice calls it every time a new chunk of audio arrives from the mic. You don't poll — you react.

```python
import sounddevice as sd
import numpy as np
import queue

# A thread-safe queue to pass audio chunks from the callback to your agent
audio_queue = queue.Queue()

SAMPLE_RATE = 44100   # Hz — standard for audio quality
CHUNK_DURATION = 0.5  # seconds per chunk fed to your MIR pipeline
CHUNK_SAMPLES = int(SAMPLE_RATE * CHUNK_DURATION)  # = 22050 samples

def audio_callback(indata, frames, time, status):
    """
    sounddevice calls this on a background thread every CHUNK_SAMPLES frames.
    indata shape: (frames, n_channels) — always a numpy array
    """
    if status:
        print(f"Audio status: {status}")  # e.g. input overflow warning

    # Mix to mono and put on the queue for your main thread to consume
    mono = indata[:, 0].copy()  # take left channel (violin is mono)
    audio_queue.put(mono)

def start_listening():
    """Open the default microphone and start streaming."""
    with sd.InputStream(
        samplerate=SAMPLE_RATE,
        channels=1,           # mono — one violin
        dtype='float32',      # values in [-1.0, 1.0]
        blocksize=CHUNK_SAMPLES,
        callback=audio_callback
    ):
        print("Listening... press Ctrl+C to stop")
        while True:
            chunk = audio_queue.get()  # blocks until a chunk is ready
            process_chunk(chunk)       # hand off to your MIR pipeline

def process_chunk(chunk: np.ndarray):
    """
    This is where you hand off to librosa, pYIN, CREPE, etc.
    chunk is a float32 numpy array of shape (22050,) — 0.5 seconds of audio
    """
    print(f"Got chunk: {chunk.shape}, peak amplitude: {np.max(np.abs(chunk)):.3f}")
    # → your MIR pipeline goes here
```

---

**The chunk size decision**

This is the one tuning knob that matters at this layer. It's a tradeoff:

| Chunk size | Latency | MIR quality | Good for |
| --- | --- | --- | --- |
| 0.1s | Very low | Poor — too short for pitch/vibrato | Real-time tuner needle |
| 0.5s | Low | Good — captures vibrato cycles | Live coaching feedback |
| 2–5s | Medium | Best — full phrases | Post-phrase analysis |
| Full file | None | Best | Uploaded recordings |

For a violin coaching agent, 0.5–1.0 seconds is the practical sweet spot. Vibrato runs at 3–8 Hz, so you need at least 0.25s to see even one cycle. Intonation assessment needs enough note to be confident the pitch has settled after the attack.

---

**Detecting whether the violin is actually playing**

You don't want to run your MIR pipeline on silence. A simple RMS energy gate is all you need here — no ML required:

```python
def is_playing(chunk: np.ndarray, threshold_db: float = -40.0) -> bool:
    """
    Returns True if the chunk contains actual violin sound, not silence/noise.
    threshold_db: anything quieter than this is treated as silence.
    -40 dB is a reasonable floor for a decent microphone in a quiet room.
    """
    rms = np.sqrt(np.mean(chunk ** 2))
    if rms == 0:
        return False
    db = 20 * np.log10(rms)
    return db > threshold_db

def process_chunk(chunk: np.ndarray):
    if not is_playing(chunk):
        return  # skip silence — don't waste MIR compute
    # ... rest of pipeline
```

---

**Putting it together: a minimal ingestion layer class**

```python
import sounddevice as sd
import soundfile as sf
import librosa
import numpy as np
import queue
import threading
from typing import Callable

class ViolinIngestion:
    """
    Thin ingestion layer — gets audio into numpy arrays.
    Accepts either a file path or a live microphone stream.
    Calls \`on_chunk(audio: np.ndarray, sr: int)\` for each ready chunk.
    """

    SAMPLE_RATE = 44100
    SILENCE_THRESHOLD_DB = -40.0

    def __init__(self, on_chunk: Callable, chunk_duration: float = 0.5):
        self.on_chunk = on_chunk
        self.chunk_samples = int(self.SAMPLE_RATE * chunk_duration)
        self._queue: queue.Queue = queue.Queue()

    def from_file(self, path: str):
        """Process a recorded file, calling on_chunk for each segment."""
        audio, _ = librosa.load(path, sr=self.SAMPLE_RATE, mono=True)
        for start in range(0, len(audio), self.chunk_samples):
            chunk = audio[start:start + self.chunk_samples]
            if len(chunk) < self.chunk_samples:
                break  # drop incomplete final chunk
            if self._is_playing(chunk):
                self.on_chunk(chunk, self.SAMPLE_RATE)

    def from_microphone(self):
        """Block and stream from the default mic until KeyboardInterrupt."""
        def _callback(indata, frames, time, status):
            self._queue.put(indata[:, 0].copy())

        with sd.InputStream(
            samplerate=self.SAMPLE_RATE,
            channels=1,
            dtype='float32',
            blocksize=self.chunk_samples,
            callback=_callback
        ):
            print(f"Listening at {self.SAMPLE_RATE} Hz...")
            try:
                while True:
                    chunk = self._queue.get()
                    if self._is_playing(chunk):
                        self.on_chunk(chunk, self.SAMPLE_RATE)
            except KeyboardInterrupt:
                print("Stopped.")

    def _is_playing(self, chunk: np.ndarray) -> bool:
        rms = np.sqrt(np.mean(chunk ** 2))
        if rms == 0:
            return False
        return 20 * np.log10(rms) > self.SILENCE_THRESHOLD_DB

# Usage — plugs directly into your MIR pipeline:
def my_mir_pipeline(chunk: np.ndarray, sr: int):
    print(f"Processing {len(chunk)/sr:.2f}s of violin audio")
    # → librosa.pyin(chunk, ...) goes here

ingestion = ViolinIngestion(on_chunk=my_mir_pipeline, chunk_duration=0.5)

# For a file:
ingestion.from_file("student.wav")

# For live mic:
# ingestion.from_microphone()
```

---

**What to test first**

Before hooking up any MIR code, verify your ingestion layer works in isolation:

```python
# Test 1: can you record and play back?
import sounddevice as sd
import soundfile as sf

duration = 3  # seconds
print("Recording...")
audio = sd.rec(int(duration * 44100), samplerate=44100, channels=1, dtype='float32')
sd.wait()
sf.write("test.wav", audio, 44100)
print("Saved test.wav — play it back to verify quality")

# Test 2: check your microphone is picking up violin frequencies
import numpy as np
rms = np.sqrt(np.mean(audio ** 2))
print(f"RMS level: {20 * np.log10(rms + 1e-10):.1f} dB")
# Should be somewhere above -40 dB when the violin is playing
```

Once `test.wav` sounds clean and the RMS reading is sensible, your ingestion layer is done and you can move on to wiring in pYIN for pitch detection.

---

## References

Links cited by Claude in the research process for this conversation:

- [CREPE: A Convolutional Representation for Pitch Estimation (arXiv paper)](https://arxiv.org/pdf/1802.06182) — Original CREPE architecture paper. 360-bin pitch output, 20-cent intervals, C1–B7 range.
- [CREPE on ar5iv (rendered HTML)](https://ar5iv.labs.arxiv.org/html/1802.06182) — HTML rendering of the arXiv paper, notes on upper-register violin performance degradation.
- [Violin Etudes Dataset & CREPE Fine-Tuning — ISMIR 2022 Poster](https://ismir2022program.ismir.net/poster_247.html) — Key finding: fine-tuning CREPE on Violin Etudes outperforms pre-trained CREPE out of the box. Also covers equal-temperament overfitting bias.
- [Constrained Harmonic Resynthesis for F0 Estimation — ISMIR 2022 Full Paper](https://archives.ismir.net/ismir2022/paper/000062.pdf) — Details on the Viterbi jump constraint problem (2.4 semitones for CREPE, 2.5 for pYIN) and the Constrained Harmonic Resynthesis labeling method used in Violin Etudes.
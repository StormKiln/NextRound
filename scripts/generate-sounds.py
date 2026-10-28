"""Generate original, offline PCM sound cues; no samples or external licenses."""
import math
from pathlib import Path
import struct
import wave

# Cues must cut through music: bright 0.9–2.6 kHz fundamentals with added harmonics,
# fast attacks and near full-scale peaks. Distinct pitch contours keep each cue recognizable.
RATE = 44100
PEAK = 0.9 * 32767
HARMONICS = [(1, 1), (2, 0.35), (3, 0.25)]
ROOT = Path(__file__).resolve().parents[1] / 'apps/nextround/sounds'
ROOT.mkdir(parents=True, exist_ok=True)
for name, notes in {
    'tock': [(1760, .07)],
    'beep': [(1980, .12), (1980, .22)],
    'rest': [(1320, .16), (880, .28)],
    'complete': [(1320, .16), (1760, .16), (2640, .45)],
    'done': [(2640, .06), (2640, .06), (2640, .06)],
}.items():
    samples = []
    for frequency, duration in notes:
        count = int(RATE * duration)
        for i in range(count):
            envelope = min(1, i / 88, (count - i) / 660)
            samples.append(envelope * sum(
                weight * math.sin(2 * math.pi * frequency * harmonic * i / RATE)
                for harmonic, weight in HARMONICS
            ))
        samples.extend([0] * int(RATE * .05))
    scale = PEAK / max(abs(sample) for sample in samples)
    with wave.open(str(ROOT / f'{name}.wav'), 'wb') as output:
        output.setparams((1, 2, RATE, 0, 'NONE', 'not compressed'))
        output.writeframes(struct.pack(f'<{len(samples)}h', *(round(s * scale) for s in samples)))

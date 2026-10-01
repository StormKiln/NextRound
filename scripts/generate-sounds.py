"""Generate original, offline PCM sound cues; no samples or external licenses."""
import math
from pathlib import Path
import struct
import wave

ROOT = Path(__file__).resolve().parents[1] / 'apps/nextround/sounds'
ROOT.mkdir(parents=True, exist_ok=True)
for name, notes in {
    'tock': [(700, .055)],
    'rest': [(550, .15), (440, .2)],
    'beep': [(1000, .22)],
    'complete': [(660, .18), (880, .18), (1320, .4)],
}.items():
    samples = []
    for frequency, duration in notes:
        count = int(44100 * duration)
        for i in range(count):
            envelope = min(1, i / 220, (count - i) / 440)
            samples.append(int(12000 * envelope * math.sin(2 * math.pi * frequency * i / 44100)))
        samples.extend([0] * 2205)
    with wave.open(str(ROOT / f'{name}.wav'), 'wb') as output:
        output.setparams((1, 2, 44100, 0, 'NONE', 'not compressed'))
        output.writeframes(struct.pack(f'<{len(samples)}h', *samples))

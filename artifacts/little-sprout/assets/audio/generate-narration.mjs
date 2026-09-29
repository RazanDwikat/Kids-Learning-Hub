// Offline-only build script. Run from a temporary Node project containing kokoro-js.
// Example: cp this file /tmp/sprout-audio/generate-narration.mjs &&
//          cd /tmp/sprout-audio && node generate-narration.mjs /home/runner/workspace/artifacts/little-sprout/assets/audio
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { KokoroTTS } from "kokoro-js";
import { env } from "@huggingface/transformers";

const RATE = 24000;
const GAP = Math.round(RATE * 0.46);
const OUT = process.argv[2];
if (!OUT) throw new Error("Pass the output audio directory as the first argument");

// Keep downloaded model weights outside the project and outside version control.
env.cacheDir = "/tmp/sprout-kokoro-cache";
const tts = await KokoroTTS.from_pretrained("onnx-community/Kokoro-82M-v1.0-ONNX", {
  dtype: "q8",
  device: "cpu",
});

const scripts = {
  story: [
    ["meet", "Meet our little bunny in the apple orchard."],
    ["two", "Bunny has two shiny red apples."],
    ["look", "Look at those lovely apples!"],
    ["mother", "Here comes Bunny's mother with a smile."],
    ["give", "She gives Bunny two more apples."],
    ["together", "Let's put all the apples together."],
    ["count1", "One."],
    ["count2", "Two."],
    ["count3", "Three."],
    ["count4", "Four!"],
    ["equation", "Two plus two equals four."],
    ["happy", "Bunny is so happy with four apples!"],
    ["celebrate", "Hooray! We did it together!"],
  ],
  groups: [
    ["intro", "Let's add apples with our bunny friend."],
    ["two", "Here are two apples. Look at them!"],
    ["more", "Here come two more apples."],
    ["together", "Now let's put both groups together."],
    ["count1", "One."],
    ["count2", "Two."],
    ["count3", "Three."],
    ["count4", "Four!"],
    ["equation", "Two plus two equals four apples."],
    ["celebrate", "Wonderful counting! Give yourself a cheer!"],
  ],
};

function makeWav(samples) {
  const wav = Buffer.alloc(44 + samples.length * 2);
  wav.write("RIFF", 0);
  wav.writeUInt32LE(wav.length - 8, 4);
  wav.write("WAVEfmt ", 8);
  wav.writeUInt32LE(16, 16);
  wav.writeUInt16LE(1, 20); // PCM
  wav.writeUInt16LE(1, 22); // mono
  wav.writeUInt32LE(RATE, 24);
  wav.writeUInt32LE(RATE * 2, 28);
  wav.writeUInt16LE(2, 32);
  wav.writeUInt16LE(16, 34);
  wav.write("data", 36);
  wav.writeUInt32LE(samples.length * 2, 40);
  for (let i = 0; i < samples.length; i++) {
    const value = Math.max(-1, Math.min(1, samples[i]));
    wav.writeInt16LE(Math.round(value * (value < 0 ? 32768 : 32767)), 44 + i * 2);
  }
  return wav;
}

await mkdir(OUT, { recursive: true });
const manifest = {};
for (const [scene, lines] of Object.entries(scripts)) {
  const samples = [];
  const beats = [];
  for (const [key, text] of lines) {
    const start = samples.length / RATE;
    const audio = await tts.generate(text, { voice: "af_heart", speed: 0.85 });
    if (audio.sampling_rate !== RATE) throw new Error(`Unexpected sample rate: ${audio.sampling_rate}`);
    const segment = audio.audio;
    if (!segment?.length || !segment.some((x) => Math.abs(x) > 0.005)) {
      throw new Error(`Empty or silent narration: ${scene}/${key}`);
    }
    for (const value of segment) samples.push(value);
    const end = samples.length / RATE;
    beats.push({ key, start, end, text });
    // A gentle pause after each spoken phrase allows the illustration to move.
    for (let i = 0; i < GAP; i++) samples.push(0);
    console.log(`${scene}/${key}: ${start.toFixed(2)}–${end.toFixed(2)} s`);
  }
  const duration = samples.length / RATE;
  await writeFile(path.join(OUT, `${scene}.wav`), makeWav(samples));
  manifest[scene] = { duration, beats };
  console.log(`${scene}: ${duration.toFixed(2)} s`);
}
await writeFile(path.join(OUT, "narration.json"), JSON.stringify(manifest, null, 2) + "\n");
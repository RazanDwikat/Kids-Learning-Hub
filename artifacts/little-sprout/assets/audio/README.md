# Addition scene narration

`story.wav` and `groups.wav` are original English narration synthesized locally with **Kokoro v1.0**, voice **af_heart**, at **0.85 speaking speed**. They are mono 24,000 Hz, 16-bit PCM. `narration.json` records the seconds of actual speech for each beat; a 0.46-second silent transition follows each beat, including the last. Beat start and end times are measured from the beginning of each respective WAV.

## Source and attribution

- Model and voice: [hexgrad/Kokoro-82M](https://huggingface.co/hexgrad/Kokoro-82M), converted to [onnx-community/Kokoro-82M-v1.0-ONNX](https://huggingface.co/onnx-community/Kokoro-82M-v1.0-ONNX). Both model cards declare **Apache License 2.0**. [Kokoro source license](https://github.com/hexgrad/kokoro/blob/main/LICENSE); [Apache License 2.0](https://www.apache.org/licenses/LICENSE-2.0).
- Local synthesis: [kokoro-js](https://github.com/hexgrad/kokoro) v1.2.1, Apache-2.0. No ElevenLabs service or audio was used.
- The Kokoro model card credits [Koniwa](https://github.com/koniwa/koniwa) (CC BY 3.0) and [SIWIS](https://datashare.ed.ac.uk/handle/10283/2353) (CC BY 4.0) among its training audio; attribution retained here. Scripts for these two scenes are original.

## Rebuild offline assets

Use a separate temporary Node project rather than adding synthesis dependencies or model weights to the app. Install `kokoro-js@1.2.1` into that temporary project, copy `generate-narration.mjs` there, then run it with an absolute path to this directory:

```sh
mkdir -p /tmp/sprout-audio
cd /tmp/sprout-audio
npm init -y
npm install kokoro-js@1.2.1
cp /absolute/path/to/artifacts/little-sprout/assets/audio/generate-narration.mjs .
node generate-narration.mjs /absolute/path/to/artifacts/little-sprout/assets/audio
```

The first run fetches the ONNX model into `/tmp/sprout-kokoro-cache` and the installed package supplies the af_heart voice; subsequent inference runs locally. Neither weights nor dependencies belong in the packaged app. Running the script overwrites only the two WAVs and their timing JSON.
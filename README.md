# google-speech-synth-stream
A simple node.js readable stream that permits to stream audio from google Text-to-Speech

## Installation
```
npm i google-speech-synth-stream
```

## Usage

Sample code can be seen [here](https://github.com/MayamaTakeshi/google-speech-synth-stream/tree/main/examples)

You need to set your GOOGLE_APPLICATION_CREDENTIALS before trying them:

```
export GOOGLE_APPLICATION_CREDENTIALS=/path/to/your/credentials/file

```

After that, try:
```
node examples/pipe_to_speaker.js

```

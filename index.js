const wav = require("wav");
const textToSpeech = require("@google-cloud/text-to-speech");
const fs = require("fs");
const util = require("util");
const uuid = require('uuid');

const pushSilence = require('./silence.js')

const stream = require("stream");

const { Readable } = require("stream");

const { EventEmitter } = require("events");

const AudioFormats = {
  1: "LINEAR16",
  6: "ALAW",
  7: "MULAW",
};

class GssStream extends Readable {
  constructor(opts) {
    super();

    this.uuid = opts.uuid ? opts.uuid : uuid.v4();

    this.format = opts.format;

    this.eventEmitter = new EventEmitter();

    this.config = opts.config
  }

  async speak(params) {
    const client = new textToSpeech.TextToSpeechClient();

    const audioEncoding = AudioFormats[this.format.audioFormat];
    if(!audioEncoding) {
      setTimeout(() => {
        this.eventEmitter.emit('error', 'unsupported_audio_format')
      }, 0)
      return
    }

    this.outputFile = `${this.config.work_dir}/gsss-${this.uuid}.wav`;

    const request = {
      input:
        params.headers["content-type"] == "application/ssml+xml"
          ? { ssml: params.body }
          : { text: params.body },
      voice: {
        languageCode: params.headers["speech-language"],
        name: params.headers["voice-name"],
      },
      audioConfig: {
        audioEncoding,
        sampleRateHertz: this.format.sampleRate,
      },
    };

    // Performs the text-to-speech request
    const [response] = await client.synthesizeSpeech(request);
    // Write the binary audio content to a local file
    const writeFile = util.promisify(fs.writeFile);
    await writeFile(this.outputFile, response.audioContent, 'binary');

    const file = fs.createReadStream(this.outputFile)

    const reader = new wav.Reader()

    file.pipe(reader)

    reader.on('format', format => {
      console.log('reader format')
      this.read_stream = reader           
      this.eventEmitter.emit('ready')
    })

    file.on('end', () => {
      console.log('file end')

      console.log("unlinking", this.outputFile)
      fs.unlink(this.outputFile, err => {
        console.log("fs.unlink cb", err)
      })

      this.outputFile = null
    })
  }

  on(evt, cb) {
    super.on(evt, cb);

    this.eventEmitter.on(evt, cb);
  }

  _read(size) {
    console.log("_read", size)
    if(!this.read_stream) {
      console.log("call pushSilence")
      pushSilence(this.format, this, 320)
      return
    }
    const data = this.read_stream.read(size)
    console.log("_read got", data)
    if(data) {
      this.push(data)
    } else {
      //end of stream
      this.read_stream =null
      pushSilence(this.format, this, 320)
    }
  }
}

module.exports = GssStream;

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
    console.log("p1")
    const [response] = await client.synthesizeSpeech(request);
    console.log("p2")
    // Write the binary audio content to a local file
    const writeFile = util.promisify(fs.writeFile);
    console.log("p3")
    await writeFile(this.outputFile, response.audioContent, 'binary');
    console.log("p4")

    const file = fs.createReadStream(this.outputFile)
    console.log("p5")

    const reader = new wav.Reader()

    file.pipe(reader)

    reader.on('format', format => {
      this.read_stream = reader           
      this.speak_complete_notified = false
      this.eventEmitter.emit('ready')
    })

    reader.on('end', () => {
      this.read_stream = null
    })
    console.log("p6")
  }

  on(evt, cb) {
    super.on(evt, cb);

    this.eventEmitter.on(evt, cb);
  }

  _read(size) {
    console.log("_read", size)
    if(!this.read_stream) {
      if(!this.speak_complete_notified) {
        this.eventEmitter.emit('speak_complete')
        this.speak_complete_notified = true
      }
      pushSilence(this.format, this, 640)
      return
    }
    const data = this.read_stream.read(size)
    if(data) {
      this.push(data)
    }
  }

  _destroy(err, cb) {
    console.log("_destroy")
    if(this.outputFile) {
      console.log("unlinking", this.outputFile)
      fs.unlink(this.outputFile, err => {
        console.log("fs.unlink cb", err)
      })
    }
  }
}

module.exports = GssStream;

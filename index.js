const wav = require("wav");
const textToSpeech = require("@google-cloud/text-to-speech");
const fs = require("fs");
const util = require("util");
const uuid = require('uuid');

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

    this.params = opts.params

    this.readStream = null
    this.outputFile = null

    if(this.params) {
      this.speak()
    }
  }

  async speak(params) {
    if(this.readStream) {
      this.readStream.close()
      this.readStream = null
    }

    if(!params) {
      params = this.params
    }

    const client = new textToSpeech.TextToSpeechClient();

    const audioEncoding = AudioFormats[this.format.audioFormat];
    if(!audioEncoding) {
      setTimeout(() => {
        this.eventEmitter.emit('error', 'unsupported_audio_format')
      }, 0)
      return
    }

    this.outputFile = `${this.config.work_dir}/gsss-${this.uuid}.wav`;
    console.log(this.outputFile)

    var request

    if(typeof params == 'string') {
      request = {
        input: params.startsWith('<speak>') ? { ssml: params } : { text: params },
        voice: {
          languageCode: this.params.language,
          name: this.params.voice,
        },
      }
    } else {
      request = {
        input:
          (params["content-type"] == "application/ssml+xml" || params.text.startsWith('<speak>'))
            ? { ssml: params.text }
            : { text: params.text },
        voice: {
          languageCode: params.language,
          name: params.voice,
        },
      }
    }

    request.audioConfig = {
      audioEncoding,
      sampleRateHertz: this.format.sampleRate,
    }

    // Performs the text-to-speech request
    const [response] = await client.synthesizeSpeech(request);

    await client.close()

    // Write the binary audio content to a local file
    const writeFile = util.promisify(fs.writeFile);
    await writeFile(this.outputFile, response.audioContent, 'binary');

    const file = fs.createReadStream(this.outputFile)

    const reader = new wav.Reader()

    file.pipe(reader)

    reader.on('format', format => {
      //console.log('reader format', format)
      this.readStream = reader           
      this.eventEmitter.emit('ready')
      this.eventEmitter.emit('data', Buffer.alloc(0)) // necessary for piping
    })

    file.on('end', () => {
      //console.log('file end')

      //console.log("unlinking", this.outputFile)
      if(this.outputFile) {
        fs.unlink(this.outputFile, err => {
          //console.log("fs.unlink cb", err)
        })

        this.outputFile = null
      }
    })
  }

  on(evt, cb) {
    super.on(evt, cb);

    this.eventEmitter.on(evt, cb);
  }

  _read(size) {
    //console.log("_read", size)
    // by default size is 16384
    // however this large value causes wav FileWriter (https://www.npmjs.com/package/wav) to unpipe before reading all data from the readable stream
    // so we will use a smaller value
 
    if(!this.readStream) {
      console.log("not readStream", size)
      this.push(Buffer.alloc(0))
      return
    }

    const sz = 4096

    const data = this.readStream.read(sz)
    //console.log("_read got", data)
    if(data) {
      this.push(data)
    } else {
      //this.push(Buffer.alloc(0))
      this.push(null)
    }
  }

  destroy(err) {
    // Perform cleanup tasks here
    console.log('gss stream is being destroyed')
    if(this.outputFile) {
      fs.unlink(this.outputFile, err => {})
      this.outputFile = null
    }
    
    super.destroy(err)
  }
}

module.exports = GssStream;

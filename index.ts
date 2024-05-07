const wav = require("wav")
const textToSpeech = require("@google-cloud/text-to-speech")
const fs = require("fs")
const util = require("util")
const uuid = require('uuid')

const stream = require("stream")

const { Readable } = require("stream")

const { EventEmitter } = require("events")

const audioFormat2audioEncoding = (af: number) => {
  switch(af) {
  case 1: return "LINEAR16"
  case 6: return "ALAW"
  case 7: return "MULAW"
  default: return ""
  }
}

type Format = {
  audioFormat: number,
  sampleRate: number,
  channels: number,
  bitDepth: number,
}

type Params = {
  language: string,
  voice: string,
  text: string,
}

type Config = Record<string, unknown>

type Opts = {
  uuid?: string,
  format: Format,
  params: Params,
  config: Config,
}

type State = {
  uuid: string,
  format: Format,
  params: Params,
  config: Config,
  readStream: any,
  outputFile: string,
  eventEmitter: any,
  readReady: boolean,
}

enum ActionType {
  START_SYNTH,
  SHUTDOWN,
  ENABLE_READ,
}

type Action = {
  tp: ActionType,
  payload?: any,
}

type EventCallback = (...args: any[]) => void

const add_evt_listeners = (evtEmitter: any, listeners: Array<[string, EventCallback]>) => {
  evtEmitter.my_listeners = evtEmitter.my_listeners ?? []

  listeners.forEach(([evt_name, evt_cb]) => {
    evtEmitter.on(evt_name, evt_cb)
    evtEmitter.my_listeners.push([evt_name, evt_cb])
  })
}

const remove_evt_listeners = (evtEmitter: any) => {
  evtEmitter.my_listeners.forEach((listener: [string, EventCallback]) => {
    const [evt_name, evt_cb] = listener
    evtEmitter.removeListener(evt_name, evt_cb)
  })

  evtEmitter.my_listeners = []
}

const update = (state: State, action: Action) : State => {
  switch(action.tp) {
  case ActionType.START_SYNTH: {
    var readStream = state.readStream

    if(readStream) {
      readStream.close()
      readStream = null
    }

    const client = new textToSpeech.TextToSpeechClient();

    const audioEncoding = audioFormat2audioEncoding(state.format.audioFormat);
    if(!audioEncoding) {
      setTimeout(() => {
        state.eventEmitter.emit('error', 'unsupported_audio_format')
      }, 0)
      return {
        ...state,
        readStream,
      }
    }

    var outputFile = `${state.config.work_dir}/gsss-${state.uuid}.wav`;

    var params: Params = state.params

    var request = {
      input:
        params.text.startsWith('<speak>')
          ? { ssml: params.text }
          : { text: params.text },
      voice: {
        languageCode: params.language,
        name: params.voice,
      },
      audioConfig: {
        audioEncoding,
        sampleRateHertz: state.format.sampleRate,
      }
    }

    // Performs the text-to-speech request
    client.synthesizeSpeech(request)
    .then(([response]: any) => {
      client.close()

      // Write the binary audio content to a local file
      fs.writeFile(outputFile, response.audioContent, 'binary', (err: any) => {
        if(err) {
          state.eventEmitter.emit('error', err)
        }

        const file = fs.createReadStream(outputFile)

        const newReadStream = new wav.Reader()

        file.pipe(newReadStream)

        const on_format = (format: any) => {
          console.log("format", format) 
          state.eventEmitter.emit('readStreamReady', newReadStream)
        }
        
        add_evt_listeners(newReadStream, [
          ["format", on_format]
        ])
      })
    })
    .catch((err: any) => {
      state.eventEmitter.emit('error', err) 
    })

    return {
      ...state,
      outputFile,
      readStream,
    }

  }
  case ActionType.ENABLE_READ: {
    state.eventEmitter.emit('ready')
    return {
      ...state,
      readStream: action.payload
    }
  }
  case ActionType.SHUTDOWN: {
    if(state.outputFile) {
      fs.unlink(state.outputFile, (err: any) => {})
    }
    return {
      ...state,
      outputFile: ""
    }
  }
  }
}

class GoogleSpeechSynthStream extends Readable {
  eventEmitter: any
  state: State
  readStream: any

  constructor(opts: Opts) {
    super();

    this.state = {
      uuid: opts.uuid ? opts.uuid : uuid.v4(),
      format: opts.format,
      params: opts.params,
      config: opts.config,
      eventEmitter: new EventEmitter(),
      outputFile: "",
      readStream: null,
      readReady: false,
    }

    this.state.eventEmitter.on('readStreamReady', (readStream: any) => {
      this.state = update(this.state, {tp: ActionType.ENABLE_READ, payload: readStream})
    })

    if(this.state.params) {
      this.state = update(this.state, {tp: ActionType.START_SYNTH})
    }
  }

  on(evt: string , cb: EventCallback) {
    super.on(evt, cb);

    this.state.eventEmitter.on(evt, cb);
  }

  _read(size: number) {
    //console.log("_read", size)
    // by default size is 16384
    // however this large value causes wav FileWriter (https://www.npmjs.com/package/wav) to unpipe before reading all data from the readable stream
    // so we will use a smaller value
 
    if(!this.state.readStream) {
      //console.log("readStream not ready", size)
      this.push(Buffer.alloc(0))
      return
    }

    const sz = 4096

    const data = this.state.readStream.read(sz)
    //console.log(`readStream.read(${sz}) got`, data)
    if(data) {
      this.push(data)
    } else {
      this.push(null)
    }
  }

  destroy(err: any) {
    console.log('gss stream is being destroyed')
    this.state = update(this.state, {tp: ActionType.SHUTDOWN})
   
    super.destroy(err)
  }
}

module.exports = GoogleSpeechSynthStream;

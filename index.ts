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
  times?: number,
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
  times: number,
}

enum ActionType {
  START_SYNTH,
  CREATE_READ_STREAM,
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
  console.log("update", action.tp)
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
        } else {
          state.eventEmitter.emit('fileReady')
        }
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
  case ActionType.CREATE_READ_STREAM: {
    var readStream = state.readStream
    if(readStream) {
      remove_evt_listeners(readStream)
    }

    const file = fs.createReadStream(state.outputFile)

    readStream = new wav.Reader()

    file.pipe(readStream)

    const on_format = (format: any) => {
      console.log("format", format) 
      state.eventEmitter.emit('readStreamReady', readStream)
    }
    
    add_evt_listeners(readStream, [
      ["format", on_format]
    ])

    return {
      ...state,
      readStream: null,
    }
  }
  case ActionType.ENABLE_READ: {
    //console.log("emitting initial data")
    // we need to send some data because when we don't have data to push in _read(size) we just do nothing and this will 
    // prevent further calls to _read(size) till we push something again.
    state.eventEmitter.emit('data', Buffer.alloc(0)) 
    return {
      ...state,
      readStream: action.payload
    }
  }
  case ActionType.SHUTDOWN: {
    if(state.outputFile) {
      fs.unlink(state.outputFile, (err: any) => {})
    }
    if(readStream) {
      remove_evt_listeners(state.readStream)
      readStream = null
    }
 
    return {
      ...state,
      outputFile: "",
      readStream,
    }
  }
  }
}

class GoogleSpeechSynthStream extends Readable {
  state: State

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
      times: opts.params.times ? opts.params.times : 1
    }

    console.log("state", this.state)

    this.state.eventEmitter.on('fileReady', () => {
      this.state = update(this.state, {tp: ActionType.CREATE_READ_STREAM})
    })

    this.state.eventEmitter.on('readStreamReady', (readStream: any) => {
      console.log('readStreamReady')
      this.state = update(this.state, {tp: ActionType.ENABLE_READ, payload: readStream})
      // push data to restart calls to _read(size)
      this.push(Buffer.alloc(0))
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
      return
    }

    const sz = 4096

    const data = this.state.readStream.read(sz)
    //console.log(`readStream.read(${sz}) got`, data)
    if(data) {
      this.push(data)
    } else {
      this.state.times--
      //console.log("state.times", this.state.times)
      if(this.state.times > 0) {
        this.state = update(this.state, {tp: ActionType.CREATE_READ_STREAM})
      } else {
        this.push(null)
      }
    }
  }

  destroy(err: any) {
    console.log('gss stream is being destroyed')
    this.state = update(this.state, {tp: ActionType.SHUTDOWN})
   
    super.destroy(err)
  }
}

module.exports = GoogleSpeechSynthStream;

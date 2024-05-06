const fs = require('fs')
const wav = require('wav')
const FileWriter = require('wav').FileWriter
const GSSS = require('../index.js')

const usage = () => {
  console.log(`
Arguments: output_wav_file
Ex:        test.wav
`)
}


if (process.argv.length != 3) {
  usage()
  process.exit(1)
}

output_wav_file = process.argv[2]

const format = {
  audioFormat: 1,
  endianness: 'LE',
  channels: 1,
  sampleRate: 16000,
  byteRate: 16000,
  blockAlign: 2,
  bitDepth: 16,
  signed: true
}

const config = {
	work_dir: './tmp',
}

const params = {
	body: 'How are you?',
	headers: {
		'speech-language': 'en-US',
		'voice-name': 'en-US-Standard-G',
	},
}

const opts = {
  format,
  config,
  params,
}

const gs = new GSSS(opts)

gs.on('ready', () => {
  console.log('gs ready')

  const ws = new FileWriter(output_wav_file, format)

  const evs = ['pipe', 'unpipe', 'finish', 'close', 'drain', 'error']
  evs.forEach(ev => {
    ws.on(ev, data => {
      console.log(`ws on ${ev}`)
    })
  })

  gs.pipe(ws)
})


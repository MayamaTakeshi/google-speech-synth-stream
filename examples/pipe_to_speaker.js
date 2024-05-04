const Speaker = require('speaker')
const GSSS = require('../index.js')
const silence = require('../silence.js')

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

const params = {
	body: 'hello world',
	headers: {
		'speech-language': 'en-US',
		'voice-name': 'en-US-Standard-G',
	},
}

const config = {
	work_dir: './tmp',
}

const opts = {
  format,
  config,
}

const gs = new GSSS(opts)
gs.on('speak_complete', () => {
	console.log('gs speak_complete')
})
gs.on('error', err => {
	console.log('gs error', err)
})
gs.on('end', () => {
	console.log('gs end')
})
gs.speak(params)

const speaker = new Speaker(format)

gs.pipe(speaker)

setTimeout(() => {
  console.log('done')
}, 2000)

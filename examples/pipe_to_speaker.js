const Speaker = require('speaker')
const GSSS = require('../index.js')

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

const opts = {
  format,
  config,
}

const gs = new GSSS(opts)
gs.speak({
	body: 'hello world',
	headers: {
		'speech-language': 'en-US',
		'voice-name': 'en-US-Standard-G',
	},
})

gs.on('ready', () => {
  const speaker = new Speaker(format)
  gs.pipe(speaker)
})

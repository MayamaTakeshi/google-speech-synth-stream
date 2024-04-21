const Speaker = require('speaker')
const GSSS = require('../index.js')

const format = {
  audioFormat: 1,
  endianness: 'LE',
  channels: 1,
  sampleRate: 8000,
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
gs.speak(params) // this first speak gets raspy

const speaker = new Speaker(format)

gs.on('ready', () => {
	console.log('ready p1')

	setInterval(() => {
		const data = gs.read(320)
		console.log('read data', data)
		if(data) {
			speaker.write(data)
		}
	}, 20)
	console.log('ready p2')
})

// these two speak are clean. Why?
setTimeout(() => {
	console.log('done')
	gs.speak(params)
}, 2000)

setTimeout(() => {
	console.log('done')
	gs.speak(params)
}, 3500)

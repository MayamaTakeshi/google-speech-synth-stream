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
	console.log('speak_complete')
})
gs.on('error', err => {
	console.log('error', err)
})
gs.speak(params)

const speaker = new Speaker(format)

gs.on('ready', () => {
	console.log('ready')
	//gs.pipe(speaker)

	setInterval(() => {
		const data = gs.read(640)
		console.log(data)
		if(data) {
		  //console.log(data)
		  speaker.write(data)
		}
	}, 20)

	setTimeout(() => {
		console.log('done')
		gs.destroy()
	        setTimeout(() => {
			process.exit(0)
		}, 500)
	}, 2000)
})


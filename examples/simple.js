const Speaker = require('speaker')
const GSSS = require('../index.js')
const silence = require('../silence.js')
const wav = require('wav')
const fs = require('fs')

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
gs.speak(params) // this first speak gets raspy

const speaker = new Speaker(format)

const writer = new wav.Writer(format)

const outputFile = "a.wav"
const fileStream = fs.createWriteStream(outputFile);

// Pipe the WAV writer to the file stream
writer.pipe(fileStream);

//gs.on('ready', () => {
//	console.log('ready p1')

const read_write = () => {
		const size = 320 * format.sampleRate/8000
		var data = gs.read(size)
		console.log('read data got', data)
		if(data) {
		  console.log("writing data")
			speaker.write(data)
			writer.write(data)
		} else {
      console.log("writing silence", size)
      data = silence.gen(format, size)
   	  speaker.write(data)
     	writer.write(data)
		}
}
//	console.log('ready p2')
//})
//console.log("first read_write()")
//read_write()

setInterval(() => {
  read_write()
}, 20)

setTimeout(() => {
	console.log('done')
	gs.speak(params)
}, 2000)

setTimeout(() => {
	console.log('done')
	gs.speak(params)
}, 3500)

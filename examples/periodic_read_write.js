const Speaker = require('speaker')
const GSSS = require('../index.js')
const wav = require('wav')
const fs = require('fs')

function gen_silence(format, size) {
  var silence = null

  if(format.audioFormat == 6) {
    if(format.signed) {
      silence = Buffer.alloc(size, 0x55); // ALAW silence value signed
    } else {
      silence = Buffer.alloc(size, 0xD5); // ALAW silence value unsigned
    }
  } else if(format.audioFormat == 7) {
    silence = Buffer.alloc(size, 0xFF); // MULAW silence value
  } else {
    // assume L16
    silence = Buffer.alloc(size, 0);
  }
  return silence;
}

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

var started = false

const read_write = () => {
		const size = 320 * format.sampleRate/8000
		var data = gs.read(size)
		console.log('read data got', data)
		if(data) {
		  console.log("writing data")
			speaker.write(data)
			writer.write(data)
      started = true
		} else {
      if(started) {
        // no more data.
        setTimeout(() => {
          console.log("done")
          process.exit(0)
        }, 500)
      }
      console.log("writing silence", size)
      data = gen_silence(format, size)
   	  speaker.write(data)
     	writer.write(data)
		}
}


// We need to write some initial silence to the speaker to avoid scratchyness
// I understand this happens because the speaker writable stream is being underfed
// so we need to buffer something to avoid this.
const size = 320 * 64 // tried with 32, 16, 8 and 4. The lower the multiplier, the more scratchynes we get
console.log("writing initial silence to speaker", size)
data = gen_silence(format, size)
speaker.write(data)

setInterval(() => {
  read_write()
}, 20)

const Speaker = require('speaker')
const GSSS = require('../index.js')
const wav = require('wav')
const fs = require('fs')
const au = require('@mayama/audio-utils')

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

const audioFormat = 1 // LINEAR16

const format = {
  audioFormat,
  channels: 1,
  sampleRate: 16000,
}

const config = {
	work_dir: './tmp',
}

const params = {
  language: 'en-US',
	voice: 'en-US-Standard-G',
	text: 'hello world',
  times: 2,
}

const opts = {
  format,
  config,
  params,
}

const gs = new GSSS(opts)

const speaker = new Speaker(format)

const writer = new wav.Writer(format)

const fileStream = fs.createWriteStream(output_wav_file)

// Pipe the WAV writer to the file stream
writer.pipe(fileStream)

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
      // no more data.
      setTimeout(() => {
        console.log("done")
        // It seems wav.FileWriter doesn't properly update the wav header with the duration of the audio when method end() is called (there is no problem if piping is used)
        // but we will call the method anyway as we will correct this eventually.
        writer.end(err => {
          console.log('writer.end done', err)
          process.exit(0)
        })
      }, 2500)
		}
}

// We need to write some initial silence to the speaker to avoid scratchyness
// I understand this happens because the speaker writable stream is being underfed
// so we need to buffer something to avoid this.
const size = 320 * 64 // tried with 32, 16, 8 and 4. The lower the multiplier, the more scratchynes we get
console.log("writing initial silence to speaker", size)
data = au.gen_silence(audioFormat, true, size)
speaker.write(data)

setInterval(() => {
  read_write()
}, 20)


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

const audioFormat = 1 // LINEAR16

const format = {
  audioFormat,
  channels: 1,
  sampleRate: 16000,
}

const config = {
	work_dir: './tmp',
}

if (!fs.existsSync('./tmp')) {
  fs.mkdirSync('./tmp')
}

const params = {
	language: 'en-US',
	voice: 'en-US-Standard-G',
	text: 'How are you?',
  times: 5,
}

const opts = {
  format,
  config,
  params,
}

const gs = new GSSS(opts)

const writer = new FileWriter(output_wav_file, format)

const evs = ['pipe', 'unpipe', 'finish', 'close', 'drain', 'error']
evs.forEach(ev => {
  writer.on(ev, data => {
    console.log(`ws on ${ev}`)
  })
})

gs.pipe(writer)

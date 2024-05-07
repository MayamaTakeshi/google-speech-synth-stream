const Speaker = require('speaker')
const GSSS = require('../index.js')
const au = require('@mayama/audio-utils')
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

const config = {
	work_dir: './tmp',
}

if (!fs.existsSync('./tmp')) {
  fs.mkdirSync('./tmp')
}

const params = {
  language: 'en-US',
	voice: 'en-US-Standard-G',
	text: 'hello world',
}

const opts = {
  format,
  config,
  params,
}

const gs = new GSSS(opts)

gs.on('ready', () => {
  const speaker = new Speaker(format)

  // We need to write some initial silence to the speaker to avoid scratchyness/gaps
  const size = 320 * 64 
  console.log("writing initial silence to speaker", size)
  data = au.gen_silence(format, size)
  speaker.write(data)

  gs.pipe(speaker)
})

const Speaker = require('speaker')
const GSSS = require('../index.js')
const au = require('@mayama/audio-utils')
const fs = require('fs')

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
	text: 'hello world',
  times: 3,
}

const opts = {
  format,
  config,
  params,
}

const gs = new GSSS(opts)

const speaker = new Speaker(format)

// We need to write some initial silence to the speaker to avoid scratchyness/gaps
const size = 320 * 64 
console.log("writing initial silence to speaker", size)
data = au.gen_silence(audioFormat, true, size)
speaker.write(data)

gs.pipe(speaker)

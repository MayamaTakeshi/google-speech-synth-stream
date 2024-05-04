//https://www.giacomovacca.com/2013/05/the-sound-of-silence-encoded-with-g711.html
/*
a-law: silence is either a payload entirely populated with 0x55 or 0xD5 (depending on the sign applied).
u-law: silence is a payload entirely populated with 0xFF.
*/

function gen(format, size) {
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


function push(format, stream, size) {
  var silence = genSilence(format, size)
  console.log("silence.push", silence)
  stream.push(silence);
} 

module.exports = {
	gen,
	push,
}

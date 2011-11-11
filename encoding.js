(function(global){
   "use strict";

   function octetStream(octets, unbounded) {
     var pos = 0;
     return {
       read: function() {
         if (!unbounded && pos >= octets.length) {
           throw new RangeError("Reading past the end of the buffer");
         }
         return octets[pos++];
       },
       write: function(o) {
         if (!unbounded && pos >= octets.length) {
           throw new RangeError("Writing past the end of the buffer");
         }
         octets[pos++] = o;
       },
       pos: function() {
         return pos;
       },
       eos: function() {
         return pos >= octets.length;
       },
       match: function(test) {
         if (test.length > pos + octets.length) {
           return false;
         }
         var i;
         for (i = 0; i < test.length; i += 1) {
           if (octets[pos + i] !== test[i]) {
             return false;
           }
         }
         return true;
       }
     };
   }

   var DecodeOperation = {
     DECODE: 0,
     LENGTH: 1
   };

   var codecs = {
     'BINARY': {
       encode: function(stream, string) {
         var i, octet;
         for (i = 0; i < string.length; i += 1) {
           octet = string.charCodeAt(i);
           if (octet > 0xff) {
             throw new RangeError('Invalid binary octet in string');
           }
           stream.write(octet);
         }
       },
       decode: function(stream, operation) {
         var string, codepoint, lpos;
         while (!stream.eos()) {
           lpos = stream.pos();
           codepoint = stream.read();
           if (operation === DecodeOperation.LENGTH && codepoint === 0) {
             return lpos;
           }
           string += String.fromCharCode(codepoint);
         }
         return string;
       }
     },

     'ASCII': {
       encode: function(stream, string) {
         var i, octet;
         for (i = 0; i < string.length; i += 1) {
           octet = string.charCodeAt(i);
           if (octet > 0x7f) {
             throw new RangeError('Invalid ASCII character in string');
           }
           stream.write(octet);
         }
       },
       decode: function(stream, operation) {
         var string = '', codepoint, lpos;
         while (!stream.eos()) {
           lpos = stream.pos();
           codepoint = stream.read();
           if (codepoint > 0x7f) {
             throw new RangeError('Invalid ASCII character in array');
           }
           if (operation === DecodeOperation.LENGTH && codepoint === 0) {
             return lpos;
           }
           string += String.fromCharCode(codepoint);
         }
         return string;
       }
     },

     'ISO-8859-1': {
       encode: function(stream, string) {
         var i, octet;
         for (i = 0; i < string.length; i += 1) {
           octet = string.charCodeAt(i);
           if (octet > 0xff) {
             throw new RangeError('Invalid ISO-8859-1 character in string');
           }
           stream.write(octet);
         }
       },
       decode: function(stream, operation) {
         var string = '', codepoint, lpos;
         while (!stream.eos()) {
           lpos = stream.pos();
           codepoint = stream.read();
           if (operation === DecodeOperation.LENGTH && codepoint === 0) {
             return lpos;
           }
           string += String.fromCharCode(codepoint);
         }
         return string;
       }
     },

     'UTF-8': {
       byteOrderMark:  [0xef, 0xbb, 0xbf],
       encode: function(stream, string) {
         var i, codepoint, codepoint2;

         for (i = 0; i < string.length; i += 1) {
           codepoint = string.charCodeAt(i);

           if ((codepoint & 0xfc00) === 0xd800) {
             i += 1;
             if (i >= string.length) {
               throw new RangeError('Invalid UTF-16 sequence');
             }

             codepoint2 = string.charCodeAt(i);
             if ((codepoint2 & 0xfc00) === 0xdc00) {
               codepoint = ((codepoint & 0x03ff) << 10 |
                            (codepoint2 & 0x03ff)) + 0x10000;
             } else {
               throw new RangeError('Invalid UTF-16 sequence');
             }
           } else if ((codepoint & 0xfc00) === 0xdc00) {
             throw new RangeError('Invalid UTF-16 sequence');
           }

           if (codepoint <= 0x00007f) {
             stream.write(codepoint);
           } else if (codepoint <= 0x0007ff) {
             stream.write(0xc0 | ((codepoint >> 6) & 0x1f));
             stream.write(0x80 | ((codepoint >> 0) & 0x3f));
           } else if (codepoint <= 0x00ffff) {
             stream.write(0xe0 | ((codepoint >> 12) & 0x0f));
             stream.write(0x80 | ((codepoint >> 6) & 0x3f));
             stream.write(0x80 | ((codepoint >> 0) & 0x3f));
           } else if (codepoint <= 0x10ffff) {
             stream.write(0xf0 | ((codepoint >> 18) & 0x07));
             stream.write(0x80 | ((codepoint >> 12) & 0x3f));
             stream.write(0x80 | ((codepoint >> 6) & 0x3f));
             stream.write(0x80 | ((codepoint >> 0) & 0x3f));
           } else {
             throw new RangeError('Invalid Unicode character');
           }
         }
       },

       decode: function(stream, operation) {
         var string = '', codepoint, lpos;

         if (stream.match(this.byteOrderMark)) {
           this.byteOrderMark.forEach(function() { stream.read(); });
         }

         // continuation byte
         function cbyte() {
           if (stream.eos()) {
             throw new RangeError('Invalid UTF-8 sequence');
           }

           var octet = stream.read();
           if ((octet & 0xc0) !== 0x80) {
             throw new RangeError('Invalid UTF-8 sequence');
           }

           return octet & 0x3f;
         }

         while (!stream.eos()) {
           lpos = stream.pos();
           codepoint = stream.read();
           if ((codepoint & 0x80) === 0x00) {
             // no-op
           } else if ((codepoint & 0xe0) === 0xc0) {
             codepoint = ((codepoint & 0x1f) << 6) | cbyte();
           } else if ((codepoint & 0xf0) === 0xe0) {
             codepoint = ((codepoint & 0x0f) << 12) | (cbyte() << 6) | cbyte();
           } else if ((codepoint & 0xf8) === 0xf0) {
             codepoint = ((codepoint & 0x07) << 18) | (cbyte() << 12) |
               (cbyte() << 6) | cbyte();
           } else {
             throw new RangeError('Invalid UTF-8 sequence');
           }

           if (operation === DecodeOperation.LENGTH && codepoint === 0) {
             return lpos;
           } else if (codepoint < 0x10000) {
             string += String.fromCharCode(codepoint);
           } else {
             codepoint -= 0x10000;
             string += String.fromCharCode(0xd800 + ((codepoint >> 10) & 0x3ff));
             string += String.fromCharCode(0xdc00 + (codepoint & 0x3ff));
           }
         }

         return string;
       }
     },

     'UTF-16LE': {
       byteOrderMark: [0xff, 0xfe],
       encode: function(stream, string) {
         var i, codepoint;
         for (i = 0; i < string.length; i += 1) {
           codepoint = string.charCodeAt(i);
           stream.write(codepoint & 0xff);
           stream.write((codepoint >> 8) & 0xff);
         }
       },
       decode: function(stream, operation) {
         var string = '', codepoint, lpos;

         if (stream.match(this.byteOrderMark)) {
           stream.read();
           stream.read();
         } else if (stream.match(codecs['UTF-16BE'].byteOrderMark)) {
           throw new RangeError('Mismatched UTF-16 byteOrderMark');
         }

         while (!stream.eos()) {
           lpos = stream.pos();
           codepoint = stream.read() | (stream.read() << 8);
           if (operation === DecodeOperation.LENGTH && codepoint === 0) {
             return lpos;
           }
           string += String.fromCharCode(codepoint);
         }
         return string;
       }
     },

     'UTF-16BE': {
       byteOrderMark: [0xfe, 0xff],
       encode: function(stream, string) {
         var i, codepoint;
         for (i = 0; i < string.length; i += 1) {
           codepoint = string.charCodeAt(i);
           stream.write((codepoint >> 8) & 0xff);
           stream.write(codepoint & 0xff);
         }
       },
       decode: function(stream, operation) {
         var string = '', codepoint, lpos;

         if (stream.match(this.byteOrderMark)) {
           stream.read();
           stream.read();
         } else if (stream.match(codecs['UTF-16LE'].byteOrderMark)) {
           throw new RangeError('Mismatched UTF-16 byteOrderMark');
         }

         while (!stream.eos()) {
           lpos = stream.pos();
           codepoint = (stream.read() << 8) | stream.read();
           if (operation === DecodeOperation.LENGTH && codepoint === 0) {
             return lpos;
           }
           string += String.fromCharCode(codepoint);
         }
         return string;
       }
     },

     'UTF-16': {
       encode: function(stream, string) {
         var encoding = 'UTF-16LE';
         codecs[encoding].byteOrderMark.forEach(
           function(b) { stream.write(b); });
         codecs[encoding].encode(stream, string);
       },
       decode: function(stream, operation) {
         if (stream.match(codecs['UTF-16BE'].byteOrderMark)) {
           return codecs['UTF-16BE'].decode(stream, operation);
         } else if (stream.match(codecs['UTF-16LE'].byteOrderMark)) {
           return codecs['UTF-16LE'].decode(stream, operation);
         } else {
           throw new RangeError('Missing byteOrderMark');
         }
       }
     }
   };

   var DEFAULT_ENCODING = 'UTF-8';

   function toUint32(x) { return x >>> 0; }
   function toInt32(x) { return x >> 0; }

   function decode(array,
                   byteOffset,
                   byteLength,
                   encoding) {

     var buffer, bufferLength, bufferOffset = 0;
     if (array instanceof ArrayBuffer) {
       buffer = array;
       bufferLength = array.byteLength;
     } else if (array instanceof DataView) {
       buffer = array.buffer;
       bufferOffset += array.byteOffset;
       bufferLength = array.byteOffset + array.byteLength;
     } else {
       throw new TypeError('Expected ArrayBuffer or DataView');
     }

     byteOffset = (arguments.length >= 2) ? toUint32(byteOffset) : 0;
     byteOffset += bufferOffset;
     if (byteOffset > bufferLength) {
       throw new RangeError('byteOffset past end of buffer');
     }
     byteLength = (arguments.length >= 3) ? toInt32(byteLength) :
       bufferLength - bufferOffset;
     if (byteOffset + byteLength > bufferLength) {
       throw new RangeError('byteLength past end of buffer');
     }
     encoding = (arguments.length >= 4) ? String(encoding) : DEFAULT_ENCODING;

     var octets = new Uint8Array(buffer, byteOffset, byteLength);
     var codec = codecs[encoding.toUpperCase()];
     if (codec === (void 0)) {
       throw new Error('Unsupported encoding');
     }

     return codec.decode(octetStream(octets), DecodeOperation.DECODE);
   }

   function stringLength(array,
                         byteOffset,
                         byteLength,
                         encoding) {

     var buffer, bufferLength, bufferOffset = 0;
     if (array instanceof ArrayBuffer) {
       buffer = array;
       bufferLength = array.byteLength;
     } else if (array instanceof DataView) {
       buffer = array.buffer;
       bufferOffset += array.byteOffset;
       bufferLength = array.byteOffset + array.byteLength;
     } else {
       throw new TypeError('Expected ArrayBuffer or DataView');
     }

     byteOffset = (arguments.length >= 2) ? toUint32(byteOffset) : 0;
     byteOffset += bufferOffset;
     if (byteOffset > bufferLength) {
       throw new RangeError('byteOffset past end of buffer');
     }
     byteLength = (arguments.length >= 3) ? toInt32(byteLength) :
       bufferLength - bufferOffset;
     if (byteOffset + byteLength > bufferLength) {
       throw new RangeError('byteLength past end of buffer');
     }
     encoding = (arguments.length >= 4) ? String(encoding) : DEFAULT_ENCODING;

     var octets = new Uint8Array(buffer, byteOffset, byteLength);

     var codec = codecs[encoding.toUpperCase()];
     if (codec === (void 0)) {
       throw new Error('Unsupported encoding');
     }

     return codec.decode(octetStream(octets), DecodeOperation.LENGTH);
   }

   function encode(value,
                   array,
                   byteOffset,
                   encoding) {

     value = String(value);
     byteOffset = arguments.length >= 3 ? toInt32(byteOffset) : 0;
     encoding = arguments.length >= 4 ? String(encoding) : DEFAULT_ENCODING;

     var buffer, bufferLength;
     if (array instanceof ArrayBuffer) {
       buffer = array;
       bufferLength = array.byteLength;
     } else if (array instanceof DataView) {
       buffer = array.buffer;
       byteOffset += array.byteOffset;
       bufferLength = array.byteOffset + array.byteLength;
     } else {
       throw new TypeError('Expected ArrayBuffer or DataView');
     }

     var codec = codecs[encoding.toUpperCase()];
     if (codec === (void 0)) {
       throw new Error('Unsupported encoding');
     }

     var octets = [];
     var stream = octetStream(octets, true);
     codec.encode(stream, value);

     if ((byteOffset + octets.length) > bufferLength) {
       throw new RangeError("Writing past the end of the buffer");
     }

     (new Uint8Array(buffer, byteOffset, octets.length)).set(octets);

     return octets.length;
   }

   function encodedLength(value,
                          encoding) {

     value = String(value);
     encoding = arguments.length >= 2 ? String(encoding) : DEFAULT_ENCODING;

     var codec = codecs[encoding.toUpperCase()];
     if (codec === (void 0)) {
       throw new Error('Unsupported encoding');
     }

     var octets = [];
     var stream = octetStream(octets, true);
     codec.encode(stream, value);
     return octets.length;
   }

   var StringEncoding = {
     decode: decode,
     stringLength: stringLength,
     encode: encode,
     encodedLength: encodedLength
   };

   global.stringEncoding = global.stringEncoding || StringEncoding;
 }(this));

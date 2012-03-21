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
       offset: function (n) {
         pos = n;
         if (pos >= octets.length) {
           throw new RangeError("Reading past the end of the buffer");
         }
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

   var codecs = [
     {
       name: 'binary',
       labels: ['binary'],
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

     {
       name: 'ascii',
       labels: ['ascii'],
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

     {
       name: 'iso-8859-1',
       labels: ['iso-8859-1'],
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

     {
       name: 'utf-8',
       labels: ['utf-8'],
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

     {
       name: 'utf-16le',
       labels: ['utf-16le', 'utf-16'],
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

     {
       name: 'utf-16be',
       labels: ['utf-16be'],
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
     }
   ];

   function getEncoding(label) {
     label = String(label).trim().toLowerCase();
     var i, labels;
     for (i = 0; i < codecs.length; ++i) {
       if (codecs[i].labels.indexOf(label) !== -1) {
         return codecs[i];
       }
     }
     throw new Error("Unknown encoding: " + label);
   }

   var DEFAULT_ENCODING = 'utf-8';

   function toUint32(x) { return x >>> 0; }
   function toInt32(x) { return x >> 0; }

   function decode(view,
                   encoding) {
     //if (!(view instanceof ArrayBufferView)) {
     //  throw new TypeError('Expected ArrayBufferView');
     //}
     encoding = (arguments.length >= 2) ? String(encoding) : DEFAULT_ENCODING;

     var octets = new Uint8Array(view.buffer, view.byteOffset, view.byteLength);
     var codec = getEncoding(encoding);
     var stream = octetStream(octets);

     if (stream.match([0xFF, 0xFE])) {
       codec = getEncoding('utf-16');
       stream.offset(2);
     } else if (stream.match([0xFE, 0XFF])) {
       codec = getEncoding('utf-16be');
       stream.offset(2);
     } else if (stream.match([0xEF, 0xBB, 0xBF])) {
       codec = getEncoding('utf-8');
       stream.offset(3);
     }

     return codec.decode(stream, DecodeOperation.DECODE);
   }

   function stringLength(view, encoding) {
     //if (!(view instanceof ArrayBufferView)) {
     //  throw new TypeError('Expected ArrayBufferView');
     //}
     encoding = (arguments.length >= 2) ? String(encoding) : DEFAULT_ENCODING;

     var octets = new Uint8Array(view.buffer, view.byteOffset, view.byteLength);
     var codec = getEncoding(encoding);
     var stream = octetStream(octets);

     if (stream.match([0xFF, 0xFE])) {
       codec = getEncoding('utf-16');
       stream.offset(2);
     } else if (stream.match([0xFE, 0XFF])) {
       codec = getEncoding('utf-16be');
       stream.offset(2);
     } else if (stream.match([0xEF, 0xBB, 0xBF])) {
       codec = getEncoding('utf-8');
       stream.offset(3);
     }

     return codec.decode(stream, DecodeOperation.LENGTH);
   }

   function encode(value,
                   view,
                   encoding) {

     value = String(value);
     encoding = arguments.length >= 3 ? String(encoding) : DEFAULT_ENCODING;

     var codec = getEncoding(encoding);

     var octets = [];
     var stream = octetStream(octets, true);
     codec.encode(stream, value);

     if (octets.length > view.byteLength) {
       throw new RangeError("Writing past the end of the buffer");
     }

     (new Uint8Array(view.buffer, view.byteOffset, octets.length)).set(octets);

     return octets.length;
   }

   function encodedLength(value,
                          encoding) {

     value = String(value);
     encoding = arguments.length >= 2 ? String(encoding) : DEFAULT_ENCODING;

     var codec = getEncoding(encoding);

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

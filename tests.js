// NOTE: relies on http://docs.jquery.com/QUnit

function arrayEqual(a, b, msg) {
  // deepEqual() is too picky
  equal(a.length, b.length, msg);
  for (var i = 0; i < a.length; i += 1) {
    // equal() is too slow to call each time
    if (a[i] !== b[i]) { equal(a[i], b[i], msg); }
  }
  ok(true, msg);
}


function testEncodeDecode(encoding, min, max) {
  function cpname(n) {
    return 'U+' + ((n <= 0xFFFF) ?
                   ('0000' + n.toString(16).toUpperCase()).slice(-4) :
                   n.toString(16).toUpperCase());
  }

  test(
    encoding + " - Encode/Decode Range " + cpname(min) + " - " + cpname(max),
    function() {
      var string, i, j, BATCH_SIZE = 0x1000;
      for (i = min; i < max; i += BATCH_SIZE) {
        string = '';
        for (j = i; j < i + BATCH_SIZE && j < max; j += 1) {
          if (0xd800 <= j && j <= 0xdfff) {
            // surrogate half
            continue;
          } else if (j > 0xffff) {
            // outside BMP - encode as surrogate pair
            string += String.fromCharCode(
	      0xd800 + ((j >> 10) & 0x3ff),
	      0xdc00 + (j & 0x3ff));
          } else {
            string += String.fromCharCode(i);
          }
        }
        var len = stringEncoding.encodedLength(string, encoding);
        var array = new Uint8Array(len);
        var encoded = stringEncoding.encode(string, array, encoding);
        var decoded = stringEncoding.decode(array, encoding);
        equal(string, decoded, 'Round trip ' + cpname(i) + " - " + cpname(j));
      }
    });
}

testEncodeDecode('UTF-8', 0, 0x10FFFF);
testEncodeDecode('UTF-16LE', 0, 0x10FFFF);
testEncodeDecode('UTF-16BE', 0, 0x10FFFF);
testEncodeDecode('binary', 0, 0xFF);
testEncodeDecode('windows-1252', 0, 0xFF);


// Inspired by:
// http://ecmanaut.blogspot.com/2006/07/encoding-decoding-utf8-in-javascript.html
function encode_utf8(string) {
  var utf8 = unescape(encodeURIComponent(string));
  var octets = [], i;
  for (i = 0; i < utf8.length; i += 1) {
    octets.push(utf8.charCodeAt(i));
  }
  return octets;
}

function decode_utf8(octets) {
  var utf8 = String.fromCharCode.apply(null, octets);
  return decodeURIComponent(escape(utf8));
}

test(
  "UTF-8 encoding (compare against unescape/encodeURIComponent)",
  function() {
    expect(544);

    var actual, expected, str, i, j, BATCH_SIZE = 0x1000;

    for (i = 0; i < 0x10FFFF; i += BATCH_SIZE) {
      str = '';
      for (j = i; j < i + BATCH_SIZE; j += 1) {
        if (0xd800 <= j && j <= 0xdfff) {
          // surrogate half
          continue;
        } else if (j > 0xffff) {
          // outside BMP - encode as surrogate pair
          str += String.fromCharCode(
	    0xd800 + ((j >> 10) & 0x3ff),
	    0xdc00 + (j & 0x3ff));
        } else {
          str += String.fromCharCode(i);
        }
      }
      expected = encode_utf8(str);

      actual = new Uint8Array(stringEncoding.encodedLength(str, 'UTF-8'));
      stringEncoding.encode(str, actual, 'UTF-8');

      arrayEqual(actual, expected, 'expected equal encodings');
    }
  });

test(
  "UTF-8 decoding (compare against decodeURIComponent/escape)",
  function() {
    expect(272);

    var encoded, actual, expected, str, i, j, BATCH_SIZE = 0x1000;

    for (i = 0; i < 0x10FFFF; i += BATCH_SIZE) {
      str = '';
      for (j = i; j < i + BATCH_SIZE; j += 1) {
        if (0xd800 <= j && j <= 0xdfff) {
          // surrogate half
          continue;
        } else if (j > 0xffff) {
          // outside BMP - encode as surrogate pair
          str += String.fromCharCode(
	    0xd800 + ((j >> 10) & 0x3ff),
	    0xdc00 + (j & 0x3ff));
        } else {
          str += String.fromCharCode(i);
        }
      }

      encoded = encode_utf8(str);

      expected = decode_utf8(encoded);
      actual = stringEncoding.decode(new Uint8Array(encoded), 'UTF-8');

      equal(actual, expected, 'expected equal decodings');
    }
  });

function testEncodeDecodeSample(encoding, string, expected) {
  test(
    encoding + " - Encode/Decode - reference sample",
    function() {
      expect(4);

      var len = stringEncoding.encodedLength(string, encoding);
      equal(len, expected.length, 'encoded length mismatch ' + encoding);

      var array = new Uint8Array(len);
      stringEncoding.encode(string, array, encoding);
      arrayEqual(array, expected, 'expected equal encodings ' + encoding);

      var decoded = stringEncoding.decode(new Uint8Array(expected), encoding);
      equal(decoded, string, 'expected equal decodings ' + encoding);
    });
}

testEncodeDecodeSample(
  "windows-1252",
  "\x00\x01\x02\x03\x04\x05\x06\x07\x08\x09\x0a\x0b\x0c\x0d\x0e\x0f\x10\x11\x12\x13\x14\x15\x16\x17\x18\x19\x1a\x1b\x1c\x1d\x1e\x1f !\"#$%&'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_`abcdefghijklmnopqrstuvwxyz{|}~\x7f\u20ac\x81\u201a\u0192\u201e\u2026\u2020\u2021\u02c6\u2030\u0160\u2039\u0152\x8d\u017d\x8f\x90\u2018\u2019\u201c\u201d\u2022\u2013\u2014\u02dc\u2122\u0161\u203a\u0153\x9d\u017e\u0178\xa0\xa1\xa2\xa3\xa4\xa5\xa6\xa7\xa8\xa9\xaa\xab\xac\xad\xae\xaf\xb0\xb1\xb2\xb3\xb4\xb5\xb6\xb7\xb8\xb9\xba\xbb\xbc\xbd\xbe\xbf\xc0\xc1\xc2\xc3\xc4\xc5\xc6\xc7\xc8\xc9\xca\xcb\xcc\xcd\xce\xcf\xd0\xd1\xd2\xd3\xd4\xd5\xd6\xd7\xd8\xd9\xda\xdb\xdc\xdd\xde\xdf\xe0\xe1\xe2\xe3\xe4\xe5\xe6\xe7\xe8\xe9\xea\xeb\xec\xed\xee\xef\xf0\xf1\xf2\xf3\xf4\xf5\xf6\xf7\xf8\xf9\xfa\xfb\xfc\xfd\xfe\xff",
  (function() { var i = 0, a = []; while (i < 256) { a.push(i++); } return a; }())
);

testEncodeDecodeSample(
  "binary",
  "\x00\x01\x02\x03\x04\x05\x06\x07\x08\x09\x0A\x0B\x0C\x0D\x0E\x0F\x10\x11\x12\x13\x14\x15\x16\x17\x18\x19\x1A\x1B\x1C\x1D\x1E\x1F\x20\x21\x22\x23\x24\x25\x26\x27\x28\x29\x2A\x2B\x2C\x2D\x2E\x2F\x30\x31\x32\x33\x34\x35\x36\x37\x38\x39\x3A\x3B\x3C\x3D\x3E\x3F\x40\x41\x42\x43\x44\x45\x46\x47\x48\x49\x4A\x4B\x4C\x4D\x4E\x4F\x50\x51\x52\x53\x54\x55\x56\x57\x58\x59\x5A\x5B\x5C\x5D\x5E\x5F\x60\x61\x62\x63\x64\x65\x66\x67\x68\x69\x6A\x6B\x6C\x6D\x6E\x6F\x70\x71\x72\x73\x74\x75\x76\x77\x78\x79\x7A\x7B\x7C\x7D\x7E\x7F\x80\x81\x82\x83\x84\x85\x86\x87\x88\x89\x8A\x8B\x8C\x8D\x8E\x8F\x90\x91\x92\x93\x94\x95\x96\x97\x98\x99\x9A\x9B\x9C\x9D\x9E\x9F\xA0\xA1\xA2\xA3\xA4\xA5\xA6\xA7\xA8\xA9\xAA\xAB\xAC\xAD\xAE\xAF\xB0\xB1\xB2\xB3\xB4\xB5\xB6\xB7\xB8\xB9\xBA\xBB\xBC\xBD\xBE\xBF\xC0\xC1\xC2\xC3\xC4\xC5\xC6\xC7\xC8\xC9\xCA\xCB\xCC\xCD\xCE\xCF\xD0\xD1\xD2\xD3\xD4\xD5\xD6\xD7\xD8\xD9\xDA\xDB\xDC\xDD\xDE\xDF\xE0\xE1\xE2\xE3\xE4\xE5\xE6\xE7\xE8\xE9\xEA\xEB\xEC\xED\xEE\xEF\xF0\xF1\xF2\xF3\xF4\xF5\xF6\xF7\xF8\xF9\xFA\xFB\xFC\xFD\xFE\xFF",
  (function() { var i = 0, a = []; while (i < 256) { a.push(i++); } return a; }())
);


testEncodeDecodeSample(
  "utf-8",
  "z\xA2\u6C34\uD834\uDD1E\uDBFF\uDFFD", // z, cent, CJK water, G-Clef, Private-use character
  [0x7A, 0xC2, 0xA2, 0xE6, 0xB0, 0xB4, 0xF0, 0x9D, 0x84, 0x9E, 0xF4, 0x8F, 0xBF, 0xBD]
);
testEncodeDecodeSample(
  "utf-16le",
  "z\xA2\u6C34\uD834\uDD1E\uDBFF\uDFFD", // z, cent, CJK water, G-Clef, Private-use character
  [0x7A, 0x00, 0xA2, 0x00, 0x34, 0x6C, 0x34, 0xD8, 0x1E, 0xDD, 0xFF, 0xDB, 0xFD, 0xDF]
);
testEncodeDecodeSample(
  "utf-16be",
  "z\xA2\u6C34\uD834\uDD1E\uDBFF\uDFFD", // z, cent, CJK water, G-Clef, Private-use character
  [0x00, 0x7A, 0x00, 0xA2, 0x6C, 0x34, 0xD8, 0x34, 0xDD, 0x1E, 0xDB, 0xFF, 0xDF, 0xFD]
);
testEncodeDecodeSample(
  "utf-16",
  "z\xA2\u6C34\uD834\uDD1E\uDBFF\uDFFD", // z, cent, CJK water, G-Clef, Private-use character
  [0x7A, 0x00, 0xA2, 0x00, 0x34, 0x6C, 0x34, 0xD8, 0x1E, 0xDD, 0xFF, 0xDB, 0xFD, 0xDF]
);

test(
  "bad data",
  function() {
    expect(5);

    var badStrings = [
      { input: '\ud800', expected: '\ufffd' }, // Surrogate half
      { input: '\udc00', expected: '\ufffd' }, // Surrogate half
      { input: 'abc\ud800def', expected: 'abc\ufffddef' }, // Surrogate half
      { input: 'abc\udc00def', expected: 'abc\ufffddef' }, // Surrogate half
      { input: '\udc00\ud800', expected: '\ufffd\ufffd' } // Wrong order
    ];

    badStrings.forEach(
      function(t) {
        var length = stringEncoding.encodedLength(t.input, 'utf-8');
        var array = new Uint8Array(length);
        var encoded = stringEncoding.encode(t.input, array, 'utf-8');
        var decoded = stringEncoding.decode(array, 'utf-8');
        equal(t.expected, decoded);
      });
  });

test(
  "Encoding names are case insensitive", function() {
    var encodings = [
      { encoding: 'UTF-8', string: 'z\xA2\u6C34\uD834\uDD1E\uDBFF\uDFFD' },
      { encoding: 'UTF-16', string: 'z\xA2\u6C34\uD834\uDD1E\uDBFF\uDFFD' },
      { encoding: 'UTF-16LE', string: 'z\xA2\u6C34\uD834\uDD1E\uDBFF\uDFFD' },
      { encoding: 'UTF-16BE', string: 'z\xA2\u6C34\uD834\uDD1E\uDBFF\uDFFD' },
      { encoding: 'ASCII', string: 'ABCabc123!@#' },
      { encoding: 'ISO-8859-1', string: 'ABCabc123!@#\xA2' },
      { encoding: 'BINARY', string: '\x00\0x01\x02\0x03\0x7f\0x80\xfe\xff' }
    ];

    encodings.forEach(
      function(test) {
        equal(
          stringEncoding.encodedLength(test.string, test.encoding),
          stringEncoding.encodedLength(test.string, test.encoding.toLowerCase()));
      });
  });

test(
  "Byte-order marks",
  function() {
    expect(9);

    var utf8 = [0xEF, 0xBB, 0xBF, 0x7A, 0xC2, 0xA2, 0xE6, 0xB0, 0xB4, 0xF0, 0x9D, 0x84, 0x9E, 0xF4, 0x8F, 0xBF, 0xBD];
    var utf16le = [0xff, 0xfe, 0x7A, 0x00, 0xA2, 0x00, 0x34, 0x6C, 0x34, 0xD8, 0x1E, 0xDD, 0xFF, 0xDB, 0xFD, 0xDF];
    var utf16be = [0xfe, 0xff, 0x00, 0x7A, 0x00, 0xA2, 0x6C, 0x34, 0xD8, 0x34, 0xDD, 0x1E, 0xDB, 0xFF, 0xDF, 0xFD];

    var string = "z\xA2\u6C34\uD834\uDD1E\uDBFF\uDFFD"; // z, cent, CJK water, G-Clef, Private-use character

    // Basic cases
    equal(stringEncoding.decode(new Uint8Array(utf8), 'utf-8'), string);
    equal(stringEncoding.decode(new Uint8Array(utf16le), 'utf-16le'), string);
    equal(stringEncoding.decode(new Uint8Array(utf16be), 'utf-16be'), string);

    // Verify that BOM wins
    equal(stringEncoding.decode(new Uint8Array(utf8), 'utf-16le'), string);
    equal(stringEncoding.decode(new Uint8Array(utf8), 'utf-16be'), string);
    equal(stringEncoding.decode(new Uint8Array(utf16le), 'utf-8'), string);
    equal(stringEncoding.decode(new Uint8Array(utf16le), 'utf-16be'), string);
    equal(stringEncoding.decode(new Uint8Array(utf16be), 'utf-8'), string);
    equal(stringEncoding.decode(new Uint8Array(utf16be), 'utf-16le'), string);
  });

test(
  "Null termination",
  function() {
    expect(6);

    var encodings = [
      { encoding: 'UTF-8', string: 'z\xA2\u6C34\uD834\uDD1E\uDBFF\uDFFD' },
      { encoding: 'UTF-16', string: 'z\xA2\u6C34\uD834\uDD1E\uDBFF\uDFFD' },
      { encoding: 'UTF-16LE', string: 'z\xA2\u6C34\uD834\uDD1E\uDBFF\uDFFD' },
      { encoding: 'UTF-16BE', string: 'z\xA2\u6C34\uD834\uDD1E\uDBFF\uDFFD' },
      { encoding: 'ASCII', string: 'ABCabc123!@#' },
      { encoding: 'ISO-8859-1', string: 'ABCabc123!@#\xA2' }
    ];

    encodings.forEach(
      function(test) {

        var with_null = test.string + '\x00' + test.string;
        var len = stringEncoding.encodedLength(with_null, test.encoding);

        var array = new Uint8Array(len);
        stringEncoding.encode(with_null, array, test.encoding);

        var found_len = stringEncoding.stringLength(array, test.encoding);
        var decoded = stringEncoding.decode(new DataView(array.buffer, 0, found_len), test.encoding);

        equal(decoded, test.string);
      });
  });

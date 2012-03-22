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
  var utf8 = '', i;
  for (i = 0; i < octets.length; i += 1) {
    utf8 += String.fromCharCode(octets[i]);
  }
  return decodeURIComponent(escape(utf8));
}


test(
  "UTF-8 encoding",
  function() {
    expect(2176);

    var actual, expected, str, i, j, BATCH_SIZE = 1024;

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
  "UTF-8 decoding",
  function() {
    expect(1088);

    var encoded, actual, expected, str, i, j, BATCH_SIZE = 1024;

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

test(
  "Single byte encoding",
  function() {

    var encoding = 'windows-1252';
    var code_points = [], i;
    for (i = 0; i < 256; ++i) {
      code_points[i] = i;
    }
    var string = "\x00\x01\x02\x03\x04\x05\x06\x07\x08\x09\x0a\x0b\x0c\x0d\x0e\x0f\x10\x11\x12\x13\x14\x15\x16\x17\x18\x19\x1a\x1b\x1c\x1d\x1e\x1f !\"#$%&'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_`abcdefghijklmnopqrstuvwxyz{|}~\x7f\u20ac\x81\u201a\u0192\u201e\u2026\u2020\u2021\u02c6\u2030\u0160\u2039\u0152\x8d\u017d\x8f\x90\u2018\u2019\u201c\u201d\u2022\u2013\u2014\u02dc\u2122\u0161\u203a\u0153\x9d\u017e\u0178\xa0\xa1\xa2\xa3\xa4\xa5\xa6\xa7\xa8\xa9\xaa\xab\xac\xad\xae\xaf\xb0\xb1\xb2\xb3\xb4\xb5\xb6\xb7\xb8\xb9\xba\xbb\xbc\xbd\xbe\xbf\xc0\xc1\xc2\xc3\xc4\xc5\xc6\xc7\xc8\xc9\xca\xcb\xcc\xcd\xce\xcf\xd0\xd1\xd2\xd3\xd4\xd5\xd6\xd7\xd8\xd9\xda\xdb\xdc\xdd\xde\xdf\xe0\xe1\xe2\xe3\xe4\xe5\xe6\xe7\xe8\xe9\xea\xeb\xec\xed\xee\xef\xf0\xf1\xf2\xf3\xf4\xf5\xf6\xf7\xf8\xf9\xfa\xfb\xfc\xfd\xfe\xff";

    equal(stringEncoding.encodedLength(string, encoding), 256);

    var array = new Uint8Array(256);
    stringEncoding.encode(string, array, encoding);
    arrayEqual(array, code_points, 'expected equal encodings ' + encoding);

    var decoded = stringEncoding.decode(new Uint8Array(code_points), encoding);
    equal(decoded, string, 'expected equal decodings' + encoding);
  });

test(
  "Encode-decode",
  function() {
    expect(16);

    var string = "z\xA2\u6C34\uD834\uDD1E\uDBFF\uDFFD"; // z, cent, CJK water, G-Clef, Private-use character

    var expected_utf8 = [0x7A, 0xC2, 0xA2, 0xE6, 0xB0, 0xB4, 0xF0, 0x9D, 0x84, 0x9E, 0xF4, 0x8F, 0xBF, 0xBD];
    var expected_utf16le = [0x7A, 0x00, 0xA2, 0x00, 0x34, 0x6C, 0x34, 0xD8, 0x1E, 0xDD, 0xFF, 0xDB, 0xFD, 0xDF];
    var expected_utf16be = [0x00, 0x7A, 0x00, 0xA2, 0x6C, 0x34, 0xD8, 0x34, 0xDD, 0x1E, 0xDB, 0xFF, 0xDF, 0xFD];
    var expected_utf16 = [0x7A, 0x00, 0xA2, 0x00, 0x34, 0x6C, 0x34, 0xD8, 0x1E, 0xDD, 0xFF, 0xDB, 0xFD, 0xDF];

    function check(string, encoding, expected) {

      var len = stringEncoding.encodedLength(string, encoding);
      equal(len, expected.length, 'encoded length mismatch ' + encoding);

      var array = new Uint8Array(len);
      stringEncoding.encode(string, array, encoding);
      arrayEqual(array, expected, 'expected equal encodings ' + encoding);

      var decoded = stringEncoding.decode(new Uint8Array(expected), encoding);
      equal(decoded, string, 'expected equal decodings ' + encoding);
    }

    check(string, 'UTF-8', expected_utf8);
    check(string, 'UTF-16LE', expected_utf16le);
    check(string, 'UTF-16BE', expected_utf16be);
    check(string, 'UTF-16', expected_utf16);
  });


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

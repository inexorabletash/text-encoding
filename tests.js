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

      arrayEqual(expected, actual, 'expected equal encodings');
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

      equal(expected, actual, 'expected equal decodings');
    }
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
      equal(expected.length, len, 'encoded length mismatch ' + encoding);

      var array = new Uint8Array(len);
      stringEncoding.encode(string, array, encoding);
      arrayEqual(expected, array, 'expected equal encodings ' + encoding);

      var decoded = stringEncoding.decode(new Uint8Array(expected), encoding);
      equal(string, decoded, 'expected equal decodings ' + encoding);
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
      '\ud800', // Surrogate half
      '\udc00', // Surrogate half
      'abc\ud800def', // Surrogate half
      'abc\udc00def', // Surrogate half
      '\udc00\ud800', // Wrong order
    ];

    badStrings.forEach(
      function(str) {
        raises(
          function() {
            stringEncoding.encodedLength(str, 'UTF-8');
          });
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
    equal(string, stringEncoding.decode(new Uint8Array(utf8), 'utf-8'));
    equal(string, stringEncoding.decode(new Uint8Array(utf16le), 'utf-16le'));
    equal(string, stringEncoding.decode(new Uint8Array(utf16be), 'utf-16be'));

    // Verify that BOM wins
    equal(string, stringEncoding.decode(new Uint8Array(utf8), 'utf-16le'));
    equal(string, stringEncoding.decode(new Uint8Array(utf8), 'utf-16be'));
    equal(string, stringEncoding.decode(new Uint8Array(utf16le), 'utf-8'));
    equal(string, stringEncoding.decode(new Uint8Array(utf16le), 'utf-16be'));
    equal(string, stringEncoding.decode(new Uint8Array(utf16be), 'utf-8'));
    equal(string, stringEncoding.decode(new Uint8Array(utf16be), 'utf-16le'));
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

        equal(test.string, decoded);
      });
  });

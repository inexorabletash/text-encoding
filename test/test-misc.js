// This is free and unencumbered software released into the public domain.
// See LICENSE.md for more information.

var THE_ENCODING = ['utf-8'];

var LEGACY_ENCODINGS = [
  'ibm866', 'iso-8859-2', 'iso-8859-3', 'iso-8859-4', 'iso-8859-5',
  'iso-8859-6', 'iso-8859-7', 'iso-8859-8', 'iso-8859-10',
  'iso-8859-13', 'iso-8859-14', 'iso-8859-15', 'iso-8859-16', 'koi8-r',
  'koi8-u', 'macintosh', 'windows-874', 'windows-1250', 'windows-1251',
  'windows-1252', 'windows-1253', 'windows-1254', 'windows-1255',
  'windows-1256', 'windows-1257', 'windows-1258', 'x-mac-cyrillic',
  'gbk', 'gb18030', 'big5', 'euc-jp', 'iso-2022-jp', 'shift_jis',
  'euc-kr', 'utf-16le', 'utf-16be'
];

var ASCII_SUPERSETS = THE_ENCODING.concat(LEGACY_ENCODINGS)
      .filter(function(e) {
        return e !== 'utf-16le' && e !== 'utf-16be';
      });

// Miscellaneous tests

test(function() {
  assert_false(/\[native code\]/.test(String(TextDecoder)),
               'Native implementation present - polyfill not tested.');
}, 'TextDecoder Polyfill (will fail if natively supported)');

test(function() {
  assert_false(/\[native code\]/.test(String(TextEncoder)),
               'Native implementation present - polyfill not tested.');
}, 'TextEncoder Polyfill (will fail if natively supported)');

test(function() {
  assert_true('encoding' in new TextEncoder());
  assert_equals(new TextEncoder().encoding, 'utf-8');

  assert_true('encoding' in new TextDecoder());
  assert_equals(new TextDecoder().encoding, 'utf-8');
  assert_equals(new TextDecoder('utf-16le').encoding, 'utf-16le');
  assert_true('fatal' in new TextDecoder());
  assert_false(new TextDecoder('utf-8').fatal);
  assert_true(new TextDecoder('utf-8', {fatal: true}).fatal);
  assert_true('ignoreBOM' in new TextDecoder());
  assert_false(new TextDecoder('utf-8').ignoreBOM);
  assert_true(new TextDecoder('utf-8', {ignoreBOM: true}).ignoreBOM);
}, 'Attributes');

test(function() {
  var badStrings = [
    { input: '\ud800', expected: '\ufffd' }, // Surrogate half
    { input: '\udc00', expected: '\ufffd' }, // Surrogate half
    { input: 'abc\ud800def', expected: 'abc\ufffddef' }, // Surrogate half
    { input: 'abc\udc00def', expected: 'abc\ufffddef' }, // Surrogate half
    { input: '\udc00\ud800', expected: '\ufffd\ufffd' } // Wrong order
  ];

  badStrings.forEach(
    function(t) {
      var encoded = new TextEncoder().encode(t.input);
      var decoded = new TextDecoder().decode(encoded);
      assert_equals(t.expected, decoded);
    });
}, 'bad data');

test(function() {
  var bad = [
    { encoding: 'utf-8', input: [0xC0] }, // ends early
    { encoding: 'utf-8', input: [0xC0, 0x00] }, // invalid trail
    { encoding: 'utf-8', input: [0xC0, 0xC0] }, // invalid trail
    { encoding: 'utf-8', input: [0xE0] }, // ends early
    { encoding: 'utf-8', input: [0xE0, 0x00] }, // invalid trail
    { encoding: 'utf-8', input: [0xE0, 0xC0] }, // invalid trail
    { encoding: 'utf-8', input: [0xE0, 0x80, 0x00] }, // invalid trail
    { encoding: 'utf-8', input: [0xE0, 0x80, 0xC0] }, // invalid trail
    { encoding: 'utf-8', input: [0xFC, 0x80, 0x80, 0x80, 0x80, 0x80] }, // > 0x10FFFF
    { encoding: 'utf-16le', input: [0x00] }, // truncated code unit
    { encoding: 'utf-16le', input: [0x00, 0xd8] }, // surrogate half
    { encoding: 'utf-16le', input: [0x00, 0xd8, 0x00, 0x00] }, // surrogate half
    { encoding: 'utf-16le', input: [0x00, 0xdc, 0x00, 0x00] }, // trail surrogate
    { encoding: 'utf-16le', input: [0x00, 0xdc, 0x00, 0xd8] }  // swapped surrogates
    // TODO: Single byte encoding cases
  ];

  bad.forEach(
    function(t) {
      assert_throws({name: 'TypeError'}, function() {
        new TextDecoder(t.encoding, {fatal: true}).decode(new Uint8Array(t.input));
      });
    });
}, 'fatal flag');

test(function() {
  var encodings = [
    { label: 'utf-8', encoding: 'utf-8' },
    { label: 'utf-16', encoding: 'utf-16le' },
    { label: 'utf-16le', encoding: 'utf-16le' },
    { label: 'utf-16be', encoding: 'utf-16be' },
    { label: 'ascii', encoding: 'windows-1252' },
    { label: 'iso-8859-1', encoding: 'windows-1252' }
  ];

  encodings.forEach(
    function(test) {
      assert_equals(new TextDecoder(test.label.toLowerCase()).encoding, test.encoding);
      assert_equals(new TextDecoder(test.label.toUpperCase()).encoding, test.encoding);
    });
}, 'Encoding names are case insensitive');

test(function() {
  var utf8_bom = [0xEF, 0xBB, 0xBF];
  var utf8 = [0x7A, 0xC2, 0xA2, 0xE6, 0xB0, 0xB4, 0xF0, 0x9D, 0x84, 0x9E, 0xF4, 0x8F, 0xBF, 0xBD];

  var utf16le_bom = [0xff, 0xfe];
  var utf16le = [0x7A, 0x00, 0xA2, 0x00, 0x34, 0x6C, 0x34, 0xD8, 0x1E, 0xDD, 0xFF, 0xDB, 0xFD, 0xDF];

  var utf16be_bom = [0xfe, 0xff];
  var utf16be = [0x00, 0x7A, 0x00, 0xA2, 0x6C, 0x34, 0xD8, 0x34, 0xDD, 0x1E, 0xDB, 0xFF, 0xDF, 0xFD];

  var string = 'z\xA2\u6C34\uD834\uDD1E\uDBFF\uDFFD'; // z, cent, CJK water, G-Clef, Private-use character

  // missing BOMs
  assert_equals(new TextDecoder('utf-8').decode(new Uint8Array(utf8)), string);
  assert_equals(new TextDecoder('utf-16le').decode(new Uint8Array(utf16le)), string);
  assert_equals(new TextDecoder('utf-16be').decode(new Uint8Array(utf16be)), string);

  // matching BOMs
  assert_equals(new TextDecoder('utf-8').decode(new Uint8Array(utf8_bom.concat(utf8))), string);
  assert_equals(new TextDecoder('utf-16le').decode(new Uint8Array(utf16le_bom.concat(utf16le))), string);
  assert_equals(new TextDecoder('utf-16be').decode(new Uint8Array(utf16be_bom.concat(utf16be))), string);

  // matching BOMs split
  var decoder8 = new TextDecoder('utf-8');
  assert_equals(decoder8.decode(new Uint8Array(utf8_bom.slice(0, 1)), {stream: true}), '');
  assert_equals(decoder8.decode(new Uint8Array(utf8_bom.slice(1).concat(utf8))), string);
  assert_equals(decoder8.decode(new Uint8Array(utf8_bom.slice(0, 2)), {stream: true}), '');
  assert_equals(decoder8.decode(new Uint8Array(utf8_bom.slice(2).concat(utf8))), string);
  var decoder16le = new TextDecoder('utf-16le');
  assert_equals(decoder16le.decode(new Uint8Array(utf16le_bom.slice(0, 1)), {stream: true}), '');
  assert_equals(decoder16le.decode(new Uint8Array(utf16le_bom.slice(1).concat(utf16le))), string);
  var decoder16be = new TextDecoder('utf-16be');
  assert_equals(decoder16be.decode(new Uint8Array(utf16be_bom.slice(0, 1)), {stream: true}), '');
  assert_equals(decoder16be.decode(new Uint8Array(utf16be_bom.slice(1).concat(utf16be))), string);

  // mismatching BOMs
  assert_not_equals(new TextDecoder('utf-8').decode(new Uint8Array(utf16le_bom.concat(utf8))), string);
  assert_not_equals(new TextDecoder('utf-8').decode(new Uint8Array(utf16be_bom.concat(utf8))), string);
  assert_not_equals(new TextDecoder('utf-16le').decode(new Uint8Array(utf8_bom.concat(utf16le))), string);
  assert_not_equals(new TextDecoder('utf-16le').decode(new Uint8Array(utf16be_bom.concat(utf16le))), string);
  assert_not_equals(new TextDecoder('utf-16be').decode(new Uint8Array(utf8_bom.concat(utf16be))), string);
  assert_not_equals(new TextDecoder('utf-16be').decode(new Uint8Array(utf16le_bom.concat(utf16be))), string);

  // ignore BOMs
  assert_equals(new TextDecoder('utf-8', {ignoreBOM: true})
                .decode(new Uint8Array(utf8_bom.concat(utf8))),
                '\uFEFF' + string);
  assert_equals(new TextDecoder('utf-16le', {ignoreBOM: true})
                .decode(new Uint8Array(utf16le_bom.concat(utf16le))),
                '\uFEFF' + string);
  assert_equals(new TextDecoder('utf-16be', {ignoreBOM: true})
                .decode(new Uint8Array(utf16be_bom.concat(utf16be))),
                '\uFEFF' + string);
}, 'Byte-order marks');

test(function() {
  assert_equals(new TextDecoder('utf-8').encoding, 'utf-8'); // canonical case
  assert_equals(new TextDecoder('UTF-16').encoding, 'utf-16le'); // canonical case and name
  assert_equals(new TextDecoder('UTF-16BE').encoding, 'utf-16be'); // canonical case and name
  assert_equals(new TextDecoder('iso8859-1').encoding, 'windows-1252'); // canonical case and name
  assert_equals(new TextDecoder('iso-8859-1').encoding, 'windows-1252'); // canonical case and name
}, 'Encoding names');

test(function() {
  var string = '\x00123ABCabc\x80\xFF\u0100\u1000\uFFFD\uD800\uDC00\uDBFF\uDFFF';
  var cases = [
    {
      encoding: 'utf-8',
      encoded: [0, 49, 50, 51, 65, 66, 67, 97, 98, 99, 194, 128, 195, 191, 196,
                128, 225, 128, 128, 239, 191, 189, 240, 144, 128, 128, 244, 143,
                191, 191]
    },
    {
      encoding: 'utf-16le',
      encoded: [0, 0, 49, 0, 50, 0, 51, 0, 65, 0, 66, 0, 67, 0, 97, 0, 98, 0,
                99, 0, 128, 0, 255, 0, 0, 1, 0, 16, 253, 255, 0, 216, 0, 220,
                255, 219, 255, 223]
    },
    {
      encoding: 'utf-16be',
      encoded: [0, 0, 0, 49, 0, 50, 0, 51, 0, 65, 0, 66, 0, 67, 0, 97, 0, 98, 0,
                99, 0, 128, 0, 255, 1, 0, 16, 0, 255, 253, 216, 0, 220, 0, 219,
                255, 223, 255]
      }
  ];

  cases.forEach(function(c) {
    for (var len = 1; len <= 5; ++len) {
      var out = '', decoder = new TextDecoder(c.encoding);
      for (var i = 0; i < c.encoded.length; i += len) {
        var sub = [];
        for (var j = i; j < c.encoded.length && j < i + len; ++j) {
          sub.push(c.encoded[j]);
        }
        out += decoder.decode(new Uint8Array(sub), {stream: true});
      }
      out += decoder.decode();
      assert_equals(out, string, 'streaming decode ' + c.encoding);
    }
  });
}, 'Streaming Decode');

test(function() {
  var jis = [0x82, 0xC9, 0x82, 0xD9, 0x82, 0xF1];
  var expected = '\u306B\u307B\u3093'; // Nihon
  assert_equals(new TextDecoder('shift_jis').decode(new Uint8Array(jis)), expected);
}, 'Shift_JIS Decode');

test(function() {
  ASCII_SUPERSETS.forEach(function(encoding) {
    var string = '', bytes = [];
    for (var i = 0; i < 128; ++i) {

      // Encodings that have escape codes in 0x00-0x7F
      if (encoding === 'iso-2022-jp' &&
          (i === 0x0E || i === 0x0F || i === 0x1B))
        continue;

      string += String.fromCharCode(i);
      bytes.push(i);
    }
    var ascii_encoded = new TextEncoder().encode(string);
    assert_equals(new TextDecoder(encoding).decode(ascii_encoded), string, encoding);
  });
}, 'Supersets of ASCII decode ASCII correctly');

test(function() {
  assert_throws({name: 'TypeError'}, function() { new TextDecoder('utf-8', {fatal: true}).decode(new Uint8Array([0xff])); });
  // This should not hang:
  new TextDecoder('utf-8').decode(new Uint8Array([0xff]));

  assert_throws({name: 'TypeError'}, function() { new TextDecoder('utf-16le', {fatal: true}).decode(new Uint8Array([0x00])); });
  // This should not hang:
  new TextDecoder('utf-16le').decode(new Uint8Array([0x00]));

  assert_throws({name: 'TypeError'}, function() { new TextDecoder('utf-16be', {fatal: true}).decode(new Uint8Array([0x00])); });
  // This should not hang:
  new TextDecoder('utf-16be').decode(new Uint8Array([0x00]));
}, 'Non-fatal errors at EOF');

test(function() {
  LEGACY_ENCODINGS.forEach(function(encoding) {
    assert_equals(new TextDecoder(encoding).encoding, encoding);
    assert_equals(new TextEncoder(encoding).encoding, 'utf-8');
  });
}, 'Legacy encodings supported only for decode, not encode');

test(function() {
  [
    'csiso2022kr',
    'hz-gb-2312',
    'iso-2022-cn',
    'iso-2022-cn-ext',
    'iso-2022-kr'
  ].forEach(function(encoding) {

    assert_equals(new TextEncoder(encoding).encoding, 'utf-8');

    assert_throws({name: 'RangeError'},
                  function() {
                    var decoder = new TextDecoder(encoding, {fatal: true});
                  });

    assert_throws({name: 'RangeError'},
                  function() {
                    var decoder = new TextDecoder(encoding, {fatal: false});
                    });
  });
}, 'Replacement encoding labels');

test(function() {
  var decoder = new TextDecoder();
  var bytes = [65, 66, 97, 98, 99, 100, 101, 102, 103, 104, 67, 68, 69, 70, 71, 72];
  var chars = 'ABabcdefghCDEFGH';
  var buffer = new Uint8Array(bytes).buffer;
  assert_equals(decoder.decode(buffer), chars,
               'Decoding from ArrayBuffer should match expected text.');

  ['Uint8Array', 'Int8Array', 'Uint8ClampedArray',
   'Uint16Array', 'Int16Array',
   'Uint32Array', 'Int32Array',
   'Float32Array', 'Float64Array'].forEach(function(typeName) {
     var type = self[typeName];

     var array = new type(buffer);
     assert_equals(decoder.decode(array), chars,
                   'Decoding from ' + typeName + ' should match expected text.');

     var subset = new type(buffer, type.BYTES_PER_ELEMENT, 8 / type.BYTES_PER_ELEMENT);
     assert_equals(decoder.decode(subset),
                   chars.substring(type.BYTES_PER_ELEMENT, type.BYTES_PER_ELEMENT + 8),
                   'Decoding from ' + typeName + ' should match expected text.');
   });
}, 'ArrayBuffer, ArrayBufferView and buffer offsets');

test(function() {
  assert_throws({name: 'RangeError'},
                function() { new TextDecoder(null); },
                'Null should coerce to "null" and be invalid encoding name.');

  assert_throws({name: 'TypeError'},
                function() { new TextDecoder('utf-8', ''); },
                'String should not coerce to dictionary.');

  assert_throws({name: 'TypeError'},
                function() { new TextDecoder('utf-8').decode(null, ''); },
                'String should not coerce to dictionary.');
}, 'Invalid parameters');

test(function() {
  assert_array_equals(
    [249,249,249,233,249,235,249,234,164,81,164,202],
    new TextEncoder('big5', {NONSTANDARD_allowLegacyEncoding: true})
      .encode('\u2550\u255E\u2561\u256A\u5341\u5345'));
}, 'NONSTANDARD - regression tests');

test(function() {
  // Regression test for https://github.com/whatwg/encoding/issues/22
  assert_equals(
    new TextDecoder('gb18030').decode(new Uint8Array([
      0xA8, 0xBC,
      0x81, 0x35, 0xF4, 0x37
    ])), '\u1E3F\uE7C7');
}, 'GB 18030 2000 vs 2005: U+1E3F, U+E7C7 (decoding)');

test(function() {
  // Regression test for https://github.com/whatwg/encoding/issues/22
  assert_array_equals(
    new TextEncoder('gb18030', {NONSTANDARD_allowLegacyEncoding: true})
      .encode('\u1E3F\uE7C7'),
    [
      0xA8, 0xBC,
      0x81, 0x35, 0xF4, 0x37
    ]);
}, 'NONSTANDARD - GB 18030 2000 vs 2005: U+1E3F, U+E7C7 (encoding)');

test(function() {
  // Regression test for https://github.com/whatwg/encoding/issues/17
  assert_throws(
    new TypeError,
    function() {
      new TextEncoder('gb18030', {NONSTANDARD_allowLegacyEncoding: true})
        .encode('\uE5E5');
    });
}, 'NONSTANDARD - gb18030: U+E5E5 (encoding)');


test(function() {
  // Regression test for https://github.com/whatwg/encoding/issues/15
  var encoder =
      new TextEncoder('iso-2022-jp', {NONSTANDARD_allowLegacyEncoding: true});

  [
    //'\u000E', '\u000F', '\u001B',
    '\u00A5\u000E', //'\u00A5\u000F',  '\u00A5\u001B'
  ].forEach(function(s) {
    assert_throws(new TypeError, function() { encoder.encode(s); });
  });

}, 'NONSTANDARD - iso-2022-jp encoding attack (encoding)');

['utf-16le', 'utf-16be'].forEach(function(encoding) {
  test(function() {
    var encoder = new TextEncoder(encoding, {NONSTANDARD_allowLegacyEncoding: true});
    var decoder = new TextDecoder(encoding);

    var sample = "z\xA2\u6C34\uD834\uDD1E\uDBFF\uDFFD";

    assert_equals(decoder.decode(encoder.encode(sample)), sample);

  }, 'NONSTANDARD - ' + encoding + ' (encoding)');
});

test(function() {
  var encoder = new TextEncoder();
  assert_array_equals([].slice.call(encoder.encode(false)), [102, 97, 108, 115, 101]);
  assert_array_equals([].slice.call(encoder.encode(0)), [48]);
}, 'encode() called with falsy arguments (polyfill bindings)');

test(function() {
  // Regression test for https://github.com/inexorabletash/text-encoding/issues/59
  assert_array_equals(
    new TextDecoder('windows-1255').decode(new Uint8Array([0xCA])), '\u05BA');
}, 'windows-1255 map 0xCA to U+05BA');

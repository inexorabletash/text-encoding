// This is free and unencumbered software released into the public domain.
// See LICENSE.md for more information.

// Extension to testharness.js API which avoids logging enormous strings
// on a coding failure.
function assert_string_equals(actual, expected, description) {
  // short circuit success case
  if (actual === expected) {
    assert_true(true, description + ": <actual> === <expected>");
    return;
  }

  // length check
  assert_equals(actual.length, expected.length,
                description + ": string lengths");

  for (var i = 0; i < actual.length; i++) {
    var a = actual.charCodeAt(i);
    var b = expected.charCodeAt(i);
    if (a !== b)
      assert_true(false,
                  description +
                  ": code unit " + i.toString() + " unequal: " +
                  cpname(a) + " != " + cpname(b)); // doesn't return
  }

  // It should be impossible to get here, because the initial
  // comparison failed, so either the length comparison or the
  // codeunit-by-codeunit comparison should also fail.
  assert_true(false, description + ": failed to detect string difference");
}

// Inspired by:
// http://ecmanaut.blogspot.com/2006/07/encoding-decoding-utf8-in-javascript.html
function encode_utf8(string) {
  var utf8 = unescape(encodeURIComponent(string));
  var octets = new Uint8Array(utf8.length), i;
  for (i = 0; i < utf8.length; i += 1) {
    octets[i] = utf8.charCodeAt(i);
  }
  return octets;
}

function decode_utf8(octets) {
  var utf8 = String.fromCharCode.apply(null, octets);
  return decodeURIComponent(escape(utf8));
}

// Helpers for test_utf_roundtrip.
function cpname(n) {
  if (n+0 !== n)
    return n.toString();
  var w = (n <= 0xFFFF) ? 4 : 6;
  return 'U+' + ('000000' + n.toString(16).toUpperCase()).slice(-w);
}

function genblock(from, len, skip) {
  var block = [];
  for (var i = 0; i < len; i += skip) {
    var cp = from + i;
    if (0xD800 <= cp && cp <= 0xDFFF)
      continue;
    if (cp < 0x10000) {
      block.push(String.fromCharCode(cp));
      continue;
    }
    cp = cp - 0x10000;
    block.push(String.fromCharCode(0xD800 + (cp >> 10)));
    block.push(String.fromCharCode(0xDC00 + (cp & 0x3FF)));
  }
  return block.join('');
}

function encode_utf16le(s) { return encode_utf16(s, true); }
function encode_utf16be(s) { return encode_utf16(s, false); }
function encode_utf16(s, le) {
  var a = new Uint8Array(s.length * 2), view = new DataView(a.buffer);
  s.split('').forEach(function(c, i) {
    view.setUint16(i * 2, c.charCodeAt(0), le);
  });
  return a;
}

function test_utf_roundtrip () {
  var MIN_CODEPOINT = 0;
  var MAX_CODEPOINT = 0x10FFFF;
  var BLOCK_SIZE = 0x1000;
  var SKIP_SIZE = 31;

  var TD_U16LE = new TextDecoder("UTF-16LE");
  var TD_U16BE = new TextDecoder("UTF-16BE");

  var TE_U8    = new TextEncoder();
  var TD_U8    = new TextDecoder("UTF-8");

  for (var i = MIN_CODEPOINT; i < MAX_CODEPOINT; i += BLOCK_SIZE) {
    var block_tag = cpname(i) + " - " + cpname(i + BLOCK_SIZE - 1);
    var block = genblock(i, BLOCK_SIZE, SKIP_SIZE);

    // test UTF-16LE, UTF-16BE, and UTF-8 encodings against themselves
    var encoded = encode_utf16le(block);
    var decoded = TD_U16LE.decode(encoded);
    assert_string_equals(block, decoded, "UTF-16LE round trip " + block_tag);

    encoded = encode_utf16be(block);
    decoded = TD_U16BE.decode(encoded);
    assert_string_equals(block, decoded, "UTF-16BE round trip " + block_tag);

    encoded = TE_U8.encode(block);
    decoded = TD_U8.decode(encoded);
    assert_string_equals(block, decoded, "UTF-8 round trip " + block_tag);

    // test TextEncoder(UTF-8) against the older idiom
    var exp_encoded = encode_utf8(block);
    assert_array_equals(encoded, exp_encoded,
                        "UTF-8 reference encoding " + block_tag);

    var exp_decoded = decode_utf8(exp_encoded);
    assert_string_equals(decoded, exp_decoded,
                         "UTF-8 reference decoding " + block_tag);
  }
}

function test_utf_samples () {
  // z, cent, CJK water, G-Clef, Private-use character
  var sample = "z\xA2\u6C34\uD834\uDD1E\uDBFF\uDFFD";
  var cases = [
    { encoding: "utf-8",
      expected: [0x7A, 0xC2, 0xA2, 0xE6, 0xB0, 0xB4, 0xF0, 0x9D, 0x84, 0x9E, 0xF4, 0x8F, 0xBF, 0xBD] },
    { encoding: "utf-16le",
      expected: [0x7A, 0x00, 0xA2, 0x00, 0x34, 0x6C, 0x34, 0xD8, 0x1E, 0xDD, 0xFF, 0xDB, 0xFD, 0xDF] },
    { encoding: "utf-16",
      expected: [0x7A, 0x00, 0xA2, 0x00, 0x34, 0x6C, 0x34, 0xD8, 0x1E, 0xDD, 0xFF, 0xDB, 0xFD, 0xDF] },
    { encoding: "utf-16be",
      expected: [0x00, 0x7A, 0x00, 0xA2, 0x6C, 0x34, 0xD8, 0x34, 0xDD, 0x1E, 0xDB, 0xFF, 0xDF, 0xFD] }
  ];

  cases.forEach(
    function(t) {
      var decoded = new TextDecoder(t.encoding)
                        .decode(new Uint8Array(t.expected));
      assert_equals(decoded, sample,
                    "expected equal decodings - " + t.encoding);
    });
}

test(test_utf_samples,
     "UTF-8, UTF-16LE, UTF-16BE - Encode/Decode - reference sample");

test(test_utf_roundtrip,
     "UTF-8, UTF-16LE, UTF-16BE - Encode/Decode - full roundtrip and "+
     "agreement with encode/decodeURIComponent");

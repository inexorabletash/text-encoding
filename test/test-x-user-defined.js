// NOTE: Requires testharness.js
// http://www.w3.org/2008/webapps/wiki/Harness

test(
  function() {
    assert_throws({name: 'TypeError'}, function() { new TextEncoder('x-user-defined'); });

    var decoder = new TextDecoder('x-user-defined');
    for (var i = 0; i < 0x80; ++i) {
      assert_equals(decoder.decode(new Uint8Array([i])), String.fromCharCode(i));
      assert_equals(decoder.decode(new Uint8Array([i + 0x80])), String.fromCharCode(i + 0xF780));
    }
  },
  "x-user-defined encoding"
);

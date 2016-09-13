// This is free and unencumbered software released into the public domain.
// See LICENSE.md for more information.

test(function() {
  var cases = [
    {bytes: [148, 57, 218, 51], string: '\uD83D\uDCA9' } // U+1F4A9 PILE OF POO
  ];

  cases.forEach(function(c) {
    assert_equals(new TextDecoder('gb18030').decode(new Uint8Array(c.bytes)),
                  c.string);
  });
}, 'gb18030 ranges');

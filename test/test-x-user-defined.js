// Copyright 2014 Joshua Bell. All rights reserved.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

// NOTE: Requires testharness.js
// http://www.w3.org/2008/webapps/wiki/Harness

test(
  function() {
    assert_throws({name: 'RangeError'}, function() { new TextEncoder('x-user-defined'); });

    var decoder = new TextDecoder('x-user-defined');
    for (var i = 0; i < 0x80; ++i) {
      assert_equals(decoder.decode(new Uint8Array([i])), String.fromCharCode(i));
      assert_equals(decoder.decode(new Uint8Array([i + 0x80])), String.fromCharCode(i + 0xF780));
    }
  },
  "x-user-defined encoding"
);

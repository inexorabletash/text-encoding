stringencoding
==============

This is a polyfill for the [Encoding Living Standard](http://encoding.spec.whatwg.org/)
API for the Web, allowing encoding and decoding of textual data to and from Typed Array
buffers for binary data in JavaScript

Basic examples and unit tests are included.

### API Overview ###

Scripts
```html
  <!-- Required for non-Unicode encodings -->
  <script src="encoding-indexes.js"></script>

  <script src="encoding.js"></script>
```

Basic Usage

```js
  var uint8array = TextEncoder(encoding).encode(string);
  var string = TextDecoder(encoding).decode(uint8array);
```

Streaming Decode

```js
  var string = "", decoder = TextDecoder(encoding), buffer;
  while (buffer = next_chunk()) { 
    string += decoder.decode(buffer, {stream:true});
  }
  string += decoder.decode(); // finish the stream
```

### Encodings ###

All encodings from the Encoding specification are supported:

utf-8 ibm864 ibm866 iso-8859-2 iso-8859-3 iso-8859-4 iso-8859-5 iso-8859-6 
iso-8859-7 iso-8859-8 iso-8859-10 iso-8859-13 iso-8859-14 iso-8859-15 iso-8859-16 
koi8-r koi8-u macintosh windows-874 windows-1250 windows-1251 windows-1252 
windows-1253 windows-1254 windows-1255 windows-1256 windows-1257 windows-1258 
x-mac-cyrillic gbk gb18030 hz-gb-2312 big5 euc-jp iso-2022-jp shift_jis euc-kr 
iso-2022-kr utf-16 utf-16be

(Some encodings may be supported under other names, e.g. ascii, iso-8859-1, etc.
See [Encoding](http://encoding.spec.whatwg.org/) for additional labels for each encoding.)

Encodings other than utf-8, utf-16 and utf-16be require an additional 
`encoding-indexes.js` file to be included. It is rather large 
(539kB uncompressed, 182kB gzipped); portions may be deleted if 
support for some encodings is not required.

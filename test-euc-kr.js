test(
  "euc-kr - U+AC02",
  function () {
    var bytes = [164,212,164,161,164,191,164,162];
    var string = "\uAC02";
    arrayEqual(TextEncoder("euc-kr").encode(string), bytes, "encoded");
    equal(TextDecoder("euc-kr").decode(new Uint8Array(bytes)), string, "decoded");
  });

test(
  "euc-kr - U+AC03",
  function () {
    var bytes = [164,212,164,161,164,191,164,163];
    var string = "\uAC03";
    arrayEqual(TextEncoder("euc-kr").encode(string), bytes, "encoded");
    equal(TextDecoder("euc-kr").decode(new Uint8Array(bytes)), string, "decoded");
  });

test(
  "euc-kr - U+AC05",
  function () {
    var bytes = [164,212,164,161,164,191,164,165];
    var string = "\uAC05";
    arrayEqual(TextEncoder("euc-kr").encode(string), bytes, "encoded");
    equal(TextDecoder("euc-kr").decode(new Uint8Array(bytes)), string, "decoded");
  });

test(
  "euc-kr - U+AC06",
  function () {
    var bytes = [164,212,164,161,164,191,164,166];
    var string = "\uAC06";
    arrayEqual(TextEncoder("euc-kr").encode(string), bytes, "encoded");
    equal(TextDecoder("euc-kr").decode(new Uint8Array(bytes)), string, "decoded");
  });

test(
  "euc-kr - U+AC0B",
  function () {
    var bytes = [164,212,164,161,164,191,164,172];
    var string = "\uAC0B";
    arrayEqual(TextEncoder("euc-kr").encode(string), bytes, "encoded");
    equal(TextDecoder("euc-kr").decode(new Uint8Array(bytes)), string, "decoded");
  });

test(
  "euc-kr - U+AC0C",
  function () {
    var bytes = [164,212,164,161,164,191,164,173];
    var string = "\uAC0C";
    arrayEqual(TextEncoder("euc-kr").encode(string), bytes, "encoded");
    equal(TextDecoder("euc-kr").decode(new Uint8Array(bytes)), string, "decoded");
  });

test(
  "euc-kr - U+AC0D",
  function () {
    var bytes = [164,212,164,161,164,191,164,174];
    var string = "\uAC0D";
    arrayEqual(TextEncoder("euc-kr").encode(string), bytes, "encoded");
    equal(TextDecoder("euc-kr").decode(new Uint8Array(bytes)), string, "decoded");
  });

test(
  "euc-kr - U+AC0E",
  function () {
    var bytes = [164,212,164,161,164,191,164,175];
    var string = "\uAC0E";
    arrayEqual(TextEncoder("euc-kr").encode(string), bytes, "encoded");
    equal(TextDecoder("euc-kr").decode(new Uint8Array(bytes)), string, "decoded");
  });

test(
  "euc-kr - U+AC0F",
  function () {
    var bytes = [164,212,164,161,164,191,164,176];
    var string = "\uAC0F";
    arrayEqual(TextEncoder("euc-kr").encode(string), bytes, "encoded");
    equal(TextDecoder("euc-kr").decode(new Uint8Array(bytes)), string, "decoded");
  });

test(
  "euc-kr - U+AC18",
  function () {
    var bytes = [164,212,164,161,164,191,164,187];
    var string = "\uAC18";
    arrayEqual(TextEncoder("euc-kr").encode(string), bytes, "encoded");
    equal(TextDecoder("euc-kr").decode(new Uint8Array(bytes)), string, "decoded");
  });


test(
  "euc-kr",
  function () {
    var bytes = [164,212,164,161,164,191,164,162];
    var string = "\uAC02";
    //arrayEqual(TextEncoder("euc-kr").encode(str), bytes, "encoded");
    equal(TextDecoder("euc-kr").decode(new Uint8Array(bytes)), string, "decoded");
  });


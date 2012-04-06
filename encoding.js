(function(global){
  "use strict";

  /** @const */ var eof = -1;

  /** @param {Uint8Array} bytes */
  function ByteInputStream(bytes) {
    var pos = 0;
    return {
      get: function() {
        return (pos >= bytes.length) ? eof : bytes[pos];
      },
      offset: function (n) {
        pos += n;
        if (pos < 0) {
          throw new Error("Seeking past start of the buffer");
        }
        if (pos > bytes.length) {
          throw new Error("Seeking past EOF");
        }
      },
      match: function(test) {
        if (test.length > pos + bytes.length) {
          return false;
        }
        var i;
        for (i = 0; i < test.length; i += 1) {
          if (bytes[pos + i] !== test[i]) {
            return false;
          }
        }
        return true;
      }
    };
  }

  /** @param {Array.<number>} bytes */
  function ByteOutputStream(bytes) {
    var pos = 0;
    return {
      write: function(o) {
        bytes[pos++] = o;
      }
    };
  }

  /** @param {string} string */
  function CodePointInputStream(string) {
    var i = 0, n = string.length;
    return {
      eof: function () {
        return (i >= n);
      },
      read: function () {
        if (i >= n) {
          return eof;
        }
        // Based on http://www.w3.org/TR/WebIDL/#idl-DOMString
        var c = string.charCodeAt(i);
        if (c < 0xD800 || c > 0xDFFF) {
          i += 1;
          return c;
        } else if (0xDC00 <= c && c <= 0xDFFF) {
          i += 1;
          return fallback_code_point;
        } else { // (0xD800 <= c && c <= 0xDBFF)
          if (i === n - 1) {
            i += 1;
            return fallback_code_point;
          }
          var d = string.charCodeAt(i + 1);
          if (0xDC00 <= d && d <= 0xDFFF) {
            var a = c & 0x3FF;
            var b = d & 0x3FF;
            i += 2;
            return 0x10000 + (a << 10) + b;
          } else {
            i += 1;
            return fallback_code_point;
          }
        }
      }
    };
  }

  function CodePointOutputStream() {
    var string = '';
    return {
      string: function () {
        return string;
      },
      emit: function(c) {
        if (c <= 0xFFFF) {
          string += String.fromCharCode(c);
        } else {
          c -= 0x10000;
          string += String.fromCharCode(0XD800 + ((c >> 10) & 0x3ff));
          string += String.fromCharCode(0XDC00 + (c & 0x3ff));
        }
      }
    };
  }

  /** @const */ var fallback_code_point = 0xFFFD;

  /** @type {Array.<{name:string,
   *                 labels:Array.<string>,
   *                 getEncoder:function({fatal:boolean}),
   *                 getDecoder:function({fatal:boolean}),
   *                 encoding:Array.<number>
   *               }>} */
  var codecs = [
    {
      name: 'binary',
      labels: ['binary'],
      getEncoder: function (options) { return new BinaryEncoder(options); },
      getDecoder: function (options) { return new BinaryDecoder(options); }
    },

    {
      name: 'utf-8',
      labels: ['utf-8'],
      getEncoder: function (options) { return new UTF8Encoder(options); },
      getDecoder: function (options) { return new UTF8Decoder(options); }
    },

    {
      name: "gbk",
      labels: ["chinese",
               "csgb2312",
               "csiso58gb231280",
               "gb2312",
               "gb_2312",
               "gb_2312-80",
               "gbk",
               "iso-ir-58",
               "x-gbk"],
      getDecoder: function (options) { return new GBKDecoder(false, options); }
    },

    {
      name: "gbk18030",
      labels: ["gb18030"],
      getDecoder: function (options) { return new GBKDecoder(true, options); }
    },

    {
      name: "hz-gb-2312",
      labels: ["hz-gb-2312"],
      getDecoder: function (options) { return new HZGB2312Decoder(options); }
    },

    {
      name: 'euc-jp',
      labels: ["cseucjpkdfmtjapanese",
               "euc-jp",
               "x-euc-jp"],
      getDecoder: function (options) { return new EUCJPDecoder(options); }
    },

    {
      name: "iso-2022-jp",
      labels: ["csiso2022jp",
               "iso-2022-jp"],
      getDecoder: function (options) { return new ISO2022JPDecoder(options); }
    },

    {
      name: "shift_jis",
      labels: ["csshiftjis",
               "ms_kanji",
               "shift-jis",
               "shift_jis",
               "windows-31j",
               "x-sjis"],
      getDecoder: function (options) { return new ShiftJISDecoder(options); }
    },

    {
      name: "euc-kr",
      labels: ["csksc56011987",
               "csueckr",
               "euc-kr",
               "iso-ir-149",
               "korean",
               "ks_c_5601-1989",
               "ksc5601",
               "ksc_5601",
               "windows-949"],
      getDecoder: function (options) { return new EUCKRDecoder(options); }
    },

    {
      name: "iso-2022-kr",
      labels: ["csiso2022kr",
               "iso-2022-kr"],
      getDecoder: function (options) { return new ISO2022KRDecoder(options); }
    },

    {
      name: 'utf-16le',
      labels: ['utf-16le', 'utf-16'],
      getEncoder: function (options) { return new UTF16Encoder(false, options); },
      getDecoder: function (options) { return new UTF16Decoder(false, options); }
    },

    {
      name: 'utf-16be',
      labels: ['utf-16be'],
      getEncoder: function (options) { return new UTF16Encoder(true, options); },
      getDecoder: function (options) { return new UTF16Decoder(true, options); }
    },

    // From: http://dvcs.w3.org/hg/encoding/raw-file/tip/single-byte-encodings.json
    {
      "name":"ibm864",
      "labels":["cp864","ibm864"],
      "encoding":[176,183,8729,8730,9618,9472,9474,9532,9508,9516,9500,9524,9488,9484,9492,9496,946,8734,966,177,189,188,8776,171,187,65271,65272,155,156,65275,65276,159,160,173,65154,163,164,65156,null,null,65166,65167,65173,65177,1548,65181,65185,65189,1632,1633,1634,1635,1636,1637,1638,1639,1640,1641,65233,1563,65201,65205,65209,1567,162,65152,65153,65155,65157,65226,65163,65165,65169,65171,65175,65179,65183,65187,65191,65193,65195,65197,65199,65203,65207,65211,65215,65217,65221,65227,65231,166,172,247,215,65225,1600,65235,65239,65243,65247,65251,65255,65259,65261,65263,65267,65213,65228,65230,65229,65249,65149,1617,65253,65257,65260,65264,65266,65232,65237,65269,65270,65245,65241,65265,9632,null],
      "notes":[
        "WebKit and Chromium map 1A, 1C, and 7F to U+001C, U+007F, and U+001A rather than U+001A, U+001C, and 007F. And they map 9B &amp; 9C, 9F, D7, D8, and F1 to U+FFFD, U+200B, U+FEC3, U+FEC7, and U+FE7C.",
        "Gecko maps 25 to U+066A rather than U+0025. And it maps 9B &amp; 9C, 9F, A6, A7, and FF to U+FEF8, U+FEFC, U+FE84, U+20AC, and U+25A0.",
        "Trident maps A6, A7, and FF to U+F8BE, U+F8BF, and U+F8C0.",
        "Presto does not support this encoding."
      ],
      "XXX":"Since Presto has no support, maybe we can remove this? Chromium only supports it because of WebKit..."
    },
    {
      "name":"ibm866",
      "labels":["cp866","ibm866"],
      "encoding":[1040,1041,1042,1043,1044,1045,1046,1047,1048,1049,1050,1051,1052,1053,1054,1055,1056,1057,1058,1059,1060,1061,1062,1063,1064,1065,1066,1067,1068,1069,1070,1071,1072,1073,1074,1075,1076,1077,1078,1079,1080,1081,1082,1083,1084,1085,1086,1087,9617,9618,9619,9474,9508,9569,9570,9558,9557,9571,9553,9559,9565,9564,9563,9488,9492,9524,9516,9500,9472,9532,9566,9567,9562,9556,9577,9574,9568,9552,9580,9575,9576,9572,9573,9561,9560,9554,9555,9579,9578,9496,9484,9608,9604,9612,9616,9600,1088,1089,1090,1091,1092,1093,1094,1095,1096,1097,1098,1099,1100,1101,1102,1103,1025,1105,1028,1108,1031,1111,1038,1118,176,8729,183,8730,8470,164,9632,160],
      "notes":[
        "WebKit maps 1A, 1C, and 7F to U+001C, U+007F, and U+001A rather than U+001A, U+001C, and 007F.",
        "Chromium does not support this encoding."
      ],
      "XXX":"Since Chromium has no support, maybe we can remove this?"
    },
    {
      "name":"iso-8859-2",
      "labels":["csisolatin2","iso-8859-2","iso-ir-101","iso8859-2","iso_8859-2","l2","latin2"],
      "encoding":[128,129,130,131,132,133,134,135,136,137,138,139,140,141,142,143,144,145,146,147,148,149,150,151,152,153,154,155,156,157,158,159,160,260,728,321,164,317,346,167,168,352,350,356,377,173,381,379,176,261,731,322,180,318,347,711,184,353,351,357,378,733,382,380,340,193,194,258,196,313,262,199,268,201,280,203,282,205,206,270,272,323,327,211,212,336,214,215,344,366,218,368,220,221,354,223,341,225,226,259,228,314,263,231,269,233,281,235,283,237,238,271,273,324,328,243,244,337,246,247,345,367,250,369,252,253,355,729]
    },
    {
      "name":"iso-8859-3",
      "labels":["csisolatin3","iso-8859-3","iso_8859-3","iso-ir-109","l3","latin3"],
      "encoding":[128,129,130,131,132,133,134,135,136,137,138,139,140,141,142,143,144,145,146,147,148,149,150,151,152,153,154,155,156,157,158,159,160,294,728,163,164,null,292,167,168,304,350,286,308,173,null,379,176,295,178,179,180,181,293,183,184,305,351,287,309,189,null,380,192,193,194,null,196,266,264,199,200,201,202,203,204,205,206,207,null,209,210,211,212,288,214,215,284,217,218,219,220,364,348,223,224,225,226,null,228,267,265,231,232,233,234,235,236,237,238,239,null,241,242,243,244,289,246,247,285,249,250,251,252,365,349,729],
      "notes":["Trident maps A5, AE, BE, C3, D0, E3, and F0 to U+F7F5, U+F7F6, U+F7F7, U+F7F8, U+F7F9, U+F7FA, and U+F7FB respectively."]
    },
    {
      "name":"iso-8859-4",
      "labels":["csisolatin4","iso-8859-4","iso_8859-4","iso-ir-110","l4","latin4"],
      "encoding":[128,129,130,131,132,133,134,135,136,137,138,139,140,141,142,143,144,145,146,147,148,149,150,151,152,153,154,155,156,157,158,159,160,260,312,342,164,296,315,167,168,352,274,290,358,173,381,175,176,261,731,343,180,297,316,711,184,353,275,291,359,330,382,331,256,193,194,195,196,197,198,302,268,201,280,203,278,205,206,298,272,325,332,310,212,213,214,215,216,370,218,219,220,360,362,223,257,225,226,227,228,229,230,303,269,233,281,235,279,237,238,299,273,326,333,311,244,245,246,247,248,371,250,251,252,361,363,729]
    },
    {
      "name":"iso-8859-5",
      "labels":["csisolatincyrillic","cyrillic","iso-8859-5","iso_8859-5","iso-ir-144"],
      "encoding":[128,129,130,131,132,133,134,135,136,137,138,139,140,141,142,143,144,145,146,147,148,149,150,151,152,153,154,155,156,157,158,159,160,1025,1026,1027,1028,1029,1030,1031,1032,1033,1034,1035,1036,173,1038,1039,1040,1041,1042,1043,1044,1045,1046,1047,1048,1049,1050,1051,1052,1053,1054,1055,1056,1057,1058,1059,1060,1061,1062,1063,1064,1065,1066,1067,1068,1069,1070,1071,1072,1073,1074,1075,1076,1077,1078,1079,1080,1081,1082,1083,1084,1085,1086,1087,1088,1089,1090,1091,1092,1093,1094,1095,1096,1097,1098,1099,1100,1101,1102,1103,8470,1105,1106,1107,1108,1109,1110,1111,1112,1113,1114,1115,1116,167,1118,1119]
    },
    {
      "name":"iso-8859-6",
      "labels":["arabic","csisolatinarabic","ecma-114","iso-8859-6","iso_8859-6","iso-ir-127"],
      "encoding":[128,129,130,131,132,133,134,135,136,137,138,139,140,141,142,143,144,145,146,147,148,149,150,151,152,153,154,155,156,157,158,159,160,null,null,null,164,null,null,null,null,null,null,null,1548,173,null,null,null,null,null,null,null,null,null,null,null,null,null,1563,null,null,null,1567,null,1569,1570,1571,1572,1573,1574,1575,1576,1577,1578,1579,1580,1581,1582,1583,1584,1585,1586,1587,1588,1589,1590,1591,1592,1593,1594,null,null,null,null,null,1600,1601,1602,1603,1604,1605,1606,1607,1608,1609,1610,1611,1612,1613,1614,1615,1616,1617,1618,null,null,null,null,null,null,null,null,null,null,null,null,null],
      "notes":["Trident maps A1-A3, A5-AB, AE-BA, BC-BE, C0, DB-DF, and F3-FF to U+F7C8-U+F7CA, U+F7CB-U+F7D1, U+F7D2-U+F7DE, U+F7DF-U+F7E1, U+F7E2, U+F7E3-U+F7E7, and U+F7E8-U+F7F4 respectively."]
    },
    {
      "name":"iso-8859-7",
      "labels":["csisolatingreek","ecma-118","elot_928","greek","greek8","iso-8859-7","iso_8859-7","iso-ir-126"],
      "encoding":[128,129,130,131,132,133,134,135,136,137,138,139,140,141,142,143,144,145,146,147,148,149,150,151,152,153,154,155,156,157,158,159,160,8216,8217,163,8364,8367,166,167,168,169,890,171,172,173,null,8213,176,177,178,179,900,901,902,183,904,905,906,187,908,189,910,911,912,913,914,915,916,917,918,919,920,921,922,923,924,925,926,927,928,929,null,931,932,933,934,935,936,937,938,939,940,941,942,943,944,945,946,947,948,949,950,951,952,953,954,955,956,957,958,959,960,961,962,963,964,965,966,967,968,969,970,971,972,973,974,null],
      "notes":["Trident maps A1, A2, A4, A5, AA, AE, D2, and FF, to U+02BD, U+02BC, U+F7C2, U+F7C3, U+F7C4, U+F7C5, U+F7C6, and U+F7C7 respectively."]
    },
    {
      "name":"iso-8859-8",
      "labels":["csisolatinhebrew","hebrew","iso-8859-8","iso-8859-8-i","iso-ir-138","iso_8859-8","visual"],
      "encoding":[128,129,130,131,132,133,134,135,136,137,138,139,140,141,142,143,144,145,146,147,148,149,150,151,152,153,154,155,156,157,158,159,160,null,162,163,164,165,166,167,168,169,215,171,172,173,174,175,176,177,178,179,180,181,182,183,184,185,247,187,188,189,190,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,8215,1488,1489,1490,1491,1492,1493,1494,1495,1496,1497,1498,1499,1500,1501,1502,1503,1504,1505,1506,1507,1508,1509,1510,1511,1512,1513,1514,null,null,8206,8207,null],
      "notes":["Trident maps A1, AF, BF-DE, and FB-FF to U+F79C, U+203E, U+F79D-U+F7BC, and U+F7BD-U+F7C1 respectively."]
    },
    {
      "name":"iso-8859-10",
      "labels":["csisolatin6","iso-8859-10","iso-ir-157","iso8859-10","l6","latin6"],
      "encoding":[128,129,130,131,132,133,134,135,136,137,138,139,140,141,142,143,144,145,146,147,148,149,150,151,152,153,154,155,156,157,158,159,160,260,274,290,298,296,310,167,315,272,352,358,381,173,362,330,176,261,275,291,299,297,311,183,316,273,353,359,382,8213,363,331,256,193,194,195,196,197,198,302,268,201,280,203,278,205,206,207,208,325,332,211,212,213,214,360,216,370,218,219,220,221,222,223,257,225,226,227,228,229,230,303,269,233,281,235,279,237,238,239,240,326,333,243,244,245,246,361,248,371,250,251,252,253,254,312]
    },
    {
      "name":"iso-8859-13",
      "labels":["iso-8859-13"],
      "encoding":[128,129,130,131,132,133,134,135,136,137,138,139,140,141,142,143,144,145,146,147,148,149,150,151,152,153,154,155,156,157,158,159,160,8221,162,163,164,8222,166,167,216,169,342,171,172,173,174,198,176,177,178,179,8220,181,182,183,248,185,343,187,188,189,190,230,260,302,256,262,196,197,280,274,268,201,377,278,290,310,298,315,352,323,325,211,332,213,214,215,370,321,346,362,220,379,381,223,261,303,257,263,228,229,281,275,269,233,378,279,291,311,299,316,353,324,326,243,333,245,246,247,371,322,347,363,252,380,382,8217]
    },
    {
      "name":"iso-8859-14",
      "labels":["iso-8859-14","iso8859-14"],
      "encoding":[128,129,130,131,132,133,134,135,136,137,138,139,140,141,142,143,144,145,146,147,148,149,150,151,152,153,154,155,156,157,158,159,160,7682,7683,163,266,267,7690,167,7808,169,7810,7691,7922,173,174,376,7710,7711,288,289,7744,7745,182,7766,7809,7767,7811,7776,7923,7812,7813,7777,192,193,194,195,196,197,198,199,200,201,202,203,204,205,206,207,372,209,210,211,212,213,214,7786,216,217,218,219,220,221,374,223,224,225,226,227,228,229,230,231,232,233,234,235,236,237,238,239,373,241,242,243,244,245,246,7787,248,249,250,251,252,253,375,255],
      "notes":["Trident does not support this encoding."]
    },
    {
      "name":"iso-8859-15",
      "labels":["iso-8859-15","iso_8859-15"],
      "encoding":[128,129,130,131,132,133,134,135,136,137,138,139,140,141,142,143,144,145,146,147,148,149,150,151,152,153,154,155,156,157,158,159,160,161,162,163,8364,165,352,167,353,169,170,171,172,173,174,175,176,177,178,179,381,181,182,183,382,185,186,187,338,339,376,191,192,193,194,195,196,197,198,199,200,201,202,203,204,205,206,207,208,209,210,211,212,213,214,215,216,217,218,219,220,221,222,223,224,225,226,227,228,229,230,231,232,233,234,235,236,237,238,239,240,241,242,243,244,245,246,247,248,249,250,251,252,253,254,255]
    },
    {
      "name":"iso-8859-16",
      "labels":["iso-8859-16"],
      "encoding":[128,129,130,131,132,133,134,135,136,137,138,139,140,141,142,143,144,145,146,147,148,149,150,151,152,153,154,155,156,157,158,159,160,260,261,321,8364,8222,352,167,353,169,536,171,377,173,378,379,176,177,268,322,381,8221,182,183,382,269,537,187,338,339,376,380,192,193,194,258,196,262,198,199,200,201,202,203,204,205,206,207,272,323,210,211,212,336,214,346,368,217,218,219,220,280,538,223,224,225,226,259,228,263,230,231,232,233,234,235,236,237,238,239,273,324,242,243,244,337,246,347,369,249,250,251,252,281,539,255],
      "notes":["Trident does not support this encoding."]
    },
    {
      "name":"koi8-r",
      "labels":["koi8-r", "koi8_r"],
      "encoding":[9472,9474,9484,9488,9492,9496,9500,9508,9516,9524,9532,9600,9604,9608,9612,9616,9617,9618,9619,8992,9632,8729,8730,8776,8804,8805,160,8993,176,178,183,247,9552,9553,9554,1105,9555,9556,9557,9558,9559,9560,9561,9562,9563,9564,9565,9566,9567,9568,9569,1025,9570,9571,9572,9573,9574,9575,9576,9577,9578,9579,9580,169,1102,1072,1073,1094,1076,1077,1092,1075,1093,1080,1081,1082,1083,1084,1085,1086,1087,1103,1088,1089,1090,1091,1078,1074,1100,1099,1079,1096,1101,1097,1095,1098,1070,1040,1041,1062,1044,1045,1060,1043,1061,1048,1049,1050,1051,1052,1053,1054,1055,1071,1056,1057,1058,1059,1046,1042,1068,1067,1047,1064,1069,1065,1063,1066]
    },
    {
      "name":"koi8-u",
      "labels":["koi8-u"],
      "encoding":[9472,9474,9484,9488,9492,9496,9500,9508,9516,9524,9532,9600,9604,9608,9612,9616,9617,9618,9619,8992,9632,8729,8730,8776,8804,8805,160,8993,176,178,183,247,9552,9553,9554,1105,1108,9556,1110,1111,9559,9560,9561,9562,9563,1169,9565,9566,9567,9568,9569,1025,1028,9571,1030,1031,9574,9575,9576,9577,9578,1168,9580,169,1102,1072,1073,1094,1076,1077,1092,1075,1093,1080,1081,1082,1083,1084,1085,1086,1087,1103,1088,1089,1090,1091,1078,1074,1100,1099,1079,1096,1101,1097,1095,1098,1070,1040,1041,1062,1044,1045,1060,1043,1061,1048,1049,1050,1051,1052,1053,1054,1055,1071,1056,1057,1058,1059,1046,1042,1068,1067,1047,1064,1069,1065,1063,1066],
      "notes":["Trident maps AE and BE to U+045E and U+040E respectively."]
    },
    {
      "name":"macintosh",
      "labels":["csmacintosh","mac","macintosh","x-mac-roman"],
      "encoding":[196,197,199,201,209,214,220,225,224,226,228,227,229,231,233,232,234,235,237,236,238,239,241,243,242,244,246,245,250,249,251,252,8224,176,162,163,167,8226,182,223,174,169,8482,180,168,8800,198,216,8734,177,8804,8805,165,181,8706,8721,8719,960,8747,170,186,937,230,248,191,161,172,8730,402,8776,8710,171,187,8230,160,192,195,213,338,339,8211,8212,8220,8221,8216,8217,247,9674,255,376,8260,8364,8249,8250,64257,64258,8225,183,8218,8222,8240,194,202,193,203,200,205,206,207,204,211,212,63743,210,218,219,217,305,710,732,175,728,729,730,184,733,731,711],
      "notes":["Trident maps BD to U+2126."]
    },
    {
      "name":"windows-874",
      "labels":["iso-8859-11","tis-620","windows-874"],
      "encoding":[8364,129,130,131,132,8230,134,135,136,137,138,139,140,141,142,143,144,8216,8217,8220,8221,8226,8211,8212,152,153,154,155,156,157,158,159,160,3585,3586,3587,3588,3589,3590,3591,3592,3593,3594,3595,3596,3597,3598,3599,3600,3601,3602,3603,3604,3605,3606,3607,3608,3609,3610,3611,3612,3613,3614,3615,3616,3617,3618,3619,3620,3621,3622,3623,3624,3625,3626,3627,3628,3629,3630,3631,3632,3633,3634,3635,3636,3637,3638,3639,3640,3641,3642,63681,63682,63683,63684,3647,3648,3649,3650,3651,3652,3653,3654,3655,3656,3657,3658,3659,3660,3661,3662,3663,3664,3665,3666,3667,3668,3669,3670,3671,3672,3673,3674,3675,63685,63686,63687,63688],
      "notes":["Gecko and Presto map 81-84, 86-90, 98-9F, DB-DE, and FC-FF to U+FFFD."]
    },
    {
      "name":"windows-1250",
      "labels":["windows-1250","x-cp1250"],
      "encoding":[8364,129,8218,131,8222,8230,8224,8225,136,8240,352,8249,346,356,381,377,144,8216,8217,8220,8221,8226,8211,8212,152,8482,353,8250,347,357,382,378,160,711,728,321,164,260,166,167,168,169,350,171,172,173,174,379,176,177,731,322,180,181,182,183,184,261,351,187,317,733,318,380,340,193,194,258,196,313,262,199,268,201,280,203,282,205,206,270,272,323,327,211,212,336,214,215,344,366,218,368,220,221,354,223,341,225,226,259,228,314,263,231,269,233,281,235,283,237,238,271,273,324,328,243,244,337,246,247,345,367,250,369,252,253,355,729],
      "notes":["Gecko and Presto map 81, 83, 88, 90, and 98 to U+FFFD."]
    },
    {
      "name":"windows-1251",
      "labels":["windows-1251","x-cp1251"],
      "encoding":[1026,1027,8218,1107,8222,8230,8224,8225,8364,8240,1033,8249,1034,1036,1035,1039,1106,8216,8217,8220,8221,8226,8211,8212,152,8482,1113,8250,1114,1116,1115,1119,160,1038,1118,1032,164,1168,166,167,1025,169,1028,171,172,173,174,1031,176,177,1030,1110,1169,181,182,183,1105,8470,1108,187,1112,1029,1109,1111,1040,1041,1042,1043,1044,1045,1046,1047,1048,1049,1050,1051,1052,1053,1054,1055,1056,1057,1058,1059,1060,1061,1062,1063,1064,1065,1066,1067,1068,1069,1070,1071,1072,1073,1074,1075,1076,1077,1078,1079,1080,1081,1082,1083,1084,1085,1086,1087,1088,1089,1090,1091,1092,1093,1094,1095,1096,1097,1098,1099,1100,1101,1102,1103],
      "notes":["Gecko and Presto map 98 to U+FFFD."]
    },
    {
      "name":"windows-1252",
      "labels":["ascii","ansi_x3.4-1968","csisolatin1","iso-8859-1","iso8859-1","iso_8859-1","l1","latin1","us-ascii","windows-1252"],
      "encoding":[8364,129,8218,402,8222,8230,8224,8225,710,8240,352,8249,338,141,381,143,144,8216,8217,8220,8221,8226,8211,8212,732,8482,353,8250,339,157,382,376,160,161,162,163,164,165,166,167,168,169,170,171,172,173,174,175,176,177,178,179,180,181,182,183,184,185,186,187,188,189,190,191,192,193,194,195,196,197,198,199,200,201,202,203,204,205,206,207,208,209,210,211,212,213,214,215,216,217,218,219,220,221,222,223,224,225,226,227,228,229,230,231,232,233,234,235,236,237,238,239,240,241,242,243,244,245,246,247,248,249,250,251,252,253,254,255]
    },
    {
      "name":"windows-1253",
      "labels":["cp1253","windows-1253"],
      "encoding":[8364,129,8218,402,8222,8230,8224,8225,136,8240,138,8249,140,141,142,143,144,8216,8217,8220,8221,8226,8211,8212,152,8482,154,8250,156,157,158,159,160,901,902,163,164,165,166,167,168,169,170,171,172,173,174,8213,176,177,178,179,900,181,182,183,904,905,906,187,908,189,910,911,912,913,914,915,916,917,918,919,920,921,922,923,924,925,926,927,928,929,null,931,932,933,934,935,936,937,938,939,940,941,942,943,944,945,946,947,948,949,950,951,952,953,954,955,956,957,958,959,960,961,962,963,964,965,966,967,968,969,970,971,972,973,974,null],
      "notes":["Gecko and Presto map 81, 88, 8A, 8C-90, 98, 9A, 9C-9F, and AA to U+FFFD. Trident maps AA, D2, and FF to U+F8F9, U+F8FA, and U+F8FB respectively."]
    },
    {
      "name":"windows-1254",
      "labels":["csisolatin5","iso-8859-9","iso-ir-148","l5","latin5","windows-1254"],
      "encoding":[8364,129,8218,402,8222,8230,8224,8225,710,8240,352,8249,338,141,142,143,144,8216,8217,8220,8221,8226,8211,8212,732,8482,353,8250,339,157,158,376,160,161,162,163,164,165,166,167,168,169,170,171,172,173,174,175,176,177,178,179,180,181,182,183,184,185,186,187,188,189,190,191,192,193,194,195,196,197,198,199,200,201,202,203,204,205,206,207,286,209,210,211,212,213,214,215,216,217,218,219,220,304,350,223,224,225,226,227,228,229,230,231,232,233,234,235,236,237,238,239,287,241,242,243,244,245,246,247,248,249,250,251,252,305,351,255],
      "notes":[
        "Gecko and Presto map 81, 8D, 8E, 8F, 90, 9D, and 9E to U+FFFD.\n<!-- Presto fixed this for these and others; prolly in Opera 12 -->",
                                                                                                "Gecko has not yet made \"<code title>latin5</code>\" (and others) a label for this encoding. (But per HTML and this specification which will replace HTML on this front they should.)"
                                                                                                ]
    },
    {
      "name":"windows-1255",
      "labels":["cp1255","windows-1255"],
      "encoding":[8364,129,8218,402,8222,8230,8224,8225,710,8240,138,8249,140,141,142,143,144,8216,8217,8220,8221,8226,8211,8212,732,8482,154,8250,156,157,158,159,160,161,162,163,8362,165,166,167,168,169,215,171,172,173,174,175,176,177,178,179,180,181,182,183,184,185,247,187,188,189,190,191,1456,1457,1458,1459,1460,1461,1462,1463,1464,1465,null,1467,1468,1469,1470,1471,1472,1473,1474,1475,1520,1521,1522,1523,1524,null,null,null,null,null,null,null,1488,1489,1490,1491,1492,1493,1494,1495,1496,1497,1498,1499,1500,1501,1502,1503,1504,1505,1506,1507,1508,1509,1510,1511,1512,1513,1514,null,null,8206,8207,null],
      "notes":["Gecko and Presto map 81, 8A, 8C-90, 9A, and 9C-9F to U+FFFD. Trident maps CA, D9-DF, FB-FC, and FF to U+05BA, U+F88D-U+F893, U+F894-U+F895, and U+F896."]
    },
    {
      "name":"windows-1256",
      "labels":["cp1256","windows-1256"],
      "encoding":[8364,1662,8218,402,8222,8230,8224,8225,710,8240,1657,8249,338,1670,1688,1672,1711,8216,8217,8220,8221,8226,8211,8212,1705,8482,1681,8250,339,8204,8205,1722,160,1548,162,163,164,165,166,167,168,169,1726,171,172,173,174,175,176,177,178,179,180,181,182,183,184,185,1563,187,188,189,190,1567,1729,1569,1570,1571,1572,1573,1574,1575,1576,1577,1578,1579,1580,1581,1582,1583,1584,1585,1586,1587,1588,1589,1590,215,1591,1592,1593,1594,1600,1601,1602,1603,224,1604,226,1605,1606,1607,1608,231,232,233,234,235,1609,1610,238,239,1611,1612,1613,1614,244,1615,1616,247,1617,249,1618,251,252,8206,8207,1746]
    },
    {
      "name":"windows-1257",
      "labels":["windows-1257"],
      "encoding":[8364,129,8218,131,8222,8230,8224,8225,136,8240,138,8249,140,168,711,184,144,8216,8217,8220,8221,8226,8211,8212,152,8482,154,8250,156,175,731,159,160,null,162,163,164,null,166,167,216,169,342,171,172,173,174,198,176,177,178,179,180,181,182,183,248,185,343,187,188,189,190,230,260,302,256,262,196,197,280,274,268,201,377,278,290,310,298,315,352,323,325,211,332,213,214,215,370,321,346,362,220,379,381,223,261,303,257,263,228,229,281,275,269,233,378,279,291,311,299,316,353,324,326,243,333,245,246,247,371,322,347,363,252,380,382,729],
      "notes":["Gecko and Presto map 81, 83, 88, 8A, 8C, 90, 98, 9A, 9C, and 9F to U+FFFD. Trident maps A1 and A5 to U+F8FC and U+F8FD."]
    },
    {
      "name":"windows-1258",
      "labels":["cp1258","windows-1258"],
      "encoding":[8364,129,8218,402,8222,8230,8224,8225,710,8240,138,8249,338,141,142,143,144,8216,8217,8220,8221,8226,8211,8212,732,8482,154,8250,339,157,158,376,160,161,162,163,164,165,166,167,168,169,170,171,172,173,174,175,176,177,178,179,180,181,182,183,184,185,186,187,188,189,190,191,192,193,194,258,196,197,198,199,200,201,202,203,768,205,206,207,272,209,777,211,212,416,214,215,216,217,218,219,220,431,771,223,224,225,226,259,228,229,230,231,232,233,234,235,769,237,238,239,273,241,803,243,244,417,246,247,248,249,250,251,252,432,8363,255],
      "notes":["Gecko and Presto map 81, 8A, 8D-90, 9A, and 9D-9E to U+FFFD."]
    },
    {
      "name":"x-mac-cyrillic",
      "labels":["x-mac-cyrillic","x-mac-ukrainian"],
      "encoding":[1040,1041,1042,1043,1044,1045,1046,1047,1048,1049,1050,1051,1052,1053,1054,1055,1056,1057,1058,1059,1060,1061,1062,1063,1064,1065,1066,1067,1068,1069,1070,1071,8224,176,1168,163,167,8226,182,1030,174,169,8482,1026,1106,8800,1027,1107,8734,177,8804,8805,1110,181,1169,1032,1028,1108,1031,1111,1033,1113,1034,1114,1112,1029,172,8730,402,8776,8710,171,187,8230,160,1035,1115,1036,1116,1109,8211,8212,8220,8221,8216,8217,247,8222,1038,1118,1039,1119,8470,1025,1105,1103,1072,1073,1074,1075,1076,1077,1078,1079,1080,1081,1082,1083,1084,1085,1086,1087,1088,1089,1090,1091,1092,1093,1094,1095,1096,1097,1098,1099,1100,1101,1102,8364]
    }
  ];

  /**
   * @constructor
   * @param {{fatal: boolean}} options
   */
  function BinaryEncoder(options) {
    var fatal = options.fatal;
    this.encode = function (output_byte_stream, input_code_point_stream) {
      var code_point = input_code_point_stream.read();
      if (code_point === eof) {
        return;
      }
      if (code_point > 0xff) {
        throw new Error('Invalid binary string data');
      }
      output_byte_stream.write(code_point);
    };
  }

  /**
   * @constructor
   * @param {{fatal: boolean}} options
   */
  function BinaryDecoder(options) {
    var fatal = options.fatal;
    this.decode = function (byte_pointer) {
      var bite = byte_pointer.get();
      if (bite === eof) {
        return eof;
      }
      byte_pointer.offset(1);
      return bite;
    };
  }

  /**
   * @constructor
   * @param {{fatal: boolean}} options
   */
  function UTF8Encoder(options) {
    var fatal = options.fatal;
    this.encode = function (output_byte_stream, input_code_point_stream) {
      var code_point = input_code_point_stream.read();
      if (code_point === eof) {
        return;
      }
      if (0xD800 <= code_point && code_point <= 0xDFFF) {
        throw new Error('Invalid code point');
      }
      if (0x0000 <= code_point && code_point <= 0x007f) {
        output_byte_stream.write(code_point);
        return;
      }
      var count, offset;
      if (0x0080 <= code_point && code_point <= 0x07FF) {
          count = 1;
        offset = 0xC0;
      } else if (0x0800 <= code_point && code_point <= 0xFFFF) {
        count = 2;
        offset = 0xE0;
      } else if (0x10000 <= code_point && code_point <= 0x10FFFF) {
        count = 3;
        offset = 0xF0;
      }
      output_byte_stream.write(Math.floor(code_point / Math.pow(64, count)) + offset);
      while (count > 0) {
        var temp = Math.floor(code_point / Math.pow(64, count - 1));
        output_byte_stream.write(0x80 + (temp % 64));
        count -= 1;
      }
    };
  }

  /**
   * @param {boolean} fatal
   * @param {number=} opt_code_point
   * @return {number}
   */
  function decoderError(fatal, opt_code_point) {
    if (fatal) {
      throw new Error("EncodingError");
    }
    return opt_code_point || fallback_code_point;
  }

  /**
   * @constructor
   * @param {{fatal: boolean}} options
   */
  function UTF8Decoder(options) {
    var fatal = options.fatal;
    var /** @type {number} */ utf8_code_point = 0,
        /** @type {number} */ utf8_bytes_needed = 0,
        /** @type {number} */ utf8_bytes_seen = 0,
        /** @type {number} */ utf8_lower_boundary = 0;
    this.decode = function (byte_pointer) {
      var bite = byte_pointer.get();
      if (bite === eof) {
        if (utf8_bytes_needed !== 0) {
          return decoderError(fatal);
        }
        return eof;
      }
      byte_pointer.offset(1);

      if (utf8_bytes_needed === 0) {
        if (0x00 <= bite && bite <= 0x7F) {
          return bite;
        } else if (0xC0 <= bite && bite <= 0xDF) {
          utf8_bytes_needed = 1;
          utf8_lower_boundary = 0x80;
          utf8_code_point = bite - 0xC0;
        } else if (0xE0 <= bite && bite <= 0xEF) {
          utf8_bytes_needed = 2;
          utf8_lower_boundary = 0x800;
          utf8_code_point = bite - 0xE0;
        } else if (0xF0 <= bite && bite <= 0xF7) {
          utf8_bytes_needed = 3;
          utf8_lower_boundary = 0x10000;
          utf8_code_point = bite - 0xF0;
        } else if (0xF8 <= bite && bite <= 0xFB) {
          utf8_bytes_needed = 4;
          utf8_lower_boundary = 0x200000;
          utf8_code_point = bite - 0xF8;
        } else if (0xFC <= bite && bite <= 0xFD) {
          utf8_bytes_needed = 5;
          utf8_lower_boundary = 0x4000000;
          utf8_code_point = bite - 0xFC;
        } else {
          return decoderError(fatal);
        }
        utf8_code_point = utf8_code_point * Math.pow(64, utf8_bytes_needed);
        return null;
      }
      if (bite < 0x80 || bite > 0xBF) {
        utf8_code_point = 0;
        utf8_bytes_needed = 0;
        utf8_bytes_seen = 0;
        utf8_lower_boundary = 0;
        byte_pointer.offset(-1);
        return decoderError(fatal);
      }
      utf8_bytes_seen += 1;
      utf8_code_point = utf8_code_point + (bite - 0x80) * Math.pow(64, utf8_bytes_needed - utf8_bytes_seen);
      if (utf8_bytes_seen !== utf8_bytes_needed) {
        return null;
      }
      var code_point = utf8_code_point;
      var lower_boundary = utf8_lower_boundary;
      utf8_code_point = 0;
      utf8_bytes_needed = 0;
      utf8_bytes_seen = 0;
      utf8_lower_boundary = 0;
      if (code_point >= lower_boundary &&
          code_point <= 0x10FFFF &&
          (code_point < 0XD800 || code_point > 0xDFFF)) {
        return code_point;
      }
      return decoderError(fatal);
    };
  }

  // Generic Encoders/Decoders for single byte encodings, using maps
  /**
   * @constructor
   * @param {Array.<number>} map
   * @param {{fatal: boolean}} options
   */
  function SingleByteEncoder(map, options) {
    var fatal = options.fatal;
    this.encode = function (output_byte_stream, input_code_point_stream) {
      var code_point = input_code_point_stream.read();
        if (code_point === eof) {
          return;
        }
      if (code_point <= 0x7f) {
        output_byte_stream.write(code_point);
      } else {
        var index = map.indexOf(code_point);
        if (index === -1) {
          throw new Error('Can not encode code point ' + code_point);
        }
        output_byte_stream.write(index + 128);
      }
    };
  }

  /**
   * @constructor
   * @param {Array.<number>} map
   * @param {{fatal: boolean}} options
   */
  function SingleByteDecoder(map, options) {
    var fatal = options.fatal;
    this.decode = function (byte_pointer) {
      var bite = byte_pointer.get();
      if (bite === eof) {
        return eof;
      }
      byte_pointer.offset(1);
      if (bite <= 0x7f) {
        return bite;
      } else {
        var code_point = map[bite - 128];
        if (code_point === null) {
          return decoderError(fatal);
        } else {
          return code_point;
        }
      }
    };
  }

  (function () {
    var i;
    for (i = 0; i < codecs.length; ++i) {
      if (codecs[i].encoding) {
        (function (map) {
          codecs[i].getEncoder = function (options) { return new SingleByteEncoder(map, options); };
          codecs[i].getDecoder = function (options) { return new SingleByteDecoder(map, options); };
        }(codecs[i].encoding));
      }
    }
  }());

  /**
   * @constructor
   * @param {boolean} utf16_be
   * @param {{fatal: boolean}} options
   */
  function UTF16Encoder(utf16_be, options) {
    var fatal = options.fatal;
    this.encode = function(output_byte_stream, input_code_point_stream) {
      function convert_to_bytes(code_unit) {
        var byte1 = code_unit >> 8;
        var byte2 = code_unit & 0xFF;
        if (utf16_be) {
          output_byte_stream.write(byte1);
          output_byte_stream.write(byte2);
        } else {
          output_byte_stream.write(byte2);
          output_byte_stream.write(byte1);
        }
      }
      var code_point = input_code_point_stream.read();
      if (code_point === eof) {
        return;
      }
      if (0xD800 <= code_point && code_point <= 0xDFFF) {
        throw new Error('Invalid code point');
      }
      if (code_point <= 0xFFFF) {
        convert_to_bytes(code_point);
      } else {
        var lead = ((code_point - 0x10000) / 0x400) + 0xD800;
        var trail = ((code_point - 0x10000) % 0x400) + 0xDC00;
        convert_to_bytes(lead);
        convert_to_bytes(trail);
      }
    };
  }

  /**
   * @constructor
   * @param {boolean} utf16_be
   * @param {{fatal: boolean}} options
   */
  function UTF16Decoder(utf16_be, options) {
    var fatal = options.fatal;
    var /** @type {?number} */ utf16_lead_byte = null,
        /** @type {?number} */ utf16_lead_surrogate = null;
    this.decode = function(byte_pointer) {
      var bite = byte_pointer.get();
      if (bite === eof) {
        if (utf16_lead_byte || utf16_lead_surrogate) {
          return decoderError(fatal);
        }
        return eof;
      }
      byte_pointer.offset(1);
      if (utf16_lead_byte === null) {
        utf16_lead_byte = bite;
        return null;
      }
      var code_point;
      if (utf16_be) {
        code_point = (utf16_lead_byte << 8) + bite;
      } else {
        code_point = (bite << 8) + utf16_lead_byte;
      }
      utf16_lead_byte = null;
      if (utf16_lead_surrogate !== null) {
        var lead_surrogate = utf16_lead_surrogate;
        utf16_lead_surrogate = null;
        if (0xDC00 <= code_point && code_point <= 0xDFFF) {
          return 0x10000 + (lead_surrogate - 0xD800) * 0x400 + (code_point - 0xDC00);
        } else {
          byte_pointer.offset(-2);
          return decoderError(fatal);
        }
      }
      if (0xD800 <= code_point && code_point <= 0xDBFF) {
        utf16_lead_surrogate = code_point;
        return null;
      }
      if (0xDC00 <= code_point && code_point <= 0xDFFF) {
        return decoderError(fatal);
      }
      return code_point;
    };
  }

  // TODO: Add this table/function
  /** @return {?number} */
  function gbkCodePoint() {
    return null;
  }

  /**
   * @constructor
   * @param {boolean} gb18030
   * @param {{fatal: boolean}} options
   */
  function GBKDecoder(gb18030, options) {
    var fatal = options.fatal;
    var /** @type {number} */ gbk_first = 0x00,
        /** @type {number} */ gbk_second = 0x00,
        /** @type {number} */ gbk_third = 0x00;
    this.decode = function(byte_pointer) {
      var bite = byte_pointer.get();
      if (bite === eof && gbk_first === 0x00 && gbk_second === 0x00 && gbk_third === 0x00) {
        return eof;
      }
      if (bite === eof && (gbk_first !== 0x00 || gbk_second !== 0x00 || gbk_third !== 0x00)) {
        gbk_first = 0x00;
        gbk_second = 0x00;
        gbk_third = 0x00;
        decoderError(fatal);
      }
      byte_pointer.offset(1);
      var code_point;
      if (gbk_third !== 0x00) {
        if (0x30 <= bite && bite <= 0x39) {
          // TODO: Spec incomplete
          code_point = gbkCodePoint();
          if (code_point !== null) {
            gbk_first = 0x00;
            gbk_second = 0x00;
            gbk_third = 0x00;
            return code_point;
          }
          byte_pointer.offset(-3);
          gbk_first = 0x00;
          gbk_second = 0x00;
          gbk_third = 0x00;
          return decoderError(fatal);
        }
      }
      if (gbk_second !== 0x00) {
        if (0x81 <= bite && bite <= 0xFE) {
          gbk_second = bite;
          return null;
        }
        byte_pointer.offset(-2);
        gbk_first = 0x00;
        gbk_second = 0x00;
        return decoderError(fatal);
      }
      if (gbk_first !== 0x00) {
        if (0x30 <= bite && bite <= 0x39 && gb18030) {
          gbk_second = bite;
          return null;
        }
        if (0x40 <= bite && bite <= 0xFE) {
          // TODO: Spec incomplete
          code_point = gbkCodePoint();
          gbk_first = 0x00;
          return code_point;
        }
        gbk_first = 0x00;
        return decoderError(fatal);
      }
      if (0x00 <= bite && bite <= 0x7F) {
        return bite;
      }
      if (bite === 0x80 && !gb18030) {
        return 0x20AC;
      }
      if (0x81 <= bite && bite <= 0xFE) {
        gbk_first = bite;
        return null;
      }
      return decoderError(fatal);
    };
  }

  /**
   * @constructor
   * @param {{fatal: boolean}} options
   */
  function HZGB2312Decoder(options) {
    var fatal = options.fatal;
    var /** @type {boolean} */ hzgb2312 = false,
        /** @type {number} */ hzgb2312_lead = 0x00;
    this.decode = function(byte_pointer) {
      var bite = byte_pointer.get();
      if (bite === eof && hzgb2312_lead === 0x00) {
        return eof;
      }
      if (bite === eof && hzgb2312_lead !== 0x00) {
        hzgb2312_lead = 0x00;
        return decoderError(fatal);
      }
      byte_pointer.offset(1);
      if (hzgb2312_lead === 0x7E) {
        hzgb2312_lead = 0x00;
        if (bite === 0x7B) {
          hzgb2312 = true;
          return null;
        }
        if (bite === 0x7D) {
          hzgb2312 = false;
          return null;
        }
        if (bite === 0x7E) {
          return 0x007E;
        }
        if (bite === 0x0A) {
          hzgb2312_lead = 0x00;
          return null;
        }
        byte_pointer.offset(-1);
        return decoderError(fatal);
      }
      if (hzgb2312_lead !== 0x00) {
        hzgb2312_lead = 0x00;
        // TODO: Spec incomplete
        var code_point = gbkCodePoint();
        if (0x20 <= bite && bite <= 0x7F && code_point != null) {
          return code_point;
        }
        if (bite === 0x0A) {
          hzgb2312 = false;
        }
        return decoderError(fatal);
      }
      if (bite === 0x7E) {
        hzgb2312_lead = 0x7E;
        return null;
      }
      if (hzgb2312) {
        if (0x20 <= bite && bite <= 0x7F) {
          hzgb2312_lead = bite;
          return null;
        }
        if (bite === 0x0A) {
          hzgb2312 = false;
        }
        return decoderError(fatal);
      }
      if (0x00 <= bite && bite <= 0x7F) {
        return bite;
      }
      return decoderError(fatal);
    };
  }

  // NOTE: prepend <script src="index-jis0208.js"></script> to enable
  var jis0208Index = global['jis0208Index'] || [];
  /** @return {?number} */
  function jis0208CodePoint(row, cell) {
    var location = row * 94 + cell;
    return jis0208Index[location] || null;
  }

  // NOTE: prepend <script src="index-jis0212.js"></script> to enable
  var jis0212Index = global['jis0212Index'] || [];
  /** @return {?number} */
  function jis0212CodePoint(row, cell) {
    var location = row * 94 + cell;
    return jis0212Index[location] || null;
  }

  /**
   * @constructor
   * @param {{fatal: boolean}} options
   */
  function EUCJPDecoder(options) {
    var fatal = options.fatal;
    var /** @type {number} */ eucjp_first = 0x00,
        /** @type {number} */ eucjp_second = 0x00;
    this.decode = function(byte_pointer) {
      var bite = byte_pointer.get();
      if (bite === eof) {
        if (eucjp_first === 0x00 && eucjp_second === 0x00) {
          return eof;
        } else {
          eucjp_first = 0x00;
          eucjp_second = 0x00;
          return decoderError(fatal);
        }
      }
      byte_pointer.offset(1);

      var lead, code_point;
      if (eucjp_second !== 0x00) {
        lead = eucjp_second;
        eucjp_second = 0x00;
        code_point = null;
        if (0xA1 <= lead && lead <= 0xFE && 0xA1 <= bite && bite <= 0xFE) {
          code_point = jis0212CodePoint(lead - 0xA1, bite - 0xA1);
        }
        if (code_point === null && (bite < 0xA1 || bite > 0xFE)) {
          byte_pointer.offset(-1);
        }
        if (code_point === null) {
          return decoderError(fatal);
        }
        return code_point;
      }
      if (eucjp_first === 0x8E && 0xA1 <= bite && bite <= 0xDF) {
        eucjp_first = 0x00;
        return 0xFF61 - 0xA1 + bite;
      }
      if (eucjp_first === 0x8F && 0xA1 <= bite && bite <= 0xFE) {
        eucjp_first = 0x00;
        eucjp_second = bite;
        return null;
      }
      if (eucjp_first !== 0x00) {
        lead = eucjp_first;
        eucjp_first = 0x00;
        code_point = null;
        if (0xA1 <= lead && lead <= 0xFE && 0xA1 <= bite && bite <= 0xFE) {
          code_point = jis0208CodePoint(lead - 0xA1, bite - 0xA1);
        }
        if (code_point === null && (bite < 0xA1 || bite > 0xFE)) {
          byte_pointer.offset(-1);
        }
        if (code_point === null) {
          return decoderError(fatal);
        }
        return code_point;
      }
      if (0x00 <= bite && bite <= 0x7F) {
        return bite;
      }
      if (bite === 0x8E || bite === 0x8F || (0xA1 <= bite && bite <= 0xFE)) {
        eucjp_first = bite;
        return null;
      }
      return decoderError(fatal);
    };
  }

  /**
   * @constructor
   * @param {{fatal: boolean}} options
   */
  function ISO2022JPDecoder(options) {
    var fatal = options.fatal;
    /** @enum */
    var state = {
      ASCII: 0,
      escape_start: 1,
      escape_middle: 2,
      escape_final: 3,
      lead: 4,
      trail: 5,
      Katakana: 6
    };
    var /** @type {number} */ iso2022jp_state = state.ASCII,
        /** @type {boolean} */ iso2022jp_jis0212 = false,
        /** @type {number} */ iso2022jp_lead = 0x00;
    this.decode = function(byte_pointer) {
      var bite = byte_pointer.get();
      if (bite !== eof) {
        byte_pointer.offset(1);
      }
      switch (iso2022jp_state) {
      default:
      case state.ASCII:
        if (bite === 0x1B) {
          iso2022jp_state = state.escape_start;
          return null;
        }
        if (0x00 <= bite && bite <= 0x7E) {
          return bite;
        }
        if (bite === eof) {
          return eof;
        }
        return decoderError(fatal);

      case state.escape_start:
        if (bite === 0x24 || bite === 0x28) {
          iso2022jp_lead = bite;
          iso2022jp_state = state.escape_middle;
          return null;
        }
        if (bite != eof) {
          byte_pointer.offset(-1);
        }
        iso2022jp_state = state.ASCII;
        return decoderError(fatal);

      case state.escape_middle:
        var lead = iso2022jp_lead;
        iso2022jp_lead = 0x00;
        if (lead === 0x24 && (bite === 0x40 || bite === 0x42)) {
          iso2022jp_jis0212 = false;
          iso2022jp_state = state.lead;
          return null;
        }
        if (lead === 0x24 && bite === 0x28) {
          iso2022jp_state = state.escape_final;
          return null;
        }
        if (lead === 0x28 && (bite === 0x42 || bite === 0x4A)) {
          iso2022jp_state = state.ASCII;
          return null;
        }
        if (lead === 0x28 && bite === 0x49) {
          iso2022jp_state = state.Katakana;
          return null;
        }
        if (bite === eof) {
          byte_pointer.offset(-1);
        } else {
          byte_pointer.offset(-2);
        }
        iso2022jp_state = state.ASCII;
        return decoderError(fatal);

      case state.escape_final:
        if (bite === 0x44) {
          iso2022jp_jis0212 = true;
          iso2022jp_state = state.lead;
          return null;
        }
        if (bite === eof) {
          byte_pointer.offset(-2);
        } else {
          byte_pointer.offset(-3);
        }
        iso2022jp_state = state.ASCII;
        return decoderError(fatal);

      case state.lead:
        if (bite === 0x0A) {
          iso2022jp_state = state.ASCII;
          return decoderError(fatal, 0x000A);
        }
        if (bite === 0x1B) {
          iso2022jp_state = state.escape_start;
          return null;
        }
        if (bite === eof) {
          return eof;
        }
        iso2022jp_lead = bite;
        iso2022jp_state = state.trail;
        return null;

      case state.trail:
        iso2022jp_state = state.lead;
        if (bite === eof) {
          return decoderError(fatal);
        }
        var code_point = null;
        if (0x21 <= iso2022jp_lead && iso2022jp_lead <= 0x7E &&
            0x21 <= bite && bite <= 0x7E) {
          if (iso2022jp_jis0212 === false) {
            code_point = jis0208CodePoint(iso2022jp_lead - 0x21, bite - 0x21);
          } else {
            code_point = jis0212CodePoint(iso2022jp_lead - 0x21, bite - 0x21);
          }
        }
        if (code_point === null) {
          return decoderError(fatal);
        }
        return code_point;

      case state.Katakana:
        if (bite === 0x1B) {
          iso2022jp_state = state.escape_start;
          return null;
        }
        if (0x21 <= bite && bite <= 0x5F) {
          return 0xFF61 - 0x21 + bite;
        }
        if (bite === eof) {
          return eof;
        }
        return decoderError(fatal);
      }
    };
  }

  /**
   * @constructor
   * @param {{fatal: boolean}} options
   */
  function ShiftJISDecoder(options) {
    var fatal = options.fatal;
    /** @const */ var shiftjis_fallback_code_point = 0x30FB;
    var /** @type{number} */ shiftjis_lead = 0x00;
    this.decode = function(byte_pointer) {
      var bite = byte_pointer.get();
      if (bite === eof && shiftjis_lead === 0) {
        return eof;
      }
      if (bite === eof && shiftjis_lead !== 0) {
        shiftjis_lead = 0x00;
        return decoderError(fatal);
      }
      byte_pointer.offset(1);
      if (shiftjis_lead !== 0x00) {
        var lead = shiftjis_lead;
        shiftjis_lead = 0x00;
        if ((0x40 <= bite && bite <= 0x7E) || (0x80 <= bite && bite <= 0xFC)) {
          var offset = (bite < 0x7F) ? 64 : 65;
          if (0xF0 <= lead && lead <= 0xF9) {
            return decoderError(fatal,
                                0xE000 + (lead - 0xF0) * 188 + bite - offset);
          }
          var adjust = (bite < 0x9F) ? 1 : 0;
          var lead_offset = (lead < 160) ? 112 : 176;
          if (adjust === 0) {
            offset = 159;
          }
          var row = (lead - lead_offset) << 1;
          row = row - adjust - 33;
          var code_point = jis0208CodePoint(row, bite - offset);
          if (code_point === null) {
            return decoderError(fatal, shiftjis_fallback_code_point);
          }
          return code_point;
        }
        byte_pointer.offset(-1);
        return decoderError(fatal);
      }
      if (0x00 <= bite && bite <= 0x80) {
        return bite;
      }
      if (bite === 0xA0) {
        return 0xF8F0;
      }
      if (0xA1 <= bite && bite <= 0xDF) {
        return 0xFF61 - 0xA1 + bite;
      }
      if (0xFD <= bite && bite <= 0xFF) {
        return 0xF7F4 + bite;
      }
      if ((0x81 <= bite && bite <= 0x9F) ||
          (0xE0 <= bite && bite <= 0xFC)) {
        shiftjis_lead  = bite;
        return null;
      }
      return decoderError(fatal);
    };
  }

  // NOTE: prepend <script src="index-euc-kr.js"></script> to enable
  var euckrIndex = global['euckrIndex'] || [];
  /** @return {?number} */
  function euckrCodePoint(index) {
    return euckrIndex[index] || null;
  }

  /**
   * @constructor
   * @param {{fatal: boolean}} options
   */
  function EUCKRDecoder(options) {
    var fatal = options.fatal;
    var /** @type {number} */ euckr_lead = 0x00;
    this.decode = function(byte_pointer) {
      var bite = byte_pointer.get();
      if (bite === eof && euckr_lead === 0) {
        return eof;
      }
      if (bite === eof && euckr_lead !== 0) {
        euckr_lead = 0x00;
        return decoderError(fatal);
      }
      byte_pointer.offset(1);
      if (euckr_lead !== 0x00) {
        var lead = euckr_lead;
        var index = null;
        euckr_lead = 0x00;

        if (0x81 <= lead && lead <= 0xC6) {
          var temp = (26 + 26 + 126) * (lead - 0x81);
          if (0x41 <= bite && bite <= 0x5A) {
            index = temp + bite - 0x41;
          } else if (0x61 <= bite && bite <= 0x7A) {
            index = temp + 26 + bite - 0x61;
          } else if (0x81 <= bite && bite <= 0xFE) {
            index = temp + 26 + 26 + bite - 0x81;
          }
        }

        if (0xC7 <= lead && lead <= 0xFD && 0xA1 <= bite && bite <= 0xFE) {
          index = (26 + 26 + 126) * (0xC7 - 0x81) + (lead - 0xC7) * 94 + (bite - 0xA1);
        }

        var code_point = (index === null) ? null : euckrCodePoint(index);
        if (index === null) {
          byte_pointer.offset(-1);
        }
        if (code_point === null) {
          return decoderError(fatal);
        }
        return code_point;
      }

      if (0x00 <= bite && bite <= 0x7F) {
        return bite;
      }

      if (0x81 <= euckr_lead && euckr_lead <= 0xFD) {
        euckr_lead = bite;
        return null;
      }

      return decoderError(fatal);
    };
  }

  /**
   * @constructor
   * @param {{fatal: boolean}} options
   */
  function ISO2022KRDecoder(options) {
    var fatal = options.fatal;
    /** @enum */
    var state = {
      ASCII: 0,
      lead: 1,
      trail: 2
    };
    var /** @type {number} */ iso2022kr_state = state.ASCII,
        /** @type {number} */ iso2022kr_lead = 0x00;
    this.decode = function(byte_pointer) {
      var bite = byte_pointer.get();
      if (bite !== eof) {
        byte_pointer.offset(1);
      }
      switch (iso2022kr_state) {
      default:
      case state.ASCII:
        if (bite === 0x0E) {
          iso2022kr_state = state.lead;
          return null;
        } else if (bite === 0x0F) {
          return null;
        } else if (0x00 <= bite && bite <= 0x7E) {
          return bite;
        } else if (bite === eof) {
          return eof;
        } else {
          return decoderError(fatal);
        }
      case state.lead:
        if (bite === 0x0A) {
          iso2022kr_state = state.ASCII;
          return decoderError(fatal, 0x000A);
        } else if (bite === 0x0E) {
          return null;
        } else if (bite === 0x0F) {
          iso2022kr_state = state.ASCII;
          return null;
        } else if (bite === eof) {
          return eof;
        } else {
          iso2022kr_lead = bite;
          iso2022kr_state = state.trail;
          return null;
        }
      case state.trail:
        iso2022kr_state = state.lead;
        if (bite === eof) {
          return decoderError(fatal);
        }
        var code_point = null;
        if (0x21 <= iso2022kr_lead && iso2022kr_lead <= 0x46 &&
            0x21 <= bite && bite <= 0x7E) {
          code_point = euckrCodePoint((26 + 26 + 126) * (iso2022kr_lead - 1) + 26 + 26 + bite - 1);
        } else if (0x74 <= iso2022kr_lead && iso2022kr_lead <= 0x7E &&
                   0x21 <= bite && bite <= 0x7E) {
          code_point = euckrCodePoint((26 + 26 + 126) * (0xC7 - 0x81) + (iso2022kr_lead - 0x47) * 94 + (bite - 0x21));
        }
        if (code_point !== null) {
          return code_point;
        }
        return decoderError(fatal);
      }
    };
  }


  function getEncoding(label) {
    label = String(label).trim().toLowerCase();
    var i;
    for (i = 0; i < codecs.length; ++i) {
      if (codecs[i].labels.indexOf(label) !== -1) {
        return codecs[i];
      }
    }
    throw new Error("Unknown encoding: " + label);
  }

  // NOTE: currently unused
  function detectEncoding(label, input_stream) {
    if (input_stream.match([0xFF, 0xFE])) {
      input_stream.offset(2);
      return 'utf-16';
    } else if (input_stream.match([0xFE, 0XFF])) {
      input_stream.offset(2);
      return 'utf-16be';
    } else if (input_stream.match([0xEF, 0xBB, 0xBF])) {
      input_stream.offset(3);
      return 'utf-8';
    }
    return label;
  }

  /** @const */ var DEFAULT_ENCODING = 'utf-8';

  /**
   * @constructor
   * @param {string=} encoding
   * @param {{fatal: boolean}=} options
   */
  function TextEncoder(encoding, options) {
    if (!this || this === global) {
      return new TextEncoder(encoding, options);
    }
    encoding = encoding ? String(encoding) : DEFAULT_ENCODING;
    options = Object(options);
    this._encoding = getEncoding(encoding); // may throw
    this._streaming = false;
    this._encoder = null;
    this._options = { fatal: Boolean(options.fatal) };
    return this;
  }

  TextEncoder.prototype = {
    /**
     * @param {string=} string
     * @param {{stream: boolean}=} options
     */
    encode: function encode(string, options) {
      string = string ? String(string) : "";
      options = Object(options);

      if (!this._streaming) {
        this._encoder = this._encoding.getEncoder(this._options);
      }
      this._streaming = Boolean(options.stream);

      var bytes = [];
      var output_stream = ByteOutputStream(bytes);
      var input_stream = CodePointInputStream(string);
      while (!input_stream.eof()) {
        this._encoder.encode(output_stream, input_stream, {
          // TODO: options?
        });
      }
      if (!this._streaming) {
        this._encoder.encode(output_stream, input_stream, {
          // TODO: options?
        });
        this._encoder = null;
      }
      return new Uint8Array(bytes);
    }
  };
  Object.defineProperty(TextEncoder.prototype, 'encoding',
    { get: function () { return this._encoding.name; } });


  /**
   * @constructor
   * @param {string=} encoding
   * @param {{fatal: boolean}=} options
   */
  function TextDecoder(encoding, options) {
    if (!this || this === global) {
      return new TextDecoder(encoding, options);
    }
    encoding = encoding ? String(encoding) : DEFAULT_ENCODING;
    options = Object(options);
    this._encoding = getEncoding(encoding); // may throw
    this._streaming = false;
    this._decoder = null;
    this._options = { fatal: Boolean(options.fatal) };
    return this;
  }

  // TODO: Issue if input byte stream is offset by decoder
  // TODO: BOM detection will not work if stream header spans multiple calls
  // (last N bytes of previous stream may need to be retained?)
  TextDecoder.prototype = {
    /**
     * @param {ArrayBufferView=} view
     * @param {{stream: boolean}=} options
     */
    decode: function decode(view, options) {
      if (view && !('buffer' in view && 'byteOffset' in view && 'byteLength' in view)) {
        throw new TypeError('Expected ArrayBufferView');
      } else if (!view) {
        view = new Uint8Array(0);
      }
      options = Object(options);

      if (!this._streaming) {
        this._decoder = this._encoding.getDecoder(this._options);
      }
      this._streaming = Boolean(options.stream);

      // TODO: encoding detection via BOM?

      var bytes = new Uint8Array(view.buffer, view.byteOffset, view.byteLength);
      var input_stream = ByteInputStream(bytes);

      var detected = detectEncoding(this._encoding.name, input_stream);
      if (getEncoding(detected) !== this._encoding) {
        throw new Error("BOM mismatch"); // TODO: what to do here?
      }

      var output_stream = CodePointOutputStream(), code_point;
      while (input_stream.get() !== eof) {
        code_point = this._decoder.decode(input_stream);
        if (code_point !== null && code_point !== eof) {
          output_stream.emit(code_point);
        }
      }
      if (!this._streaming) {
        do {
          code_point = this._decoder.decode(input_stream);
          if (code_point !== null && code_point !== eof) {
            output_stream.emit(code_point);
          }
        } while (code_point !== eof);
        this._decoder = null;
      }
      return output_stream.string();
    }
  };
  Object.defineProperty(TextDecoder.prototype, 'encoding',
    { get: function () { return this._encoding.name; } });

  global['TextEncoder'] = global['TextEncoder'] || TextEncoder;
  global['TextDecoder'] = global['TextDecoder'] || TextDecoder;
}(this));

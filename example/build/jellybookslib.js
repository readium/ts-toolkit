var jellybookslib =
/******/ (function(modules) { // webpackBootstrap
/******/ 	// The module cache
/******/ 	var installedModules = {};
/******/
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/
/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId]) {
/******/ 			return installedModules[moduleId].exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			i: moduleId,
/******/ 			l: false,
/******/ 			exports: {}
/******/ 		};
/******/
/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);
/******/
/******/ 		// Flag the module as loaded
/******/ 		module.l = true;
/******/
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/
/******/
/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;
/******/
/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;
/******/
/******/ 	// define getter function for harmony exports
/******/ 	__webpack_require__.d = function(exports, name, getter) {
/******/ 		if(!__webpack_require__.o(exports, name)) {
/******/ 			Object.defineProperty(exports, name, { enumerable: true, get: getter });
/******/ 		}
/******/ 	};
/******/
/******/ 	// define __esModule on exports
/******/ 	__webpack_require__.r = function(exports) {
/******/ 		if(typeof Symbol !== 'undefined' && Symbol.toStringTag) {
/******/ 			Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
/******/ 		}
/******/ 		Object.defineProperty(exports, '__esModule', { value: true });
/******/ 	};
/******/
/******/ 	// create a fake namespace object
/******/ 	// mode & 1: value is a module id, require it
/******/ 	// mode & 2: merge all properties of value into the ns
/******/ 	// mode & 4: return value when already ns object
/******/ 	// mode & 8|1: behave like require
/******/ 	__webpack_require__.t = function(value, mode) {
/******/ 		if(mode & 1) value = __webpack_require__(value);
/******/ 		if(mode & 8) return value;
/******/ 		if((mode & 4) && typeof value === 'object' && value && value.__esModule) return value;
/******/ 		var ns = Object.create(null);
/******/ 		__webpack_require__.r(ns);
/******/ 		Object.defineProperty(ns, 'default', { enumerable: true, value: value });
/******/ 		if(mode & 2 && typeof value != 'string') for(var key in value) __webpack_require__.d(ns, key, function(key) { return value[key]; }.bind(null, key));
/******/ 		return ns;
/******/ 	};
/******/
/******/ 	// getDefaultExport function for compatibility with non-harmony modules
/******/ 	__webpack_require__.n = function(module) {
/******/ 		var getter = module && module.__esModule ?
/******/ 			function getDefault() { return module['default']; } :
/******/ 			function getModuleExports() { return module; };
/******/ 		__webpack_require__.d(getter, 'a', getter);
/******/ 		return getter;
/******/ 	};
/******/
/******/ 	// Object.prototype.hasOwnProperty.call
/******/ 	__webpack_require__.o = function(object, property) { return Object.prototype.hasOwnProperty.call(object, property); };
/******/
/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "";
/******/
/******/
/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(__webpack_require__.s = "./src/main.ts");
/******/ })
/************************************************************************/
/******/ ({

/***/ "../shared-models/dist/index.js":
/*!**************************************!*\
  !*** ../shared-models/dist/index.js ***!
  \**************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";



if (false) {} else {
  module.exports = __webpack_require__(/*! ./shared-test.cjs.development.js */ "../shared-models/dist/shared-test.cjs.development.js")
}


/***/ }),

/***/ "../shared-models/dist/shared-test.cjs.development.js":
/*!************************************************************!*\
  !*** ../shared-models/dist/shared-test.cjs.development.js ***!
  \************************************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, '__esModule', { value: true });

/* Copyright 2020 Readium Foundation. All rights reserved.
 * Use of this source code is governed by a BSD-style license,
 * available in the LICENSE file present in the Github repository of the project.
 */

/** Wraps a dictionary parsed from a JSON string or a JSON Object */
var JSONDictionary = /*#__PURE__*/function () {
  function JSONDictionary(json) {
    if (typeof json === 'string') {
      this.json = JSON.parse(json);
    } else {
      this.json = json;
    }
  }
  /** Removes the given property and returns its value */


  var _proto = JSONDictionary.prototype;

  _proto.pop = function pop(key) {
    var value = this.json[key];
    delete this.json[key];
    return value;
  }
  /** Parses the given property AS-IS and removes it */
  ;

  _proto.parseRaw = function parseRaw(key) {
    return this.pop(key);
  }
  /** Parses the given array and removes it
   *  Parameter allowingSingle: If true, then allows the parsing of both a single value and an array.
   */
  ;

  _proto.parseArray = function parseArray(key, allowingSingle) {
    if (allowingSingle === void 0) {
      allowingSingle = false;
    }

    var result = this.pop(key);

    if (Array.isArray(result)) {
      return result;
    } else if (allowingSingle) {
      return [result];
    }

    return [];
  }
  /** Parses a numeric value, but returns null if it is not */
  ;

  _proto.parseNumber = function parseNumber(key) {
    var result = this.pop(key);

    if (!isNaN(result)) {
      return result;
    }

    return null;
  }
  /** Parses a numeric value, but returns null if it is not a positive number. */
  ;

  _proto.parsePositive = function parsePositive(key) {
    var result = this.pop(key);

    if (!isNaN(result) && Math.sign(result) >= 0) {
      return result;
    }

    return null;
  }
  /** Parses the given key and returns a Date (or null if it’s not a string) */
  ;

  _proto.parseDate = function parseDate(key) {
    var result = this.pop(key);

    if (typeof result === 'string') {
      return new Date(result);
    }

    return null;
  };

  return JSONDictionary;
}();

function _inheritsLoose(subClass, superClass) {
  subClass.prototype = Object.create(superClass.prototype);
  subClass.prototype.constructor = subClass;

  _setPrototypeOf(subClass, superClass);
}

function _getPrototypeOf(o) {
  _getPrototypeOf = Object.setPrototypeOf ? Object.getPrototypeOf : function _getPrototypeOf(o) {
    return o.__proto__ || Object.getPrototypeOf(o);
  };
  return _getPrototypeOf(o);
}

function _setPrototypeOf(o, p) {
  _setPrototypeOf = Object.setPrototypeOf || function _setPrototypeOf(o, p) {
    o.__proto__ = p;
    return o;
  };

  return _setPrototypeOf(o, p);
}

function _isNativeReflectConstruct() {
  if (typeof Reflect === "undefined" || !Reflect.construct) return false;
  if (Reflect.construct.sham) return false;
  if (typeof Proxy === "function") return true;

  try {
    Boolean.prototype.valueOf.call(Reflect.construct(Boolean, [], function () {}));
    return true;
  } catch (e) {
    return false;
  }
}

function _construct(Parent, args, Class) {
  if (_isNativeReflectConstruct()) {
    _construct = Reflect.construct;
  } else {
    _construct = function _construct(Parent, args, Class) {
      var a = [null];
      a.push.apply(a, args);
      var Constructor = Function.bind.apply(Parent, a);
      var instance = new Constructor();
      if (Class) _setPrototypeOf(instance, Class.prototype);
      return instance;
    };
  }

  return _construct.apply(null, arguments);
}

function _isNativeFunction(fn) {
  return Function.toString.call(fn).indexOf("[native code]") !== -1;
}

function _wrapNativeSuper(Class) {
  var _cache = typeof Map === "function" ? new Map() : undefined;

  _wrapNativeSuper = function _wrapNativeSuper(Class) {
    if (Class === null || !_isNativeFunction(Class)) return Class;

    if (typeof Class !== "function") {
      throw new TypeError("Super expression must either be null or a function");
    }

    if (typeof _cache !== "undefined") {
      if (_cache.has(Class)) return _cache.get(Class);

      _cache.set(Class, Wrapper);
    }

    function Wrapper() {
      return _construct(Class, arguments, _getPrototypeOf(this).constructor);
    }

    Wrapper.prototype = Object.create(Class.prototype, {
      constructor: {
        value: Wrapper,
        enumerable: false,
        writable: true,
        configurable: true
      }
    });
    return _setPrototypeOf(Wrapper, Class);
  };

  return _wrapNativeSuper(Class);
}

function _assertThisInitialized(self) {
  if (self === void 0) {
    throw new ReferenceError("this hasn't been initialised - super() hasn't been called");
  }

  return self;
}

function _unsupportedIterableToArray(o, minLen) {
  if (!o) return;
  if (typeof o === "string") return _arrayLikeToArray(o, minLen);
  var n = Object.prototype.toString.call(o).slice(8, -1);
  if (n === "Object" && o.constructor) n = o.constructor.name;
  if (n === "Map" || n === "Set") return Array.from(o);
  if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray(o, minLen);
}

function _arrayLikeToArray(arr, len) {
  if (len == null || len > arr.length) len = arr.length;

  for (var i = 0, arr2 = new Array(len); i < len; i++) arr2[i] = arr[i];

  return arr2;
}

function _createForOfIteratorHelperLoose(o, allowArrayLike) {
  var it = typeof Symbol !== "undefined" && o[Symbol.iterator] || o["@@iterator"];
  if (it) return (it = it.call(o)).next.bind(it);

  if (Array.isArray(o) || (it = _unsupportedIterableToArray(o)) || allowArrayLike && o && typeof o.length === "number") {
    if (it) o = it;
    var i = 0;
    return function () {
      if (i >= o.length) return {
        done: true
      };
      return {
        done: false,
        value: o[i++]
      };
    };
  }

  throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.");
}

/* Copyright 2020 Readium Foundation. All rights reserved.
 * Use of this source code is governed by a BSD-style license,
 * available in the LICENSE file present in the Github repository of the project.
 */

/** Represents a string media type.
 *  `MediaType` handles:
 *  - components parsing – eg. type, subtype and parameters,
 *  - media types comparison.
 */
var MediaType = /*#__PURE__*/function () {
  function MediaType(mediaType) {
    this.type = '';
    this.subtype = '';
    var components = mediaType.replace(/\s/g, '').split(';');
    var types = components[0].split('/');

    if (types.length === 2) {
      this.type = types[0].toLowerCase();
      this.subtype = types[1].toLowerCase();
    }

    var parameters = {};

    for (var i = 1; i < components.length; i++) {
      var component = components[i].split('=');

      if (component.length === 2) {
        var key = component[0];
        var value = component[1];
        parameters[key] = value;
      }
    }

    this.parameters = parameters;
    var parametersString = '';

    for (var p in parameters) {
      var _value = parameters[p];
      parametersString += ";" + p + "=" + _value;
    }

    this.string = this.type + "/" + this.subtype + parametersString;
    this.encoding = parameters['encoding'];
  }
  /** Structured syntax suffix, e.g. `+zip` in `application/epub+zip`.
   *  Gives a hint on the underlying structure of this media type.
   *  See. https://tools.ietf.org/html/rfc6838#section-4.2.8
   */


  var _proto = MediaType.prototype;

  _proto.structuredSyntaxSuffix = function structuredSyntaxSuffix() {
    var parts = this.subtype.split('+');
    return parts.length > 1 ? "+" + parts[parts.length - 1] : null;
  }
  /** Returns whether the given `other` media type is included in this media type.
   *  For example, `text/html` contains `text/html;charset=utf-8`.
   *  - `other` must match the parameters in the `parameters` property, but extra parameters
   *  are ignored.
   *  - Order of parameters is ignored.
   *  - Wildcards are supported, meaning that `image/*` contains `image/png`
   */
  ;

  _proto.contains = function contains(other) {
    if (typeof other === 'string' || other instanceof String) {
      other = new MediaType(other);
    }

    if ((this.type === '*' || this.type === other.type) && (this.subtype === '*' || this.subtype === other.subtype)) {
      return true;
    }

    return false;
  }
  /** Returns whether this media type and `other` are the same, ignoring parameters that
   *  are not in both media types.
   *  For example, `text/html` matches `text/html;charset=utf-8`, but `text/html;charset=ascii`
   *  doesn't. This is basically like `contains`, but working in both direction.
   */
  ;

  _proto.matches = function matches(other) {
    if (typeof other === 'string' || other instanceof String) {
      other = new MediaType(other);
    }

    return this.contains(other) || other.contains(this);
  }
  /** Checks the MediaType equals another one (comparing their string) */
  ;

  _proto.equals = function equals(other) {
    return this.string === other.string;
  }
  /** Returns whether this media type is structured as a ZIP archive. */
  ;

  _proto.isZIP = function isZIP() {
    return this.matches(MediaType.zip()) || this.structuredSyntaxSuffix() === '+zip';
  }
  /** Returns whether this media type is structured as a JSON file. */
  ;

  _proto.isJSON = function isJSON() {
    return this.matches(MediaType.json()) || this.structuredSyntaxSuffix() === '+json';
  }
  /** Returns whether this media type is of an OPDS feed. */
  ;

  _proto.isOPDS = function isOPDS() {
    return this.matches(MediaType.opds1()) || this.matches(MediaType.opds1Entry()) || this.matches(MediaType.opds2()) || this.matches(MediaType.opds2Publication()) || this.matches(MediaType.opdsAuthentication());
  }
  /** Returns whether this media type is of an audio clip. */
  ;

  _proto.isAudio = function isAudio() {
    return this.type === 'audio';
  }
  /** Returns whether this media type is of a bitmap image, so excluding vectorial formats. */
  ;

  _proto.isBitmap = function isBitmap() {
    return this.matches(MediaType.bmp()) || this.matches(MediaType.gif()) || this.matches(MediaType.jpeg()) || this.matches(MediaType.png()) || this.matches(MediaType.tiff()) || this.matches(MediaType.webp());
  }
  /** Returns whether this media type is of an HTML document. */
  ;

  _proto.isHTML = function isHTML() {
    return this.matches(MediaType.html()) || this.matches(MediaType.xhtml());
  }
  /** Returns whether this media type is of a video clip. */
  ;

  _proto.isVideo = function isVideo() {
    return this.type === 'video';
  }
  /** Returns whether this media type is of a Readium Web Publication Manifest. */
  ;

  _proto.isRWPM = function isRWPM() {
    return this.matches(MediaType.readiumAudiobookManifest()) || this.matches(MediaType.divinaManifest()) || this.matches(MediaType.readiumWebPubManifest());
  } // Known Media Types
  ;

  MediaType.aac = function aac() {
    return new this('audio/aac');
  };

  MediaType.aiff = function aiff() {
    return new this('audio/aiff');
  };

  MediaType.readiumAudiobook = function readiumAudiobook() {
    return new this('application/audiobook+zip');
  };

  MediaType.readiumAudiobookManifest = function readiumAudiobookManifest() {
    return new this('application/audiobook+json');
  };

  MediaType.avi = function avi() {
    return new this('video/x-msvideo');
  };

  MediaType.binary = function binary() {
    return new this('application/octet-stream');
  };

  MediaType.bmp = function bmp() {
    return new this('image/bmp');
  };

  MediaType.cbz = function cbz() {
    return new this('application/vnd.comicbook+zip');
  };

  MediaType.css = function css() {
    return new this('text/css');
  };

  MediaType.divina = function divina() {
    return new this('application/divina+zip');
  };

  MediaType.divinaManifest = function divinaManifest() {
    return new this('application/divina+json');
  };

  MediaType.epub = function epub() {
    return new this('application/epub+zip');
  };

  MediaType.gif = function gif() {
    return new this('image/gif');
  };

  MediaType.gz = function gz() {
    return new this('application/gzip');
  };

  MediaType.html = function html() {
    return new this('text/html');
  };

  MediaType.javascript = function javascript() {
    return new this('text/javascript');
  };

  MediaType.jpeg = function jpeg() {
    return new this('image/jpeg');
  };

  MediaType.json = function json() {
    return new this('application/json');
  };

  MediaType.lpf = function lpf() {
    return new this('application/audiobook+lcp');
  };

  MediaType.mp3 = function mp3() {
    return new this('audio/mpeg');
  };

  MediaType.mpeg = function mpeg() {
    return new this('video/mpeg');
  };

  MediaType.ncx = function ncx() {
    return new this('application/x-dtbncx+xml');
  };

  MediaType.ogg = function ogg() {
    return new this('audio/ogg');
  };

  MediaType.ogv = function ogv() {
    return new this('video/ogg');
  };

  MediaType.opds1 = function opds1() {
    return new this('application/atom+xml;profile=opds-catalog');
  };

  MediaType.opds1Entry = function opds1Entry() {
    return new this('application/atom+xml;type=entry;profile=opds-catalog');
  };

  MediaType.opds2 = function opds2() {
    return new this('application/opds+json');
  };

  MediaType.opds2Publication = function opds2Publication() {
    return new this('application/opds-publication+json');
  };

  MediaType.opdsAuthentication = function opdsAuthentication() {
    return new this('application/opds-authentication+json');
  };

  MediaType.opus = function opus() {
    return new this('audio/opus');
  };

  MediaType.otf = function otf() {
    return new this('font/otf');
  };

  MediaType.pdf = function pdf() {
    return new this('application/pdf');
  };

  MediaType.png = function png() {
    return new this('image/png');
  };

  MediaType.smil = function smil() {
    return new this('application/smil+xml');
  };

  MediaType.svg = function svg() {
    return new this('image/svg+xml');
  };

  MediaType.text = function text() {
    return new this('text/plain');
  };

  MediaType.tiff = function tiff() {
    return new this('image/tiff');
  };

  MediaType.ttf = function ttf() {
    return new this('font/ttf');
  };

  MediaType.wav = function wav() {
    return new this('audio/wav');
  };

  MediaType.webmAudio = function webmAudio() {
    return new this('audio/webm');
  };

  MediaType.webmVideo = function webmVideo() {
    return new this('video/webm');
  };

  MediaType.webp = function webp() {
    return new this('image/webp');
  };

  MediaType.readiumWebPub = function readiumWebPub() {
    return new this('application/webpub+zip');
  };

  MediaType.readiumWebPubManifest = function readiumWebPubManifest() {
    return new this('application/webpub+json');
  };

  MediaType.w3cWPUBManifest = function w3cWPUBManifest() {
    return new this('application/x.readium.w3c.wpub+json');
  };

  MediaType.woff = function woff() {
    return new this('font/woff');
  };

  MediaType.woff2 = function woff2() {
    return new this('font/woff2');
  };

  MediaType.xhtml = function xhtml() {
    return new this('application/xhtml+xml');
  };

  MediaType.xml = function xml() {
    return new this('application/xml');
  };

  MediaType.zab = function zab() {
    return new this('application/x.readium.zab+zip');
  };

  MediaType.zip = function zip() {
    return new this('application/zip');
  };

  return MediaType;
}();

/* Copyright 2020 Readium Foundation. All rights reserved.
 * Use of this source code is governed by a BSD-style license,
 * available in the LICENSE file present in the Github repository of the project.
 */
var Properties = /*#__PURE__*/function () {
  function Properties(json) {
    if (typeof json === 'string') {
      this.otherProperties = JSON.parse(json);
    } else {
      this.otherProperties = json;
    }
  }

  var _proto = Properties.prototype;

  _proto.adding = function adding(properties) {
    var copy = JSON.parse(JSON.stringify(this.otherProperties));

    for (var property in properties) {
      copy[property] = properties[property];
    }

    return new Properties(copy);
  };

  return Properties;
}();

/* Copyright 2020 Readium Foundation. All rights reserved.
 * Use of this source code is governed by a BSD-style license,
 * available in the LICENSE file present in the Github repository of the project.
 */

/** A lightweight implementation of URI Template (RFC 6570).
 *  Only handles simple cases, fitting Readium's use cases.
 *  See https://tools.ietf.org/html/rfc6570
 *
 *  TODO: extensive testing
 */
var URITemplate = /*#__PURE__*/function () {
  function URITemplate(uri) {
    this.uri = uri;
    /** List of URI template parameter keys. */

    this.parameters = this.getParameters(uri);
  }

  var _proto = URITemplate.prototype;

  _proto.getParameters = function getParameters(uri) {
    var regex = /\{\??([^}]+)\}/g;
    var match = uri.match(regex);

    if (match) {
      return new Set(match.join(',').replace(regex, '$1').split(',').map(function (m) {
        return m.trim();
      }));
    }

    return new Set();
  }
  /** Expands the URI by replacing the template variables by the given parameters.
   *  Any extra parameter is appended as query parameters.
   *  See RFC 6570 on URI template: https://tools.ietf.org/html/rfc6570
   */
  ;

  _proto.expand = function expand(parameters) {
    var expandSimpleString = function expandSimpleString(string) {
      return string.split(',').map(function (parameter) {
        return parameters[parameter] || '';
      }).join(',');
    };

    var expandFormStyle = function expandFormStyle(string) {
      return '?' + string.split(',').map(function (expression) {
        var parameter = expression.split('=')[0];

        if (parameters[parameter]) {
          return parameter + "=" + parameters[parameter];
        } else {
          return '';
        }
      }).join('&');
    };

    return this.uri.replace(/\{(\??)([^}]+)\}/g, function () {
      return !(arguments.length <= 1 ? undefined : arguments[1]) ? expandSimpleString(arguments.length <= 2 ? undefined : arguments[2]) : expandFormStyle(arguments.length <= 2 ? undefined : arguments[2]);
    });
  };

  return URITemplate;
}();

/** Link Object for the Readium Web Publication Manifest.
 *  https://readium.org/webpub-manifest/schema/link.schema.json
 */

var Link = /*#__PURE__*/function () {
  function Link(link) {
    this.href = link.href;
    this.templated = link.templated;
    this.type = link.type;
    this.title = link.title;
    this.rels = new Set(link.rel);
    this.properties = new Properties(link.properties);
    this.height = link.height;
    this.width = link.width;
    this.duration = link.duration;
    this.bitrate = link.bitrate;
    this.languages = link.language;
    this.alternates = link.alternate ? new Links(link.alternate) : new Links([]);
    this.children = link.children ? new Links(link.children) : new Links([]);
    this.mediaType = link.type ? new MediaType(link.type) : undefined;
    this.templateParameters = this.getTemplateParameters();
  }
  /** Computes an absolute URL to the link, relative to the given `baseURL`.
   *  If the link's `href` is already absolute, the `baseURL` is ignored.
   */


  var _proto = Link.prototype;

  _proto.toAbsoluteHREF = function toAbsoluteHREF(baseUrl) {
    return new URL(this.href, baseUrl).href;
  }
  /** List of URI template parameter keys, if the `Link` is templated. */
  ;

  _proto.getTemplateParameters = function getTemplateParameters() {
    if (!this.templated) {
      return new Set();
    } else {
      return new URITemplate(this.href).parameters;
    }
  }
  /** Expands the `Link`'s HREF by replacing URI template variables by the given parameters.
   *  See RFC 6570 on URI template: https://tools.ietf.org/html/rfc6570
   */
  ;

  _proto.expandTemplate = function expandTemplate(parameters) {
    // Probably make copy instead of a new one
    return new Link({
      href: new URITemplate(this.href).expand(parameters),
      templated: false
    });
  };

  return Link;
}();
/** Parses multiple JSON links into an array of Link. */

var Links = /*#__PURE__*/function (_Array) {
  _inheritsLoose(Links, _Array);

  function Links(items) {
    var _this;

    if (items instanceof Array) {
      _this = _Array.call.apply(_Array, [this].concat(items.map(function (item) {
        return new Link(item);
      }))) || this;
    } else {
      _this = _Array.call(this, items) || this;
    }

    Object.setPrototypeOf(_assertThisInitialized(_this), (this instanceof Links ? this.constructor : void 0).prototype);
    return _assertThisInitialized(_this);
  }
  /** Finds the first link with the given relation. */


  var _proto2 = Links.prototype;

  _proto2.findWithRel = function findWithRel(rel) {
    var predicate = function predicate(el) {
      return el.rels.has(rel);
    };

    return this.find(predicate) || null;
  }
  /** Finds all the links with the given relation. */
  ;

  _proto2.filterByRel = function filterByRel(rel) {
    var predicate = function predicate(el) {
      return el.rels.has(rel);
    };

    return this.filter(predicate);
  }
  /** Finds the first link matching the given HREF. */
  ;

  _proto2.findWithHref = function findWithHref(href) {
    var predicate = function predicate(el) {
      return el.href === href;
    };

    return this.find(predicate) || null;
  }
  /** Finds the index of the first link matching the given HREF. */
  ;

  _proto2.findIndexWithHref = function findIndexWithHref(href) {
    var predicate = function predicate(el) {
      return el.href === href;
    };

    return this.findIndex(predicate);
  }
  /** Finds the first link matching the given media type. */
  ;

  _proto2.findWithMediaType = function findWithMediaType(mediaType) {
    var predicate = function predicate(el) {
      return el.mediaType ? el.mediaType.matches(mediaType) : false;
    };

    return this.find(predicate) || null;
  }
  /** Finds all the links matching the given media type. */
  ;

  _proto2.filterByMediaType = function filterByMediaType(mediaType) {
    var predicate = function predicate(el) {
      return el.mediaType ? el.mediaType.matches(mediaType) : false;
    };

    return this.filter(predicate);
  }
  /** Finds all the links matching any of the given media types. */
  ;

  _proto2.filterByMediaTypes = function filterByMediaTypes(mediaTypes) {
    var predicate = function predicate(el) {
      for (var _iterator = _createForOfIteratorHelperLoose(mediaTypes), _step; !(_step = _iterator()).done;) {
        var mediaType = _step.value;
        return el.mediaType ? el.mediaType.matches(mediaType) : false;
      }

      return false;
    };

    return this.filter(predicate);
  }
  /** Returns whether all the resources in the collection are audio clips. */
  ;

  _proto2.everyIsAudio = function everyIsAudio() {
    var predicate = function predicate(el) {
      return el.mediaType ? el.mediaType.isAudio() : false;
    };

    return this.every(predicate);
  }
  /** Returns whether all the resources in the collection are bitmaps. */
  ;

  _proto2.everyIsBitmap = function everyIsBitmap() {
    var predicate = function predicate(el) {
      return el.mediaType ? el.mediaType.isBitmap() : false;
    };

    return this.every(predicate);
  }
  /** Returns whether all the resources in the collection are HTML documents. */
  ;

  _proto2.everyIsHTML = function everyIsHTML() {
    var predicate = function predicate(el) {
      return el.mediaType ? el.mediaType.isHTML() : false;
    };

    return this.every(predicate);
  }
  /** Returns whether all the resources in the collection are video clips. */
  ;

  _proto2.everyIsVideo = function everyIsVideo() {
    var predicate = function predicate(el) {
      return el.mediaType ? el.mediaType.isVideo() : false;
    };

    return this.every(predicate);
  }
  /** Returns whether all the resources in the collection are matching any of the given media types. */
  ;

  _proto2.everyMatchesMediaType = function everyMatchesMediaType(mediaTypes) {
    if (Array.isArray(mediaTypes)) {
      return this.every(function (el) {
        for (var _iterator2 = _createForOfIteratorHelperLoose(mediaTypes), _step2; !(_step2 = _iterator2()).done;) {
          var mediaType = _step2.value;
          return el.mediaType ? el.mediaType.matches(mediaType) : false;
        }

        return false;
      });
    } else {
      return this.every(function (el) {
        return el.mediaType ? el.mediaType.matches(mediaTypes) : false;
      });
    }
  };

  return Links;
}( /*#__PURE__*/_wrapNativeSuper(Array));

/* Copyright 2020 Readium Foundation. All rights reserved.
 * Use of this source code is governed by a BSD-style license,
 * available in the LICENSE file present in the Github repository of the project.
 */
/** Core Collection Model
 *  https://readium.org/webpub-manifest/schema/subcollection.schema.json
 *  Can be used as extension point in the Readium Web Publication Manifest.
 */

var CoreCollection = /*#__PURE__*/function () {
  function CoreCollection(json) {
    if (Array.isArray(json)) {
      this.links = new Links(json);
    } else {
      var jsonCollection = new JSONDictionary(json);
      this.metadata = jsonCollection.parseRaw('metadata');
      this.links = new Links(jsonCollection.parseArray('links'));
      this.subcollections = CoreCollection.makeCollections(jsonCollection);
    }
  }

  CoreCollection.makeCollections = function makeCollections(json) {
    var collection = {};

    for (var key in json) {
      collection[key] = new this(json[key]);
    }

    return collection;
  };

  return CoreCollection;
}();

/* Copyright 2020 Readium Foundation. All rights reserved.
 * Use of this source code is governed by a BSD-style license,
 * available in the LICENSE file present in the Github repository of the project.
 */

/** Hint about the nature of the layout for the linked resources. */
var EPUBLayout;

(function (EPUBLayout) {
  EPUBLayout["fixed"] = "fixed";
  EPUBLayout["reflowable"] = "reflowable";
})(EPUBLayout || (EPUBLayout = {}));

/* Copyright 2020 Readium Foundation. All rights reserved.
 * Use of this source code is governed by a BSD-style license,
 * available in the LICENSE file present in the Github repository of the project.
 */

Properties.prototype.getContains = function () {
  return this.otherProperties['contains'] || [];
};

Properties.prototype.getLayout = function () {
  return this.otherProperties['layout'] || null;
};

/* Copyright 2020 Readium Foundation. All rights reserved.
 * Use of this source code is governed by a BSD-style license,
 * available in the LICENSE file present in the Github repository of the project.
 */
/** The Presentation Hints extension defines a number of hints for User Agents about the way content
 *  should be presented to the user.
 *
 *  https://readium.org/webpub-manifest/extensions/presentation.html
 *  https://readium.org/webpub-manifest/schema/extensions/presentation/metadata.schema.json
 *
 *  These properties are nullable to avoid having default values when it doesn't make sense for a
 *  given `Publication`. If a navigator needs a default value when not specified,
 *  `Presentation.defaultX` and `Presentation.X.default` can be used.
 */

var Presentation = /*#__PURE__*/function () {
  function Presentation(presentation) {
    this.clipped = presentation.clipped;
    this.fit = presentation.fit;
    this.orientation = presentation.orientation;
    this.spread = presentation.spread;
    this.layout = presentation.layout;
    this.continuous = presentation.continuous;
    this.overflow = presentation.overflow;
  }
  /** Determines the layout of the given resource in this publication.
   *  Default layout is reflowable.
   */


  var _proto = Presentation.prototype;

  _proto.layoutOf = function layoutOf(link) {
    var result = EPUBLayout.reflowable;

    if (link.properties && link.properties.getLayout() !== null) {
      result = link.properties.getLayout();
    } else if (this.layout) {
      result = this.layout;
    }

    return result;
  };

  return Presentation;
}();

/* Copyright 2020 Readium Foundation. All rights reserved.
 * Use of this source code is governed by a BSD-style license,
 * available in the LICENSE file present in the Github repository of the project.
 */
var ReadingProgression;

(function (ReadingProgression) {
  ReadingProgression["auto"] = "auto";
  ReadingProgression["btt"] = "btt";
  ReadingProgression["ltr"] = "ltr";
  ReadingProgression["rtl"] = "rtl";
  ReadingProgression["ttb"] = "ttb";
})(ReadingProgression || (ReadingProgression = {})); // Note: Babel doesn’t really like that at all so disabling for the time being
 // }

/* Copyright 2020 Readium Foundation. All rights reserved.
 * Use of this source code is governed by a BSD-style license,
 * available in the LICENSE file present in the Github repository of the project.
 */
var Metadata = /*#__PURE__*/function () {
  function Metadata(metadata) {
    var json = new JSONDictionary(metadata);
    this.title = json.parseRaw('title');
    this['@type'] = json.parseRaw('@type');
    this.identifier = json.parseRaw('identifier');
    this.subtitle = json.parseRaw('subtitle');
    this.artists = json.parseArray('artist');
    this.authors = json.parseArray('author');
    this.colorists = json.parseArray('colorist');
    this.contributors = json.parseArray('contributor');
    this.editors = json.parseArray('editor');
    this.illustrators = json.parseArray('illustrator');
    this.inkers = json.parseArray('inker');
    this.letterers = json.parseArray('letterer');
    this.narrators = json.parseArray('narrator');
    this.pencilers = json.parseArray('penciler');
    this.translators = json.parseArray('translator');
    this.languages = json.parseArray('language');
    this.description = json.parseRaw('description');
    this.publishers = json.parseArray('publisher');
    this.imprints = json.parseArray('imprint');
    this.published = json.parseDate('published');
    this.modified = json.parseDate('modified');
    this.subjects = json.parseArray('subject');
    var belongsTo = json.parseRaw('belongsTo');
    this.belongsToCollection = belongsTo ? belongsTo['collection'] : [];
    this.belongsToSeries = belongsTo ? belongsTo['series'] : [];
    this.readingProgression = json.parseRaw('readingProgression') || ReadingProgression.auto;
    this.duration = json.parsePositive('duration');
    this.numberOfPages = json.parsePositive('numberOfPages');
    this.otherMetadata = json.json;
  }

  var _proto = Metadata.prototype;

  _proto.getPresentation = function getPresentation() {
    return this.getOtherMetadata()['presentation'] ? new Presentation(this.getOtherMetadata()['presentation']) : new Presentation({});
  }
  /** Computes a `ReadingProgression` when the value of `readingProgression` is set to `auto`,
   *  using the publication language.
   */
  ;

  _proto.effectiveReadingProgression = function effectiveReadingProgression() {
    if (this.readingProgression && this.readingProgression !== ReadingProgression.auto) {
      return this.readingProgression;
    }

    if (this.languages.length > 0) {
      var primaryLang = this.languages[0];
      var lang = primaryLang.includes('zh') ? primaryLang : primaryLang.split('-')[0];

      if (Metadata.RTLLanguages.includes(lang)) {
        return ReadingProgression.rtl;
      }
    }

    return ReadingProgression.ltr;
  };

  _proto.getOtherMetadata = function getOtherMetadata() {
    return this.otherMetadata;
  };

  return Metadata;
}();
/* public otherMetadata */

Metadata.RTLLanguages = ['ar', 'fa', 'he', 'zh-Hant', 'zh-TW'];

/* Copyright 2020 Readium Foundation. All rights reserved.
 * Use of this source code is governed by a BSD-style license,
 * available in the LICENSE file present in the Github repository of the project.
 */
/** Holds the metadata of a Readium publication, as described in
 *  the Readium Web Publication Manifest.
 *  See. https://readium.org/webpub-manifest/
 */

var Manifest = /*#__PURE__*/function () {
  function Manifest(manifestJSON) {
    var json = new JSONDictionary(manifestJSON);
    this.context = json.parseArray('@context');
    this.metadata = new Metadata(json.parseRaw('metadata'));
    this.links = new Links(json.parseArray('links'));
    this.readingOrder = new Links(json.parseArray('readingOrder'));
    this.resources = new Links(json.parseArray('resources'));
    this.tableOfContents = new Links(json.parseArray('toc'));
    this.subcollections = CoreCollection.makeCollections(json.json);
  }
  /** Finds the first link with the given relation in the manifest's links. */


  var _proto = Manifest.prototype;

  _proto.linkWithRel = function linkWithRel(rel) {
    var links = [this.readingOrder, this.resources, this.links];
    var result = null;

    for (var _i = 0, _links = links; _i < _links.length; _i++) {
      var collection = _links[_i];
      result = collection.findWithRel(rel);

      if (result !== null) {
        return result;
      }
    }

    return result;
  }
  /** Finds all the links with the given relation in the manifest's links. */
  ;

  _proto.linksWithRel = function linksWithRel(rel) {
    var result = [];
    result.push(this.readingOrder.filterByRel(rel), this.resources.filterByRel(rel), this.links.filterByRel(rel));
    return result.reduce(function (acc, val) {
      return acc.concat(val);
    }, []);
  };

  return Manifest;
}();

/* Copyright 2020 Readium Foundation. All rights reserved.
 * Use of this source code is governed by a BSD-style license,
 * available in the LICENSE file present in the Github repository of the project.
 */

/** Shared model for a Readium Publication. */
var Publication = /*#__PURE__*/function () {
  function Publication(manifest) {
    this.manifest = manifest;
    this.metadata = this.manifest.metadata;
    this.links = this.manifest.links;
    /** Identifies a list of resources in reading order for the publication. */

    this.readingOrder = this.manifest.readingOrder;
    /** Identifies resources that are necessary for rendering the publication. */

    this.resources = this.manifest.resources;
    /** Identifies the collection that contains a table of contents. */

    this.tableOfContents = this.manifest.tableOfContents;
    this.subcollections = this.manifest.subcollections;
  }
  /** The URL where this publication is served, computed from the `Link` with `self` relation.
   *  e.g. https://provider.com/pub1293/manifest.json gives https://provider.com/pub1293/
   */


  var _proto = Publication.prototype;

  _proto.baseURL = function baseURL() {
    var selfLink = this.manifest.links.find(function (el) {
      return el.rels.has('self');
    });

    if (selfLink) {
      return selfLink.href;
    } else {
      return null;
    }
  }
  /** Finds the first Link having the given `href` in the publication's links. */
  ;

  _proto.linkWithHref = function linkWithHref(href) {
    var find = function find(links) {
      var result = null;

      for (var _iterator = _createForOfIteratorHelperLoose(links), _step; !(_step = _iterator()).done;) {
        var collection = _step.value;
        result = collection.findWithHref(href);

        if (result !== null) {
          return result;
        }
      }

      var children = links.flatMap(function (item) {
        var arr = [];

        for (var _iterator2 = _createForOfIteratorHelperLoose(item), _step2; !(_step2 = _iterator2()).done;) {
          var _link = _step2.value;

          if (_link.alternates) {
            arr.push(_link.alternates);
          }

          if (_link.children) {
            arr.push(_link.children);
          }
        }

        return arr;
      });
      find(children);
      return result;
    };

    var links = [this.manifest.readingOrder, this.manifest.resources, this.manifest.links];
    var link = find(links);

    if (link !== null) {
      return link;
    }

    var shortHref = href.split(/[#\?]/)[0];
    this.linkWithHref(shortHref);
    return link;
  }
  /** Finds the first link with the given relation in the publication's links. */
  ;

  _proto.linkWithRel = function linkWithRel(rel) {
    return this.manifest.linkWithRel(rel);
  }
  /** Finds all the links with the given relation in the publication's links. */
  ;

  _proto.linksWithRel = function linksWithRel(rel) {
    return this.manifest.linksWithRel(rel);
  };

  return Publication;
}();

function api() {
  var createManifest = function createManifest(json) {
    return new Manifest(json);
  };

  var createPublication = function createPublication(manifest) {
    return new Publication(manifest);
  }; //for test


  var getData = function getData(x) {
    //let m:Metadata;
    //m.getPresentation()
    return "hi1 - " + x;
  };

  var _api = {
    createManifest: createManifest,
    createPublication: createPublication,
    getData: getData
  };
  return _api;
}
//   if ('development' === "development") {
//     console.log('boop');
//   }
//   return a + b;
// };

exports.Manifest = Manifest;
exports.Metadata = Metadata;
exports.Publication = Publication;
exports.default = api;


/***/ }),

/***/ "./src/main.ts":
/*!*********************!*\
  !*** ./src/main.ts ***!
  \*********************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
var shared_test_1 = __webpack_require__(/*! @jellybooks/shared-test */ "../shared-models/dist/index.js");
// import { JellybooksAPI, Publication, Manifest } from "@jellybooks/shared-test";
//import "@jellybooks/shared-test";
//import   "@jellybooks/shared-test/types/Publication/presentation/Metadata+Presentation";
//import * as ddd from "@jellybooks/shared-test/types/Publication/presentation/Metadata+Presentation";
//import { x } from "@jellybooks/shared-test/types/Publication/presentation/Metadata+Presentation";
var textElement = document.getElementById("text");
var lib = shared_test_1.default();
//textElement.innerText = lib.getData('test');
fetch("manifest.json")
    .then(function (response) { return response.json(); })
    .then(function (json) {
    //console.log(ddd.x);
    console.log(json);
    var manifest = lib.createManifest(json);
    var pubObj = lib.createPublication(manifest);
    //console.log(manifest.metadata.get);
    var y = manifest.metadata.getPresentation();
    console.log(y);
    console.log(pubObj);
    textElement.innerText = JSON.stringify(pubObj, null, 2);
});


/***/ })

/******/ });
//# sourceMappingURL=jellybookslib.js.map
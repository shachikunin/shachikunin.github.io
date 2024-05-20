(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
'use strict'

exports.byteLength = byteLength
exports.toByteArray = toByteArray
exports.fromByteArray = fromByteArray

var lookup = []
var revLookup = []
var Arr = typeof Uint8Array !== 'undefined' ? Uint8Array : Array

var code = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
for (var i = 0, len = code.length; i < len; ++i) {
  lookup[i] = code[i]
  revLookup[code.charCodeAt(i)] = i
}

// Support decoding URL-safe base64 strings, as Node.js does.
// See: https://en.wikipedia.org/wiki/Base64#URL_applications
revLookup['-'.charCodeAt(0)] = 62
revLookup['_'.charCodeAt(0)] = 63

function getLens (b64) {
  var len = b64.length

  if (len % 4 > 0) {
    throw new Error('Invalid string. Length must be a multiple of 4')
  }

  // Trim off extra bytes after placeholder bytes are found
  // See: https://github.com/beatgammit/base64-js/issues/42
  var validLen = b64.indexOf('=')
  if (validLen === -1) validLen = len

  var placeHoldersLen = validLen === len
    ? 0
    : 4 - (validLen % 4)

  return [validLen, placeHoldersLen]
}

// base64 is 4/3 + up to two characters of the original data
function byteLength (b64) {
  var lens = getLens(b64)
  var validLen = lens[0]
  var placeHoldersLen = lens[1]
  return ((validLen + placeHoldersLen) * 3 / 4) - placeHoldersLen
}

function _byteLength (b64, validLen, placeHoldersLen) {
  return ((validLen + placeHoldersLen) * 3 / 4) - placeHoldersLen
}

function toByteArray (b64) {
  var tmp
  var lens = getLens(b64)
  var validLen = lens[0]
  var placeHoldersLen = lens[1]

  var arr = new Arr(_byteLength(b64, validLen, placeHoldersLen))

  var curByte = 0

  // if there are placeholders, only get up to the last complete 4 chars
  var len = placeHoldersLen > 0
    ? validLen - 4
    : validLen

  var i
  for (i = 0; i < len; i += 4) {
    tmp =
      (revLookup[b64.charCodeAt(i)] << 18) |
      (revLookup[b64.charCodeAt(i + 1)] << 12) |
      (revLookup[b64.charCodeAt(i + 2)] << 6) |
      revLookup[b64.charCodeAt(i + 3)]
    arr[curByte++] = (tmp >> 16) & 0xFF
    arr[curByte++] = (tmp >> 8) & 0xFF
    arr[curByte++] = tmp & 0xFF
  }

  if (placeHoldersLen === 2) {
    tmp =
      (revLookup[b64.charCodeAt(i)] << 2) |
      (revLookup[b64.charCodeAt(i + 1)] >> 4)
    arr[curByte++] = tmp & 0xFF
  }

  if (placeHoldersLen === 1) {
    tmp =
      (revLookup[b64.charCodeAt(i)] << 10) |
      (revLookup[b64.charCodeAt(i + 1)] << 4) |
      (revLookup[b64.charCodeAt(i + 2)] >> 2)
    arr[curByte++] = (tmp >> 8) & 0xFF
    arr[curByte++] = tmp & 0xFF
  }

  return arr
}

function tripletToBase64 (num) {
  return lookup[num >> 18 & 0x3F] +
    lookup[num >> 12 & 0x3F] +
    lookup[num >> 6 & 0x3F] +
    lookup[num & 0x3F]
}

function encodeChunk (uint8, start, end) {
  var tmp
  var output = []
  for (var i = start; i < end; i += 3) {
    tmp =
      ((uint8[i] << 16) & 0xFF0000) +
      ((uint8[i + 1] << 8) & 0xFF00) +
      (uint8[i + 2] & 0xFF)
    output.push(tripletToBase64(tmp))
  }
  return output.join('')
}

function fromByteArray (uint8) {
  var tmp
  var len = uint8.length
  var extraBytes = len % 3 // if we have 1 byte left, pad 2 bytes
  var parts = []
  var maxChunkLength = 16383 // must be multiple of 3

  // go through the array every three bytes, we'll deal with trailing stuff later
  for (var i = 0, len2 = len - extraBytes; i < len2; i += maxChunkLength) {
    parts.push(encodeChunk(uint8, i, (i + maxChunkLength) > len2 ? len2 : (i + maxChunkLength)))
  }

  // pad the end with zeros, but make sure to not forget the extra bytes
  if (extraBytes === 1) {
    tmp = uint8[len - 1]
    parts.push(
      lookup[tmp >> 2] +
      lookup[(tmp << 4) & 0x3F] +
      '=='
    )
  } else if (extraBytes === 2) {
    tmp = (uint8[len - 2] << 8) + uint8[len - 1]
    parts.push(
      lookup[tmp >> 10] +
      lookup[(tmp >> 4) & 0x3F] +
      lookup[(tmp << 2) & 0x3F] +
      '='
    )
  }

  return parts.join('')
}

},{}],2:[function(require,module,exports){
(function (Buffer){(function (){
/*!
 * The buffer module from node.js, for the browser.
 *
 * @author   Feross Aboukhadijeh <https://feross.org>
 * @license  MIT
 */
/* eslint-disable no-proto */

'use strict'

var base64 = require('base64-js')
var ieee754 = require('ieee754')

exports.Buffer = Buffer
exports.SlowBuffer = SlowBuffer
exports.INSPECT_MAX_BYTES = 50

var K_MAX_LENGTH = 0x7fffffff
exports.kMaxLength = K_MAX_LENGTH

/**
 * If `Buffer.TYPED_ARRAY_SUPPORT`:
 *   === true    Use Uint8Array implementation (fastest)
 *   === false   Print warning and recommend using `buffer` v4.x which has an Object
 *               implementation (most compatible, even IE6)
 *
 * Browsers that support typed arrays are IE 10+, Firefox 4+, Chrome 7+, Safari 5.1+,
 * Opera 11.6+, iOS 4.2+.
 *
 * We report that the browser does not support typed arrays if the are not subclassable
 * using __proto__. Firefox 4-29 lacks support for adding new properties to `Uint8Array`
 * (See: https://bugzilla.mozilla.org/show_bug.cgi?id=695438). IE 10 lacks support
 * for __proto__ and has a buggy typed array implementation.
 */
Buffer.TYPED_ARRAY_SUPPORT = typedArraySupport()

if (!Buffer.TYPED_ARRAY_SUPPORT && typeof console !== 'undefined' &&
    typeof console.error === 'function') {
  console.error(
    'This browser lacks typed array (Uint8Array) support which is required by ' +
    '`buffer` v5.x. Use `buffer` v4.x if you require old browser support.'
  )
}

function typedArraySupport () {
  // Can typed array instances can be augmented?
  try {
    var arr = new Uint8Array(1)
    arr.__proto__ = { __proto__: Uint8Array.prototype, foo: function () { return 42 } }
    return arr.foo() === 42
  } catch (e) {
    return false
  }
}

Object.defineProperty(Buffer.prototype, 'parent', {
  enumerable: true,
  get: function () {
    if (!Buffer.isBuffer(this)) return undefined
    return this.buffer
  }
})

Object.defineProperty(Buffer.prototype, 'offset', {
  enumerable: true,
  get: function () {
    if (!Buffer.isBuffer(this)) return undefined
    return this.byteOffset
  }
})

function createBuffer (length) {
  if (length > K_MAX_LENGTH) {
    throw new RangeError('The value "' + length + '" is invalid for option "size"')
  }
  // Return an augmented `Uint8Array` instance
  var buf = new Uint8Array(length)
  buf.__proto__ = Buffer.prototype
  return buf
}

/**
 * The Buffer constructor returns instances of `Uint8Array` that have their
 * prototype changed to `Buffer.prototype`. Furthermore, `Buffer` is a subclass of
 * `Uint8Array`, so the returned instances will have all the node `Buffer` methods
 * and the `Uint8Array` methods. Square bracket notation works as expected -- it
 * returns a single octet.
 *
 * The `Uint8Array` prototype remains unmodified.
 */

function Buffer (arg, encodingOrOffset, length) {
  // Common case.
  if (typeof arg === 'number') {
    if (typeof encodingOrOffset === 'string') {
      throw new TypeError(
        'The "string" argument must be of type string. Received type number'
      )
    }
    return allocUnsafe(arg)
  }
  return from(arg, encodingOrOffset, length)
}

// Fix subarray() in ES2016. See: https://github.com/feross/buffer/pull/97
if (typeof Symbol !== 'undefined' && Symbol.species != null &&
    Buffer[Symbol.species] === Buffer) {
  Object.defineProperty(Buffer, Symbol.species, {
    value: null,
    configurable: true,
    enumerable: false,
    writable: false
  })
}

Buffer.poolSize = 8192 // not used by this implementation

function from (value, encodingOrOffset, length) {
  if (typeof value === 'string') {
    return fromString(value, encodingOrOffset)
  }

  if (ArrayBuffer.isView(value)) {
    return fromArrayLike(value)
  }

  if (value == null) {
    throw TypeError(
      'The first argument must be one of type string, Buffer, ArrayBuffer, Array, ' +
      'or Array-like Object. Received type ' + (typeof value)
    )
  }

  if (isInstance(value, ArrayBuffer) ||
      (value && isInstance(value.buffer, ArrayBuffer))) {
    return fromArrayBuffer(value, encodingOrOffset, length)
  }

  if (typeof value === 'number') {
    throw new TypeError(
      'The "value" argument must not be of type number. Received type number'
    )
  }

  var valueOf = value.valueOf && value.valueOf()
  if (valueOf != null && valueOf !== value) {
    return Buffer.from(valueOf, encodingOrOffset, length)
  }

  var b = fromObject(value)
  if (b) return b

  if (typeof Symbol !== 'undefined' && Symbol.toPrimitive != null &&
      typeof value[Symbol.toPrimitive] === 'function') {
    return Buffer.from(
      value[Symbol.toPrimitive]('string'), encodingOrOffset, length
    )
  }

  throw new TypeError(
    'The first argument must be one of type string, Buffer, ArrayBuffer, Array, ' +
    'or Array-like Object. Received type ' + (typeof value)
  )
}

/**
 * Functionally equivalent to Buffer(arg, encoding) but throws a TypeError
 * if value is a number.
 * Buffer.from(str[, encoding])
 * Buffer.from(array)
 * Buffer.from(buffer)
 * Buffer.from(arrayBuffer[, byteOffset[, length]])
 **/
Buffer.from = function (value, encodingOrOffset, length) {
  return from(value, encodingOrOffset, length)
}

// Note: Change prototype *after* Buffer.from is defined to workaround Chrome bug:
// https://github.com/feross/buffer/pull/148
Buffer.prototype.__proto__ = Uint8Array.prototype
Buffer.__proto__ = Uint8Array

function assertSize (size) {
  if (typeof size !== 'number') {
    throw new TypeError('"size" argument must be of type number')
  } else if (size < 0) {
    throw new RangeError('The value "' + size + '" is invalid for option "size"')
  }
}

function alloc (size, fill, encoding) {
  assertSize(size)
  if (size <= 0) {
    return createBuffer(size)
  }
  if (fill !== undefined) {
    // Only pay attention to encoding if it's a string. This
    // prevents accidentally sending in a number that would
    // be interpretted as a start offset.
    return typeof encoding === 'string'
      ? createBuffer(size).fill(fill, encoding)
      : createBuffer(size).fill(fill)
  }
  return createBuffer(size)
}

/**
 * Creates a new filled Buffer instance.
 * alloc(size[, fill[, encoding]])
 **/
Buffer.alloc = function (size, fill, encoding) {
  return alloc(size, fill, encoding)
}

function allocUnsafe (size) {
  assertSize(size)
  return createBuffer(size < 0 ? 0 : checked(size) | 0)
}

/**
 * Equivalent to Buffer(num), by default creates a non-zero-filled Buffer instance.
 * */
Buffer.allocUnsafe = function (size) {
  return allocUnsafe(size)
}
/**
 * Equivalent to SlowBuffer(num), by default creates a non-zero-filled Buffer instance.
 */
Buffer.allocUnsafeSlow = function (size) {
  return allocUnsafe(size)
}

function fromString (string, encoding) {
  if (typeof encoding !== 'string' || encoding === '') {
    encoding = 'utf8'
  }

  if (!Buffer.isEncoding(encoding)) {
    throw new TypeError('Unknown encoding: ' + encoding)
  }

  var length = byteLength(string, encoding) | 0
  var buf = createBuffer(length)

  var actual = buf.write(string, encoding)

  if (actual !== length) {
    // Writing a hex string, for example, that contains invalid characters will
    // cause everything after the first invalid character to be ignored. (e.g.
    // 'abxxcd' will be treated as 'ab')
    buf = buf.slice(0, actual)
  }

  return buf
}

function fromArrayLike (array) {
  var length = array.length < 0 ? 0 : checked(array.length) | 0
  var buf = createBuffer(length)
  for (var i = 0; i < length; i += 1) {
    buf[i] = array[i] & 255
  }
  return buf
}

function fromArrayBuffer (array, byteOffset, length) {
  if (byteOffset < 0 || array.byteLength < byteOffset) {
    throw new RangeError('"offset" is outside of buffer bounds')
  }

  if (array.byteLength < byteOffset + (length || 0)) {
    throw new RangeError('"length" is outside of buffer bounds')
  }

  var buf
  if (byteOffset === undefined && length === undefined) {
    buf = new Uint8Array(array)
  } else if (length === undefined) {
    buf = new Uint8Array(array, byteOffset)
  } else {
    buf = new Uint8Array(array, byteOffset, length)
  }

  // Return an augmented `Uint8Array` instance
  buf.__proto__ = Buffer.prototype
  return buf
}

function fromObject (obj) {
  if (Buffer.isBuffer(obj)) {
    var len = checked(obj.length) | 0
    var buf = createBuffer(len)

    if (buf.length === 0) {
      return buf
    }

    obj.copy(buf, 0, 0, len)
    return buf
  }

  if (obj.length !== undefined) {
    if (typeof obj.length !== 'number' || numberIsNaN(obj.length)) {
      return createBuffer(0)
    }
    return fromArrayLike(obj)
  }

  if (obj.type === 'Buffer' && Array.isArray(obj.data)) {
    return fromArrayLike(obj.data)
  }
}

function checked (length) {
  // Note: cannot use `length < K_MAX_LENGTH` here because that fails when
  // length is NaN (which is otherwise coerced to zero.)
  if (length >= K_MAX_LENGTH) {
    throw new RangeError('Attempt to allocate Buffer larger than maximum ' +
                         'size: 0x' + K_MAX_LENGTH.toString(16) + ' bytes')
  }
  return length | 0
}

function SlowBuffer (length) {
  if (+length != length) { // eslint-disable-line eqeqeq
    length = 0
  }
  return Buffer.alloc(+length)
}

Buffer.isBuffer = function isBuffer (b) {
  return b != null && b._isBuffer === true &&
    b !== Buffer.prototype // so Buffer.isBuffer(Buffer.prototype) will be false
}

Buffer.compare = function compare (a, b) {
  if (isInstance(a, Uint8Array)) a = Buffer.from(a, a.offset, a.byteLength)
  if (isInstance(b, Uint8Array)) b = Buffer.from(b, b.offset, b.byteLength)
  if (!Buffer.isBuffer(a) || !Buffer.isBuffer(b)) {
    throw new TypeError(
      'The "buf1", "buf2" arguments must be one of type Buffer or Uint8Array'
    )
  }

  if (a === b) return 0

  var x = a.length
  var y = b.length

  for (var i = 0, len = Math.min(x, y); i < len; ++i) {
    if (a[i] !== b[i]) {
      x = a[i]
      y = b[i]
      break
    }
  }

  if (x < y) return -1
  if (y < x) return 1
  return 0
}

Buffer.isEncoding = function isEncoding (encoding) {
  switch (String(encoding).toLowerCase()) {
    case 'hex':
    case 'utf8':
    case 'utf-8':
    case 'ascii':
    case 'latin1':
    case 'binary':
    case 'base64':
    case 'ucs2':
    case 'ucs-2':
    case 'utf16le':
    case 'utf-16le':
      return true
    default:
      return false
  }
}

Buffer.concat = function concat (list, length) {
  if (!Array.isArray(list)) {
    throw new TypeError('"list" argument must be an Array of Buffers')
  }

  if (list.length === 0) {
    return Buffer.alloc(0)
  }

  var i
  if (length === undefined) {
    length = 0
    for (i = 0; i < list.length; ++i) {
      length += list[i].length
    }
  }

  var buffer = Buffer.allocUnsafe(length)
  var pos = 0
  for (i = 0; i < list.length; ++i) {
    var buf = list[i]
    if (isInstance(buf, Uint8Array)) {
      buf = Buffer.from(buf)
    }
    if (!Buffer.isBuffer(buf)) {
      throw new TypeError('"list" argument must be an Array of Buffers')
    }
    buf.copy(buffer, pos)
    pos += buf.length
  }
  return buffer
}

function byteLength (string, encoding) {
  if (Buffer.isBuffer(string)) {
    return string.length
  }
  if (ArrayBuffer.isView(string) || isInstance(string, ArrayBuffer)) {
    return string.byteLength
  }
  if (typeof string !== 'string') {
    throw new TypeError(
      'The "string" argument must be one of type string, Buffer, or ArrayBuffer. ' +
      'Received type ' + typeof string
    )
  }

  var len = string.length
  var mustMatch = (arguments.length > 2 && arguments[2] === true)
  if (!mustMatch && len === 0) return 0

  // Use a for loop to avoid recursion
  var loweredCase = false
  for (;;) {
    switch (encoding) {
      case 'ascii':
      case 'latin1':
      case 'binary':
        return len
      case 'utf8':
      case 'utf-8':
        return utf8ToBytes(string).length
      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return len * 2
      case 'hex':
        return len >>> 1
      case 'base64':
        return base64ToBytes(string).length
      default:
        if (loweredCase) {
          return mustMatch ? -1 : utf8ToBytes(string).length // assume utf8
        }
        encoding = ('' + encoding).toLowerCase()
        loweredCase = true
    }
  }
}
Buffer.byteLength = byteLength

function slowToString (encoding, start, end) {
  var loweredCase = false

  // No need to verify that "this.length <= MAX_UINT32" since it's a read-only
  // property of a typed array.

  // This behaves neither like String nor Uint8Array in that we set start/end
  // to their upper/lower bounds if the value passed is out of range.
  // undefined is handled specially as per ECMA-262 6th Edition,
  // Section 13.3.3.7 Runtime Semantics: KeyedBindingInitialization.
  if (start === undefined || start < 0) {
    start = 0
  }
  // Return early if start > this.length. Done here to prevent potential uint32
  // coercion fail below.
  if (start > this.length) {
    return ''
  }

  if (end === undefined || end > this.length) {
    end = this.length
  }

  if (end <= 0) {
    return ''
  }

  // Force coersion to uint32. This will also coerce falsey/NaN values to 0.
  end >>>= 0
  start >>>= 0

  if (end <= start) {
    return ''
  }

  if (!encoding) encoding = 'utf8'

  while (true) {
    switch (encoding) {
      case 'hex':
        return hexSlice(this, start, end)

      case 'utf8':
      case 'utf-8':
        return utf8Slice(this, start, end)

      case 'ascii':
        return asciiSlice(this, start, end)

      case 'latin1':
      case 'binary':
        return latin1Slice(this, start, end)

      case 'base64':
        return base64Slice(this, start, end)

      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return utf16leSlice(this, start, end)

      default:
        if (loweredCase) throw new TypeError('Unknown encoding: ' + encoding)
        encoding = (encoding + '').toLowerCase()
        loweredCase = true
    }
  }
}

// This property is used by `Buffer.isBuffer` (and the `is-buffer` npm package)
// to detect a Buffer instance. It's not possible to use `instanceof Buffer`
// reliably in a browserify context because there could be multiple different
// copies of the 'buffer' package in use. This method works even for Buffer
// instances that were created from another copy of the `buffer` package.
// See: https://github.com/feross/buffer/issues/154
Buffer.prototype._isBuffer = true

function swap (b, n, m) {
  var i = b[n]
  b[n] = b[m]
  b[m] = i
}

Buffer.prototype.swap16 = function swap16 () {
  var len = this.length
  if (len % 2 !== 0) {
    throw new RangeError('Buffer size must be a multiple of 16-bits')
  }
  for (var i = 0; i < len; i += 2) {
    swap(this, i, i + 1)
  }
  return this
}

Buffer.prototype.swap32 = function swap32 () {
  var len = this.length
  if (len % 4 !== 0) {
    throw new RangeError('Buffer size must be a multiple of 32-bits')
  }
  for (var i = 0; i < len; i += 4) {
    swap(this, i, i + 3)
    swap(this, i + 1, i + 2)
  }
  return this
}

Buffer.prototype.swap64 = function swap64 () {
  var len = this.length
  if (len % 8 !== 0) {
    throw new RangeError('Buffer size must be a multiple of 64-bits')
  }
  for (var i = 0; i < len; i += 8) {
    swap(this, i, i + 7)
    swap(this, i + 1, i + 6)
    swap(this, i + 2, i + 5)
    swap(this, i + 3, i + 4)
  }
  return this
}

Buffer.prototype.toString = function toString () {
  var length = this.length
  if (length === 0) return ''
  if (arguments.length === 0) return utf8Slice(this, 0, length)
  return slowToString.apply(this, arguments)
}

Buffer.prototype.toLocaleString = Buffer.prototype.toString

Buffer.prototype.equals = function equals (b) {
  if (!Buffer.isBuffer(b)) throw new TypeError('Argument must be a Buffer')
  if (this === b) return true
  return Buffer.compare(this, b) === 0
}

Buffer.prototype.inspect = function inspect () {
  var str = ''
  var max = exports.INSPECT_MAX_BYTES
  str = this.toString('hex', 0, max).replace(/(.{2})/g, '$1 ').trim()
  if (this.length > max) str += ' ... '
  return '<Buffer ' + str + '>'
}

Buffer.prototype.compare = function compare (target, start, end, thisStart, thisEnd) {
  if (isInstance(target, Uint8Array)) {
    target = Buffer.from(target, target.offset, target.byteLength)
  }
  if (!Buffer.isBuffer(target)) {
    throw new TypeError(
      'The "target" argument must be one of type Buffer or Uint8Array. ' +
      'Received type ' + (typeof target)
    )
  }

  if (start === undefined) {
    start = 0
  }
  if (end === undefined) {
    end = target ? target.length : 0
  }
  if (thisStart === undefined) {
    thisStart = 0
  }
  if (thisEnd === undefined) {
    thisEnd = this.length
  }

  if (start < 0 || end > target.length || thisStart < 0 || thisEnd > this.length) {
    throw new RangeError('out of range index')
  }

  if (thisStart >= thisEnd && start >= end) {
    return 0
  }
  if (thisStart >= thisEnd) {
    return -1
  }
  if (start >= end) {
    return 1
  }

  start >>>= 0
  end >>>= 0
  thisStart >>>= 0
  thisEnd >>>= 0

  if (this === target) return 0

  var x = thisEnd - thisStart
  var y = end - start
  var len = Math.min(x, y)

  var thisCopy = this.slice(thisStart, thisEnd)
  var targetCopy = target.slice(start, end)

  for (var i = 0; i < len; ++i) {
    if (thisCopy[i] !== targetCopy[i]) {
      x = thisCopy[i]
      y = targetCopy[i]
      break
    }
  }

  if (x < y) return -1
  if (y < x) return 1
  return 0
}

// Finds either the first index of `val` in `buffer` at offset >= `byteOffset`,
// OR the last index of `val` in `buffer` at offset <= `byteOffset`.
//
// Arguments:
// - buffer - a Buffer to search
// - val - a string, Buffer, or number
// - byteOffset - an index into `buffer`; will be clamped to an int32
// - encoding - an optional encoding, relevant is val is a string
// - dir - true for indexOf, false for lastIndexOf
function bidirectionalIndexOf (buffer, val, byteOffset, encoding, dir) {
  // Empty buffer means no match
  if (buffer.length === 0) return -1

  // Normalize byteOffset
  if (typeof byteOffset === 'string') {
    encoding = byteOffset
    byteOffset = 0
  } else if (byteOffset > 0x7fffffff) {
    byteOffset = 0x7fffffff
  } else if (byteOffset < -0x80000000) {
    byteOffset = -0x80000000
  }
  byteOffset = +byteOffset // Coerce to Number.
  if (numberIsNaN(byteOffset)) {
    // byteOffset: it it's undefined, null, NaN, "foo", etc, search whole buffer
    byteOffset = dir ? 0 : (buffer.length - 1)
  }

  // Normalize byteOffset: negative offsets start from the end of the buffer
  if (byteOffset < 0) byteOffset = buffer.length + byteOffset
  if (byteOffset >= buffer.length) {
    if (dir) return -1
    else byteOffset = buffer.length - 1
  } else if (byteOffset < 0) {
    if (dir) byteOffset = 0
    else return -1
  }

  // Normalize val
  if (typeof val === 'string') {
    val = Buffer.from(val, encoding)
  }

  // Finally, search either indexOf (if dir is true) or lastIndexOf
  if (Buffer.isBuffer(val)) {
    // Special case: looking for empty string/buffer always fails
    if (val.length === 0) {
      return -1
    }
    return arrayIndexOf(buffer, val, byteOffset, encoding, dir)
  } else if (typeof val === 'number') {
    val = val & 0xFF // Search for a byte value [0-255]
    if (typeof Uint8Array.prototype.indexOf === 'function') {
      if (dir) {
        return Uint8Array.prototype.indexOf.call(buffer, val, byteOffset)
      } else {
        return Uint8Array.prototype.lastIndexOf.call(buffer, val, byteOffset)
      }
    }
    return arrayIndexOf(buffer, [ val ], byteOffset, encoding, dir)
  }

  throw new TypeError('val must be string, number or Buffer')
}

function arrayIndexOf (arr, val, byteOffset, encoding, dir) {
  var indexSize = 1
  var arrLength = arr.length
  var valLength = val.length

  if (encoding !== undefined) {
    encoding = String(encoding).toLowerCase()
    if (encoding === 'ucs2' || encoding === 'ucs-2' ||
        encoding === 'utf16le' || encoding === 'utf-16le') {
      if (arr.length < 2 || val.length < 2) {
        return -1
      }
      indexSize = 2
      arrLength /= 2
      valLength /= 2
      byteOffset /= 2
    }
  }

  function read (buf, i) {
    if (indexSize === 1) {
      return buf[i]
    } else {
      return buf.readUInt16BE(i * indexSize)
    }
  }

  var i
  if (dir) {
    var foundIndex = -1
    for (i = byteOffset; i < arrLength; i++) {
      if (read(arr, i) === read(val, foundIndex === -1 ? 0 : i - foundIndex)) {
        if (foundIndex === -1) foundIndex = i
        if (i - foundIndex + 1 === valLength) return foundIndex * indexSize
      } else {
        if (foundIndex !== -1) i -= i - foundIndex
        foundIndex = -1
      }
    }
  } else {
    if (byteOffset + valLength > arrLength) byteOffset = arrLength - valLength
    for (i = byteOffset; i >= 0; i--) {
      var found = true
      for (var j = 0; j < valLength; j++) {
        if (read(arr, i + j) !== read(val, j)) {
          found = false
          break
        }
      }
      if (found) return i
    }
  }

  return -1
}

Buffer.prototype.includes = function includes (val, byteOffset, encoding) {
  return this.indexOf(val, byteOffset, encoding) !== -1
}

Buffer.prototype.indexOf = function indexOf (val, byteOffset, encoding) {
  return bidirectionalIndexOf(this, val, byteOffset, encoding, true)
}

Buffer.prototype.lastIndexOf = function lastIndexOf (val, byteOffset, encoding) {
  return bidirectionalIndexOf(this, val, byteOffset, encoding, false)
}

function hexWrite (buf, string, offset, length) {
  offset = Number(offset) || 0
  var remaining = buf.length - offset
  if (!length) {
    length = remaining
  } else {
    length = Number(length)
    if (length > remaining) {
      length = remaining
    }
  }

  var strLen = string.length

  if (length > strLen / 2) {
    length = strLen / 2
  }
  for (var i = 0; i < length; ++i) {
    var parsed = parseInt(string.substr(i * 2, 2), 16)
    if (numberIsNaN(parsed)) return i
    buf[offset + i] = parsed
  }
  return i
}

function utf8Write (buf, string, offset, length) {
  return blitBuffer(utf8ToBytes(string, buf.length - offset), buf, offset, length)
}

function asciiWrite (buf, string, offset, length) {
  return blitBuffer(asciiToBytes(string), buf, offset, length)
}

function latin1Write (buf, string, offset, length) {
  return asciiWrite(buf, string, offset, length)
}

function base64Write (buf, string, offset, length) {
  return blitBuffer(base64ToBytes(string), buf, offset, length)
}

function ucs2Write (buf, string, offset, length) {
  return blitBuffer(utf16leToBytes(string, buf.length - offset), buf, offset, length)
}

Buffer.prototype.write = function write (string, offset, length, encoding) {
  // Buffer#write(string)
  if (offset === undefined) {
    encoding = 'utf8'
    length = this.length
    offset = 0
  // Buffer#write(string, encoding)
  } else if (length === undefined && typeof offset === 'string') {
    encoding = offset
    length = this.length
    offset = 0
  // Buffer#write(string, offset[, length][, encoding])
  } else if (isFinite(offset)) {
    offset = offset >>> 0
    if (isFinite(length)) {
      length = length >>> 0
      if (encoding === undefined) encoding = 'utf8'
    } else {
      encoding = length
      length = undefined
    }
  } else {
    throw new Error(
      'Buffer.write(string, encoding, offset[, length]) is no longer supported'
    )
  }

  var remaining = this.length - offset
  if (length === undefined || length > remaining) length = remaining

  if ((string.length > 0 && (length < 0 || offset < 0)) || offset > this.length) {
    throw new RangeError('Attempt to write outside buffer bounds')
  }

  if (!encoding) encoding = 'utf8'

  var loweredCase = false
  for (;;) {
    switch (encoding) {
      case 'hex':
        return hexWrite(this, string, offset, length)

      case 'utf8':
      case 'utf-8':
        return utf8Write(this, string, offset, length)

      case 'ascii':
        return asciiWrite(this, string, offset, length)

      case 'latin1':
      case 'binary':
        return latin1Write(this, string, offset, length)

      case 'base64':
        // Warning: maxLength not taken into account in base64Write
        return base64Write(this, string, offset, length)

      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return ucs2Write(this, string, offset, length)

      default:
        if (loweredCase) throw new TypeError('Unknown encoding: ' + encoding)
        encoding = ('' + encoding).toLowerCase()
        loweredCase = true
    }
  }
}

Buffer.prototype.toJSON = function toJSON () {
  return {
    type: 'Buffer',
    data: Array.prototype.slice.call(this._arr || this, 0)
  }
}

function base64Slice (buf, start, end) {
  if (start === 0 && end === buf.length) {
    return base64.fromByteArray(buf)
  } else {
    return base64.fromByteArray(buf.slice(start, end))
  }
}

function utf8Slice (buf, start, end) {
  end = Math.min(buf.length, end)
  var res = []

  var i = start
  while (i < end) {
    var firstByte = buf[i]
    var codePoint = null
    var bytesPerSequence = (firstByte > 0xEF) ? 4
      : (firstByte > 0xDF) ? 3
        : (firstByte > 0xBF) ? 2
          : 1

    if (i + bytesPerSequence <= end) {
      var secondByte, thirdByte, fourthByte, tempCodePoint

      switch (bytesPerSequence) {
        case 1:
          if (firstByte < 0x80) {
            codePoint = firstByte
          }
          break
        case 2:
          secondByte = buf[i + 1]
          if ((secondByte & 0xC0) === 0x80) {
            tempCodePoint = (firstByte & 0x1F) << 0x6 | (secondByte & 0x3F)
            if (tempCodePoint > 0x7F) {
              codePoint = tempCodePoint
            }
          }
          break
        case 3:
          secondByte = buf[i + 1]
          thirdByte = buf[i + 2]
          if ((secondByte & 0xC0) === 0x80 && (thirdByte & 0xC0) === 0x80) {
            tempCodePoint = (firstByte & 0xF) << 0xC | (secondByte & 0x3F) << 0x6 | (thirdByte & 0x3F)
            if (tempCodePoint > 0x7FF && (tempCodePoint < 0xD800 || tempCodePoint > 0xDFFF)) {
              codePoint = tempCodePoint
            }
          }
          break
        case 4:
          secondByte = buf[i + 1]
          thirdByte = buf[i + 2]
          fourthByte = buf[i + 3]
          if ((secondByte & 0xC0) === 0x80 && (thirdByte & 0xC0) === 0x80 && (fourthByte & 0xC0) === 0x80) {
            tempCodePoint = (firstByte & 0xF) << 0x12 | (secondByte & 0x3F) << 0xC | (thirdByte & 0x3F) << 0x6 | (fourthByte & 0x3F)
            if (tempCodePoint > 0xFFFF && tempCodePoint < 0x110000) {
              codePoint = tempCodePoint
            }
          }
      }
    }

    if (codePoint === null) {
      // we did not generate a valid codePoint so insert a
      // replacement char (U+FFFD) and advance only 1 byte
      codePoint = 0xFFFD
      bytesPerSequence = 1
    } else if (codePoint > 0xFFFF) {
      // encode to utf16 (surrogate pair dance)
      codePoint -= 0x10000
      res.push(codePoint >>> 10 & 0x3FF | 0xD800)
      codePoint = 0xDC00 | codePoint & 0x3FF
    }

    res.push(codePoint)
    i += bytesPerSequence
  }

  return decodeCodePointsArray(res)
}

// Based on http://stackoverflow.com/a/22747272/680742, the browser with
// the lowest limit is Chrome, with 0x10000 args.
// We go 1 magnitude less, for safety
var MAX_ARGUMENTS_LENGTH = 0x1000

function decodeCodePointsArray (codePoints) {
  var len = codePoints.length
  if (len <= MAX_ARGUMENTS_LENGTH) {
    return String.fromCharCode.apply(String, codePoints) // avoid extra slice()
  }

  // Decode in chunks to avoid "call stack size exceeded".
  var res = ''
  var i = 0
  while (i < len) {
    res += String.fromCharCode.apply(
      String,
      codePoints.slice(i, i += MAX_ARGUMENTS_LENGTH)
    )
  }
  return res
}

function asciiSlice (buf, start, end) {
  var ret = ''
  end = Math.min(buf.length, end)

  for (var i = start; i < end; ++i) {
    ret += String.fromCharCode(buf[i] & 0x7F)
  }
  return ret
}

function latin1Slice (buf, start, end) {
  var ret = ''
  end = Math.min(buf.length, end)

  for (var i = start; i < end; ++i) {
    ret += String.fromCharCode(buf[i])
  }
  return ret
}

function hexSlice (buf, start, end) {
  var len = buf.length

  if (!start || start < 0) start = 0
  if (!end || end < 0 || end > len) end = len

  var out = ''
  for (var i = start; i < end; ++i) {
    out += toHex(buf[i])
  }
  return out
}

function utf16leSlice (buf, start, end) {
  var bytes = buf.slice(start, end)
  var res = ''
  for (var i = 0; i < bytes.length; i += 2) {
    res += String.fromCharCode(bytes[i] + (bytes[i + 1] * 256))
  }
  return res
}

Buffer.prototype.slice = function slice (start, end) {
  var len = this.length
  start = ~~start
  end = end === undefined ? len : ~~end

  if (start < 0) {
    start += len
    if (start < 0) start = 0
  } else if (start > len) {
    start = len
  }

  if (end < 0) {
    end += len
    if (end < 0) end = 0
  } else if (end > len) {
    end = len
  }

  if (end < start) end = start

  var newBuf = this.subarray(start, end)
  // Return an augmented `Uint8Array` instance
  newBuf.__proto__ = Buffer.prototype
  return newBuf
}

/*
 * Need to make sure that buffer isn't trying to write out of bounds.
 */
function checkOffset (offset, ext, length) {
  if ((offset % 1) !== 0 || offset < 0) throw new RangeError('offset is not uint')
  if (offset + ext > length) throw new RangeError('Trying to access beyond buffer length')
}

Buffer.prototype.readUIntLE = function readUIntLE (offset, byteLength, noAssert) {
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) checkOffset(offset, byteLength, this.length)

  var val = this[offset]
  var mul = 1
  var i = 0
  while (++i < byteLength && (mul *= 0x100)) {
    val += this[offset + i] * mul
  }

  return val
}

Buffer.prototype.readUIntBE = function readUIntBE (offset, byteLength, noAssert) {
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) {
    checkOffset(offset, byteLength, this.length)
  }

  var val = this[offset + --byteLength]
  var mul = 1
  while (byteLength > 0 && (mul *= 0x100)) {
    val += this[offset + --byteLength] * mul
  }

  return val
}

Buffer.prototype.readUInt8 = function readUInt8 (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 1, this.length)
  return this[offset]
}

Buffer.prototype.readUInt16LE = function readUInt16LE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 2, this.length)
  return this[offset] | (this[offset + 1] << 8)
}

Buffer.prototype.readUInt16BE = function readUInt16BE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 2, this.length)
  return (this[offset] << 8) | this[offset + 1]
}

Buffer.prototype.readUInt32LE = function readUInt32LE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)

  return ((this[offset]) |
      (this[offset + 1] << 8) |
      (this[offset + 2] << 16)) +
      (this[offset + 3] * 0x1000000)
}

Buffer.prototype.readUInt32BE = function readUInt32BE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)

  return (this[offset] * 0x1000000) +
    ((this[offset + 1] << 16) |
    (this[offset + 2] << 8) |
    this[offset + 3])
}

Buffer.prototype.readIntLE = function readIntLE (offset, byteLength, noAssert) {
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) checkOffset(offset, byteLength, this.length)

  var val = this[offset]
  var mul = 1
  var i = 0
  while (++i < byteLength && (mul *= 0x100)) {
    val += this[offset + i] * mul
  }
  mul *= 0x80

  if (val >= mul) val -= Math.pow(2, 8 * byteLength)

  return val
}

Buffer.prototype.readIntBE = function readIntBE (offset, byteLength, noAssert) {
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) checkOffset(offset, byteLength, this.length)

  var i = byteLength
  var mul = 1
  var val = this[offset + --i]
  while (i > 0 && (mul *= 0x100)) {
    val += this[offset + --i] * mul
  }
  mul *= 0x80

  if (val >= mul) val -= Math.pow(2, 8 * byteLength)

  return val
}

Buffer.prototype.readInt8 = function readInt8 (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 1, this.length)
  if (!(this[offset] & 0x80)) return (this[offset])
  return ((0xff - this[offset] + 1) * -1)
}

Buffer.prototype.readInt16LE = function readInt16LE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 2, this.length)
  var val = this[offset] | (this[offset + 1] << 8)
  return (val & 0x8000) ? val | 0xFFFF0000 : val
}

Buffer.prototype.readInt16BE = function readInt16BE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 2, this.length)
  var val = this[offset + 1] | (this[offset] << 8)
  return (val & 0x8000) ? val | 0xFFFF0000 : val
}

Buffer.prototype.readInt32LE = function readInt32LE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)

  return (this[offset]) |
    (this[offset + 1] << 8) |
    (this[offset + 2] << 16) |
    (this[offset + 3] << 24)
}

Buffer.prototype.readInt32BE = function readInt32BE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)

  return (this[offset] << 24) |
    (this[offset + 1] << 16) |
    (this[offset + 2] << 8) |
    (this[offset + 3])
}

Buffer.prototype.readFloatLE = function readFloatLE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)
  return ieee754.read(this, offset, true, 23, 4)
}

Buffer.prototype.readFloatBE = function readFloatBE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)
  return ieee754.read(this, offset, false, 23, 4)
}

Buffer.prototype.readDoubleLE = function readDoubleLE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 8, this.length)
  return ieee754.read(this, offset, true, 52, 8)
}

Buffer.prototype.readDoubleBE = function readDoubleBE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 8, this.length)
  return ieee754.read(this, offset, false, 52, 8)
}

function checkInt (buf, value, offset, ext, max, min) {
  if (!Buffer.isBuffer(buf)) throw new TypeError('"buffer" argument must be a Buffer instance')
  if (value > max || value < min) throw new RangeError('"value" argument is out of bounds')
  if (offset + ext > buf.length) throw new RangeError('Index out of range')
}

Buffer.prototype.writeUIntLE = function writeUIntLE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) {
    var maxBytes = Math.pow(2, 8 * byteLength) - 1
    checkInt(this, value, offset, byteLength, maxBytes, 0)
  }

  var mul = 1
  var i = 0
  this[offset] = value & 0xFF
  while (++i < byteLength && (mul *= 0x100)) {
    this[offset + i] = (value / mul) & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeUIntBE = function writeUIntBE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) {
    var maxBytes = Math.pow(2, 8 * byteLength) - 1
    checkInt(this, value, offset, byteLength, maxBytes, 0)
  }

  var i = byteLength - 1
  var mul = 1
  this[offset + i] = value & 0xFF
  while (--i >= 0 && (mul *= 0x100)) {
    this[offset + i] = (value / mul) & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeUInt8 = function writeUInt8 (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 1, 0xff, 0)
  this[offset] = (value & 0xff)
  return offset + 1
}

Buffer.prototype.writeUInt16LE = function writeUInt16LE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 2, 0xffff, 0)
  this[offset] = (value & 0xff)
  this[offset + 1] = (value >>> 8)
  return offset + 2
}

Buffer.prototype.writeUInt16BE = function writeUInt16BE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 2, 0xffff, 0)
  this[offset] = (value >>> 8)
  this[offset + 1] = (value & 0xff)
  return offset + 2
}

Buffer.prototype.writeUInt32LE = function writeUInt32LE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 4, 0xffffffff, 0)
  this[offset + 3] = (value >>> 24)
  this[offset + 2] = (value >>> 16)
  this[offset + 1] = (value >>> 8)
  this[offset] = (value & 0xff)
  return offset + 4
}

Buffer.prototype.writeUInt32BE = function writeUInt32BE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 4, 0xffffffff, 0)
  this[offset] = (value >>> 24)
  this[offset + 1] = (value >>> 16)
  this[offset + 2] = (value >>> 8)
  this[offset + 3] = (value & 0xff)
  return offset + 4
}

Buffer.prototype.writeIntLE = function writeIntLE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) {
    var limit = Math.pow(2, (8 * byteLength) - 1)

    checkInt(this, value, offset, byteLength, limit - 1, -limit)
  }

  var i = 0
  var mul = 1
  var sub = 0
  this[offset] = value & 0xFF
  while (++i < byteLength && (mul *= 0x100)) {
    if (value < 0 && sub === 0 && this[offset + i - 1] !== 0) {
      sub = 1
    }
    this[offset + i] = ((value / mul) >> 0) - sub & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeIntBE = function writeIntBE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) {
    var limit = Math.pow(2, (8 * byteLength) - 1)

    checkInt(this, value, offset, byteLength, limit - 1, -limit)
  }

  var i = byteLength - 1
  var mul = 1
  var sub = 0
  this[offset + i] = value & 0xFF
  while (--i >= 0 && (mul *= 0x100)) {
    if (value < 0 && sub === 0 && this[offset + i + 1] !== 0) {
      sub = 1
    }
    this[offset + i] = ((value / mul) >> 0) - sub & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeInt8 = function writeInt8 (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 1, 0x7f, -0x80)
  if (value < 0) value = 0xff + value + 1
  this[offset] = (value & 0xff)
  return offset + 1
}

Buffer.prototype.writeInt16LE = function writeInt16LE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 2, 0x7fff, -0x8000)
  this[offset] = (value & 0xff)
  this[offset + 1] = (value >>> 8)
  return offset + 2
}

Buffer.prototype.writeInt16BE = function writeInt16BE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 2, 0x7fff, -0x8000)
  this[offset] = (value >>> 8)
  this[offset + 1] = (value & 0xff)
  return offset + 2
}

Buffer.prototype.writeInt32LE = function writeInt32LE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 4, 0x7fffffff, -0x80000000)
  this[offset] = (value & 0xff)
  this[offset + 1] = (value >>> 8)
  this[offset + 2] = (value >>> 16)
  this[offset + 3] = (value >>> 24)
  return offset + 4
}

Buffer.prototype.writeInt32BE = function writeInt32BE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 4, 0x7fffffff, -0x80000000)
  if (value < 0) value = 0xffffffff + value + 1
  this[offset] = (value >>> 24)
  this[offset + 1] = (value >>> 16)
  this[offset + 2] = (value >>> 8)
  this[offset + 3] = (value & 0xff)
  return offset + 4
}

function checkIEEE754 (buf, value, offset, ext, max, min) {
  if (offset + ext > buf.length) throw new RangeError('Index out of range')
  if (offset < 0) throw new RangeError('Index out of range')
}

function writeFloat (buf, value, offset, littleEndian, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) {
    checkIEEE754(buf, value, offset, 4, 3.4028234663852886e+38, -3.4028234663852886e+38)
  }
  ieee754.write(buf, value, offset, littleEndian, 23, 4)
  return offset + 4
}

Buffer.prototype.writeFloatLE = function writeFloatLE (value, offset, noAssert) {
  return writeFloat(this, value, offset, true, noAssert)
}

Buffer.prototype.writeFloatBE = function writeFloatBE (value, offset, noAssert) {
  return writeFloat(this, value, offset, false, noAssert)
}

function writeDouble (buf, value, offset, littleEndian, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) {
    checkIEEE754(buf, value, offset, 8, 1.7976931348623157E+308, -1.7976931348623157E+308)
  }
  ieee754.write(buf, value, offset, littleEndian, 52, 8)
  return offset + 8
}

Buffer.prototype.writeDoubleLE = function writeDoubleLE (value, offset, noAssert) {
  return writeDouble(this, value, offset, true, noAssert)
}

Buffer.prototype.writeDoubleBE = function writeDoubleBE (value, offset, noAssert) {
  return writeDouble(this, value, offset, false, noAssert)
}

// copy(targetBuffer, targetStart=0, sourceStart=0, sourceEnd=buffer.length)
Buffer.prototype.copy = function copy (target, targetStart, start, end) {
  if (!Buffer.isBuffer(target)) throw new TypeError('argument should be a Buffer')
  if (!start) start = 0
  if (!end && end !== 0) end = this.length
  if (targetStart >= target.length) targetStart = target.length
  if (!targetStart) targetStart = 0
  if (end > 0 && end < start) end = start

  // Copy 0 bytes; we're done
  if (end === start) return 0
  if (target.length === 0 || this.length === 0) return 0

  // Fatal error conditions
  if (targetStart < 0) {
    throw new RangeError('targetStart out of bounds')
  }
  if (start < 0 || start >= this.length) throw new RangeError('Index out of range')
  if (end < 0) throw new RangeError('sourceEnd out of bounds')

  // Are we oob?
  if (end > this.length) end = this.length
  if (target.length - targetStart < end - start) {
    end = target.length - targetStart + start
  }

  var len = end - start

  if (this === target && typeof Uint8Array.prototype.copyWithin === 'function') {
    // Use built-in when available, missing from IE11
    this.copyWithin(targetStart, start, end)
  } else if (this === target && start < targetStart && targetStart < end) {
    // descending copy from end
    for (var i = len - 1; i >= 0; --i) {
      target[i + targetStart] = this[i + start]
    }
  } else {
    Uint8Array.prototype.set.call(
      target,
      this.subarray(start, end),
      targetStart
    )
  }

  return len
}

// Usage:
//    buffer.fill(number[, offset[, end]])
//    buffer.fill(buffer[, offset[, end]])
//    buffer.fill(string[, offset[, end]][, encoding])
Buffer.prototype.fill = function fill (val, start, end, encoding) {
  // Handle string cases:
  if (typeof val === 'string') {
    if (typeof start === 'string') {
      encoding = start
      start = 0
      end = this.length
    } else if (typeof end === 'string') {
      encoding = end
      end = this.length
    }
    if (encoding !== undefined && typeof encoding !== 'string') {
      throw new TypeError('encoding must be a string')
    }
    if (typeof encoding === 'string' && !Buffer.isEncoding(encoding)) {
      throw new TypeError('Unknown encoding: ' + encoding)
    }
    if (val.length === 1) {
      var code = val.charCodeAt(0)
      if ((encoding === 'utf8' && code < 128) ||
          encoding === 'latin1') {
        // Fast path: If `val` fits into a single byte, use that numeric value.
        val = code
      }
    }
  } else if (typeof val === 'number') {
    val = val & 255
  }

  // Invalid ranges are not set to a default, so can range check early.
  if (start < 0 || this.length < start || this.length < end) {
    throw new RangeError('Out of range index')
  }

  if (end <= start) {
    return this
  }

  start = start >>> 0
  end = end === undefined ? this.length : end >>> 0

  if (!val) val = 0

  var i
  if (typeof val === 'number') {
    for (i = start; i < end; ++i) {
      this[i] = val
    }
  } else {
    var bytes = Buffer.isBuffer(val)
      ? val
      : Buffer.from(val, encoding)
    var len = bytes.length
    if (len === 0) {
      throw new TypeError('The value "' + val +
        '" is invalid for argument "value"')
    }
    for (i = 0; i < end - start; ++i) {
      this[i + start] = bytes[i % len]
    }
  }

  return this
}

// HELPER FUNCTIONS
// ================

var INVALID_BASE64_RE = /[^+/0-9A-Za-z-_]/g

function base64clean (str) {
  // Node takes equal signs as end of the Base64 encoding
  str = str.split('=')[0]
  // Node strips out invalid characters like \n and \t from the string, base64-js does not
  str = str.trim().replace(INVALID_BASE64_RE, '')
  // Node converts strings with length < 2 to ''
  if (str.length < 2) return ''
  // Node allows for non-padded base64 strings (missing trailing ===), base64-js does not
  while (str.length % 4 !== 0) {
    str = str + '='
  }
  return str
}

function toHex (n) {
  if (n < 16) return '0' + n.toString(16)
  return n.toString(16)
}

function utf8ToBytes (string, units) {
  units = units || Infinity
  var codePoint
  var length = string.length
  var leadSurrogate = null
  var bytes = []

  for (var i = 0; i < length; ++i) {
    codePoint = string.charCodeAt(i)

    // is surrogate component
    if (codePoint > 0xD7FF && codePoint < 0xE000) {
      // last char was a lead
      if (!leadSurrogate) {
        // no lead yet
        if (codePoint > 0xDBFF) {
          // unexpected trail
          if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
          continue
        } else if (i + 1 === length) {
          // unpaired lead
          if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
          continue
        }

        // valid lead
        leadSurrogate = codePoint

        continue
      }

      // 2 leads in a row
      if (codePoint < 0xDC00) {
        if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
        leadSurrogate = codePoint
        continue
      }

      // valid surrogate pair
      codePoint = (leadSurrogate - 0xD800 << 10 | codePoint - 0xDC00) + 0x10000
    } else if (leadSurrogate) {
      // valid bmp char, but last char was a lead
      if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
    }

    leadSurrogate = null

    // encode utf8
    if (codePoint < 0x80) {
      if ((units -= 1) < 0) break
      bytes.push(codePoint)
    } else if (codePoint < 0x800) {
      if ((units -= 2) < 0) break
      bytes.push(
        codePoint >> 0x6 | 0xC0,
        codePoint & 0x3F | 0x80
      )
    } else if (codePoint < 0x10000) {
      if ((units -= 3) < 0) break
      bytes.push(
        codePoint >> 0xC | 0xE0,
        codePoint >> 0x6 & 0x3F | 0x80,
        codePoint & 0x3F | 0x80
      )
    } else if (codePoint < 0x110000) {
      if ((units -= 4) < 0) break
      bytes.push(
        codePoint >> 0x12 | 0xF0,
        codePoint >> 0xC & 0x3F | 0x80,
        codePoint >> 0x6 & 0x3F | 0x80,
        codePoint & 0x3F | 0x80
      )
    } else {
      throw new Error('Invalid code point')
    }
  }

  return bytes
}

function asciiToBytes (str) {
  var byteArray = []
  for (var i = 0; i < str.length; ++i) {
    // Node's code seems to be doing this and not & 0x7F..
    byteArray.push(str.charCodeAt(i) & 0xFF)
  }
  return byteArray
}

function utf16leToBytes (str, units) {
  var c, hi, lo
  var byteArray = []
  for (var i = 0; i < str.length; ++i) {
    if ((units -= 2) < 0) break

    c = str.charCodeAt(i)
    hi = c >> 8
    lo = c % 256
    byteArray.push(lo)
    byteArray.push(hi)
  }

  return byteArray
}

function base64ToBytes (str) {
  return base64.toByteArray(base64clean(str))
}

function blitBuffer (src, dst, offset, length) {
  for (var i = 0; i < length; ++i) {
    if ((i + offset >= dst.length) || (i >= src.length)) break
    dst[i + offset] = src[i]
  }
  return i
}

// ArrayBuffer or Uint8Array objects from other contexts (i.e. iframes) do not pass
// the `instanceof` check but they should be treated as of that type.
// See: https://github.com/feross/buffer/issues/166
function isInstance (obj, type) {
  return obj instanceof type ||
    (obj != null && obj.constructor != null && obj.constructor.name != null &&
      obj.constructor.name === type.name)
}
function numberIsNaN (obj) {
  // For IE11 support
  return obj !== obj // eslint-disable-line no-self-compare
}

}).call(this)}).call(this,require("buffer").Buffer)
},{"base64-js":1,"buffer":2,"ieee754":3}],3:[function(require,module,exports){
/*! ieee754. BSD-3-Clause License. Feross Aboukhadijeh <https://feross.org/opensource> */
exports.read = function (buffer, offset, isLE, mLen, nBytes) {
  var e, m
  var eLen = (nBytes * 8) - mLen - 1
  var eMax = (1 << eLen) - 1
  var eBias = eMax >> 1
  var nBits = -7
  var i = isLE ? (nBytes - 1) : 0
  var d = isLE ? -1 : 1
  var s = buffer[offset + i]

  i += d

  e = s & ((1 << (-nBits)) - 1)
  s >>= (-nBits)
  nBits += eLen
  for (; nBits > 0; e = (e * 256) + buffer[offset + i], i += d, nBits -= 8) {}

  m = e & ((1 << (-nBits)) - 1)
  e >>= (-nBits)
  nBits += mLen
  for (; nBits > 0; m = (m * 256) + buffer[offset + i], i += d, nBits -= 8) {}

  if (e === 0) {
    e = 1 - eBias
  } else if (e === eMax) {
    return m ? NaN : ((s ? -1 : 1) * Infinity)
  } else {
    m = m + Math.pow(2, mLen)
    e = e - eBias
  }
  return (s ? -1 : 1) * m * Math.pow(2, e - mLen)
}

exports.write = function (buffer, value, offset, isLE, mLen, nBytes) {
  var e, m, c
  var eLen = (nBytes * 8) - mLen - 1
  var eMax = (1 << eLen) - 1
  var eBias = eMax >> 1
  var rt = (mLen === 23 ? Math.pow(2, -24) - Math.pow(2, -77) : 0)
  var i = isLE ? 0 : (nBytes - 1)
  var d = isLE ? 1 : -1
  var s = value < 0 || (value === 0 && 1 / value < 0) ? 1 : 0

  value = Math.abs(value)

  if (isNaN(value) || value === Infinity) {
    m = isNaN(value) ? 1 : 0
    e = eMax
  } else {
    e = Math.floor(Math.log(value) / Math.LN2)
    if (value * (c = Math.pow(2, -e)) < 1) {
      e--
      c *= 2
    }
    if (e + eBias >= 1) {
      value += rt / c
    } else {
      value += rt * Math.pow(2, 1 - eBias)
    }
    if (value * c >= 2) {
      e++
      c /= 2
    }

    if (e + eBias >= eMax) {
      m = 0
      e = eMax
    } else if (e + eBias >= 1) {
      m = ((value * c) - 1) * Math.pow(2, mLen)
      e = e + eBias
    } else {
      m = value * Math.pow(2, eBias - 1) * Math.pow(2, mLen)
      e = 0
    }
  }

  for (; mLen >= 8; buffer[offset + i] = m & 0xff, i += d, m /= 256, mLen -= 8) {}

  e = (e << mLen) | m
  eLen += mLen
  for (; eLen > 0; buffer[offset + i] = e & 0xff, i += d, e /= 256, eLen -= 8) {}

  buffer[offset + i - d] |= s * 128
}

},{}],4:[function(require,module,exports){
// shim for using process in browser
var process = module.exports = {};

// cached from whatever global is present so that test runners that stub it
// don't break things.  But we need to wrap it in a try catch in case it is
// wrapped in strict mode code which doesn't define any globals.  It's inside a
// function because try/catches deoptimize in certain engines.

var cachedSetTimeout;
var cachedClearTimeout;

function defaultSetTimout() {
    throw new Error('setTimeout has not been defined');
}
function defaultClearTimeout () {
    throw new Error('clearTimeout has not been defined');
}
(function () {
    try {
        if (typeof setTimeout === 'function') {
            cachedSetTimeout = setTimeout;
        } else {
            cachedSetTimeout = defaultSetTimout;
        }
    } catch (e) {
        cachedSetTimeout = defaultSetTimout;
    }
    try {
        if (typeof clearTimeout === 'function') {
            cachedClearTimeout = clearTimeout;
        } else {
            cachedClearTimeout = defaultClearTimeout;
        }
    } catch (e) {
        cachedClearTimeout = defaultClearTimeout;
    }
} ())
function runTimeout(fun) {
    if (cachedSetTimeout === setTimeout) {
        //normal enviroments in sane situations
        return setTimeout(fun, 0);
    }
    // if setTimeout wasn't available but was latter defined
    if ((cachedSetTimeout === defaultSetTimout || !cachedSetTimeout) && setTimeout) {
        cachedSetTimeout = setTimeout;
        return setTimeout(fun, 0);
    }
    try {
        // when when somebody has screwed with setTimeout but no I.E. maddness
        return cachedSetTimeout(fun, 0);
    } catch(e){
        try {
            // When we are in I.E. but the script has been evaled so I.E. doesn't trust the global object when called normally
            return cachedSetTimeout.call(null, fun, 0);
        } catch(e){
            // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error
            return cachedSetTimeout.call(this, fun, 0);
        }
    }


}
function runClearTimeout(marker) {
    if (cachedClearTimeout === clearTimeout) {
        //normal enviroments in sane situations
        return clearTimeout(marker);
    }
    // if clearTimeout wasn't available but was latter defined
    if ((cachedClearTimeout === defaultClearTimeout || !cachedClearTimeout) && clearTimeout) {
        cachedClearTimeout = clearTimeout;
        return clearTimeout(marker);
    }
    try {
        // when when somebody has screwed with setTimeout but no I.E. maddness
        return cachedClearTimeout(marker);
    } catch (e){
        try {
            // When we are in I.E. but the script has been evaled so I.E. doesn't  trust the global object when called normally
            return cachedClearTimeout.call(null, marker);
        } catch (e){
            // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error.
            // Some versions of I.E. have different rules for clearTimeout vs setTimeout
            return cachedClearTimeout.call(this, marker);
        }
    }



}
var queue = [];
var draining = false;
var currentQueue;
var queueIndex = -1;

function cleanUpNextTick() {
    if (!draining || !currentQueue) {
        return;
    }
    draining = false;
    if (currentQueue.length) {
        queue = currentQueue.concat(queue);
    } else {
        queueIndex = -1;
    }
    if (queue.length) {
        drainQueue();
    }
}

function drainQueue() {
    if (draining) {
        return;
    }
    var timeout = runTimeout(cleanUpNextTick);
    draining = true;

    var len = queue.length;
    while(len) {
        currentQueue = queue;
        queue = [];
        while (++queueIndex < len) {
            if (currentQueue) {
                currentQueue[queueIndex].run();
            }
        }
        queueIndex = -1;
        len = queue.length;
    }
    currentQueue = null;
    draining = false;
    runClearTimeout(timeout);
}

process.nextTick = function (fun) {
    var args = new Array(arguments.length - 1);
    if (arguments.length > 1) {
        for (var i = 1; i < arguments.length; i++) {
            args[i - 1] = arguments[i];
        }
    }
    queue.push(new Item(fun, args));
    if (queue.length === 1 && !draining) {
        runTimeout(drainQueue);
    }
};

// v8 likes predictible objects
function Item(fun, array) {
    this.fun = fun;
    this.array = array;
}
Item.prototype.run = function () {
    this.fun.apply(null, this.array);
};
process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];
process.version = ''; // empty string to avoid regexp issues
process.versions = {};

function noop() {}

process.on = noop;
process.addListener = noop;
process.once = noop;
process.off = noop;
process.removeListener = noop;
process.removeAllListeners = noop;
process.emit = noop;
process.prependListener = noop;
process.prependOnceListener = noop;

process.listeners = function (name) { return [] }

process.binding = function (name) {
    throw new Error('process.binding is not supported');
};

process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};
process.umask = function() { return 0; };

},{}],5:[function(require,module,exports){
(function (process,Buffer){(function (){
'use strict';

/**
 * MIDI file format constants.
 * @return {Constants}
 */
var Constants = {
    VERSION: '3.1.1',
    HEADER_CHUNK_TYPE: [0x4d, 0x54, 0x68, 0x64],
    HEADER_CHUNK_LENGTH: [0x00, 0x00, 0x00, 0x06],
    HEADER_CHUNK_FORMAT0: [0x00, 0x00],
    HEADER_CHUNK_FORMAT1: [0x00, 0x01],
    HEADER_CHUNK_DIVISION: [0x00, 0x80],
    TRACK_CHUNK_TYPE: [0x4d, 0x54, 0x72, 0x6b],
    META_EVENT_ID: 0xFF,
    META_SMTPE_OFFSET: 0x54
};

// src/utils.ts
var fillStr = (s, n) => Array(Math.abs(n) + 1).join(s);

// src/named.ts
function isNamed(src) {
  return src !== null && typeof src === "object" && typeof src.name === "string" ? true : false;
}

// src/pitch.ts
function isPitch(pitch) {
  return pitch !== null && typeof pitch === "object" && typeof pitch.step === "number" && typeof pitch.alt === "number" ? true : false;
}
var FIFTHS = [0, 2, 4, -1, 1, 3, 5];
var STEPS_TO_OCTS = FIFTHS.map(
  (fifths) => Math.floor(fifths * 7 / 12)
);
function encode(pitch) {
  const { step, alt, oct, dir = 1 } = pitch;
  const f = FIFTHS[step] + 7 * alt;
  if (oct === void 0) {
    return [dir * f];
  }
  const o = oct - STEPS_TO_OCTS[step] - 4 * alt;
  return [dir * f, dir * o];
}

// src/note.ts
var NoNote = { empty: true, name: "", pc: "", acc: "" };
var cache = /* @__PURE__ */ new Map();
var stepToLetter = (step) => "CDEFGAB".charAt(step);
var altToAcc = (alt) => alt < 0 ? fillStr("b", -alt) : fillStr("#", alt);
var accToAlt = (acc) => acc[0] === "b" ? -acc.length : acc.length;
function note(src) {
  const stringSrc = JSON.stringify(src);
  const cached = cache.get(stringSrc);
  if (cached) {
    return cached;
  }
  const value = typeof src === "string" ? parse(src) : isPitch(src) ? note(pitchName(src)) : isNamed(src) ? note(src.name) : NoNote;
  cache.set(stringSrc, value);
  return value;
}
var REGEX = /^([a-gA-G]?)(#{1,}|b{1,}|x{1,}|)(-?\d*)\s*(.*)$/;
function tokenizeNote(str) {
  const m = REGEX.exec(str);
  return [m[1].toUpperCase(), m[2].replace(/x/g, "##"), m[3], m[4]];
}
var mod = (n, m) => (n % m + m) % m;
var SEMI = [0, 2, 4, 5, 7, 9, 11];
function parse(noteName) {
  const tokens = tokenizeNote(noteName);
  if (tokens[0] === "" || tokens[3] !== "") {
    return NoNote;
  }
  const letter = tokens[0];
  const acc = tokens[1];
  const octStr = tokens[2];
  const step = (letter.charCodeAt(0) + 3) % 7;
  const alt = accToAlt(acc);
  const oct = octStr.length ? +octStr : void 0;
  const coord = encode({ step, alt, oct });
  const name = letter + acc + octStr;
  const pc = letter + acc;
  const chroma = (SEMI[step] + alt + 120) % 12;
  const height = oct === void 0 ? mod(SEMI[step] + alt, 12) - 12 * 99 : SEMI[step] + alt + 12 * (oct + 1);
  const midi = height >= 0 && height <= 127 ? height : null;
  const freq = oct === void 0 ? null : Math.pow(2, (height - 69) / 12) * 440;
  return {
    empty: false,
    acc,
    alt,
    chroma,
    coord,
    freq,
    height,
    letter,
    midi,
    name,
    oct,
    pc,
    step
  };
}
function pitchName(props) {
  const { step, alt, oct } = props;
  const letter = stepToLetter(step);
  if (!letter) {
    return "";
  }
  const pc = letter + altToAcc(alt);
  return oct || oct === 0 ? pc + oct : pc;
}

// index.ts
function isMidi(arg) {
  return +arg >= 0 && +arg <= 127;
}
function toMidi(note$1) {
  if (isMidi(note$1)) {
    return +note$1;
  }
  const n = note(note$1);
  return n.empty ? null : n.midi;
}

/**
 * Static utility functions used throughout the library.
 */
var Utils = /** @class */ (function () {
    function Utils() {
    }
    /**
     * Gets MidiWriterJS version number.
     * @return {string}
     */
    Utils.version = function () {
        return Constants.VERSION;
    };
    /**
     * Convert a string to an array of bytes
     * @param {string} string
     * @return {array}
     */
    Utils.stringToBytes = function (string) {
        return string.split('').map(function (char) { return char.charCodeAt(0); });
    };
    /**
     * Checks if argument is a valid number.
     * @param {*} n - Value to check
     * @return {boolean}
     */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Utils.isNumeric = function (n) {
        return !isNaN(parseFloat(n)) && isFinite(n);
    };
    /**
     * Returns the correct MIDI number for the specified pitch.
     * Uses Tonal Midi - https://github.com/danigb/tonal/tree/master/packages/midi
     * @param {(string|number)} pitch - 'C#4' or midi note code
     * @param {string} middleC
     * @return {number}
     */
    Utils.getPitch = function (pitch, middleC) {
        if (middleC === void 0) { middleC = 'C4'; }
        return 60 - toMidi(middleC) + toMidi(pitch);
    };
    /**
     * Translates number of ticks to MIDI timestamp format, returning an array of
     * hex strings with the time values. Midi has a very particular time to express time,
     * take a good look at the spec before ever touching this function.
     * Thanks to https://github.com/sergi/jsmidi
     *
     * @param {number} ticks - Number of ticks to be translated
     * @return {array} - Bytes that form the MIDI time value
     */
    Utils.numberToVariableLength = function (ticks) {
        ticks = Math.round(ticks);
        var buffer = ticks & 0x7F;
        // eslint-disable-next-line no-cond-assign
        while (ticks = ticks >> 7) {
            buffer <<= 8;
            buffer |= ((ticks & 0x7F) | 0x80);
        }
        var bList = [];
        // eslint-disable-next-line no-constant-condition
        while (true) {
            bList.push(buffer & 0xff);
            if (buffer & 0x80)
                buffer >>= 8;
            else {
                break;
            }
        }
        return bList;
    };
    /**
     * Counts number of bytes in string
     * @param {string} s
     * @return {number}
     */
    Utils.stringByteCount = function (s) {
        return encodeURI(s).split(/%..|./).length - 1;
    };
    /**
     * Get an int from an array of bytes.
     * @param {array} bytes
     * @return {number}
     */
    Utils.numberFromBytes = function (bytes) {
        var hex = '';
        var stringResult;
        bytes.forEach(function (byte) {
            stringResult = byte.toString(16);
            // ensure string is 2 chars
            if (stringResult.length == 1)
                stringResult = "0" + stringResult;
            hex += stringResult;
        });
        return parseInt(hex, 16);
    };
    /**
     * Takes a number and splits it up into an array of bytes.  Can be padded by passing a number to bytesNeeded
     * @param {number} number
     * @param {number} bytesNeeded
     * @return {array} - Array of bytes
     */
    Utils.numberToBytes = function (number, bytesNeeded) {
        bytesNeeded = bytesNeeded || 1;
        var hexString = number.toString(16);
        if (hexString.length & 1) { // Make sure hex string is even number of chars
            hexString = '0' + hexString;
        }
        // Split hex string into an array of two char elements
        var hexArray = hexString.match(/.{2}/g);
        // Now parse them out as integers
        var intArray = hexArray.map(function (item) { return parseInt(item, 16); });
        // Prepend empty bytes if we don't have enough
        if (intArray.length < bytesNeeded) {
            while (bytesNeeded - intArray.length > 0) {
                intArray.unshift(0);
            }
        }
        return intArray;
    };
    /**
     * Converts value to array if needed.
     * @param {any} value
     * @return {array}
     */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Utils.toArray = function (value) {
        if (Array.isArray(value))
            return value;
        return [value];
    };
    /**
     * Converts velocity to value 0-127
     * @param {number} velocity - Velocity value 1-100
     * @return {number}
     */
    Utils.convertVelocity = function (velocity) {
        // Max passed value limited to 100
        velocity = velocity > 100 ? 100 : velocity;
        return Math.round(velocity / 100 * 127);
    };
    /**
     * Gets the total number of ticks of a specified duration.
     * Note: type=='note' defaults to quarter note, type==='rest' defaults to 0
     * @param {(string|array)} duration
     * @return {number}
     */
    Utils.getTickDuration = function (duration) {
        if (Array.isArray(duration)) {
            // Recursively execute this method for each item in the array and return the sum of tick durations.
            return duration.map(function (value) {
                return Utils.getTickDuration(value);
            }).reduce(function (a, b) {
                return a + b;
            }, 0);
        }
        duration = duration.toString();
        if (duration.toLowerCase().charAt(0) === 't') {
            // If duration starts with 't' then the number that follows is an explicit tick count
            var ticks = parseInt(duration.substring(1));
            if (isNaN(ticks) || ticks < 0) {
                throw new Error(duration + ' is not a valid duration.');
            }
            return ticks;
        }
        // Need to apply duration here.  Quarter note == Constants.HEADER_CHUNK_DIVISION
        var quarterTicks = Utils.numberFromBytes(Constants.HEADER_CHUNK_DIVISION);
        var tickDuration = quarterTicks * Utils.getDurationMultiplier(duration);
        return Utils.getRoundedIfClose(tickDuration);
    };
    /**
     * Due to rounding errors in JavaScript engines,
     * it's safe to round when we're very close to the actual tick number
     *
     * @static
     * @param {number} tick
     * @return {number}
     */
    Utils.getRoundedIfClose = function (tick) {
        var roundedTick = Math.round(tick);
        return Math.abs(roundedTick - tick) < 0.000001 ? roundedTick : tick;
    };
    /**
     * Due to low precision of MIDI,
     * we need to keep track of rounding errors in deltas.
     * This function will calculate the rounding error for a given duration.
     *
     * @static
     * @param {number} tick
     * @return {number}
     */
    Utils.getPrecisionLoss = function (tick) {
        var roundedTick = Math.round(tick);
        return roundedTick - tick;
    };
    /**
     * Gets what to multiple ticks/quarter note by to get the specified duration.
     * Note: type=='note' defaults to quarter note, type==='rest' defaults to 0
     * @param {string} duration
     * @return {number}
     */
    Utils.getDurationMultiplier = function (duration) {
        // Need to apply duration here.
        // Quarter note == Constants.HEADER_CHUNK_DIVISION ticks.
        if (duration === '0')
            return 0;
        var match = duration.match(/^(?<dotted>d+)?(?<base>\d+)(?:t(?<tuplet>\d*))?/);
        if (match) {
            var base = Number(match.groups.base);
            // 1 or any power of two:
            var isValidBase = base === 1 || ((base & (base - 1)) === 0);
            if (isValidBase) {
                // how much faster or slower is this note compared to a quarter?
                var ratio = base / 4;
                var durationInQuarters = 1 / ratio;
                var _a = match.groups, dotted = _a.dotted, tuplet = _a.tuplet;
                if (dotted) {
                    var thisManyDots = dotted.length;
                    var divisor = Math.pow(2, thisManyDots);
                    durationInQuarters = durationInQuarters + (durationInQuarters * ((divisor - 1) / divisor));
                }
                if (typeof tuplet === 'string') {
                    var fitInto = durationInQuarters * 2;
                    // default to triplet:
                    var thisManyNotes = Number(tuplet || '3');
                    durationInQuarters = fitInto / thisManyNotes;
                }
                return durationInQuarters;
            }
        }
        throw new Error(duration + ' is not a valid duration.');
    };
    return Utils;
}());

/**
 * Holds all data for a "controller change" MIDI event
 * @param {object} fields {controllerNumber: integer, controllerValue: integer, delta: integer}
 * @return {ControllerChangeEvent}
 */
var ControllerChangeEvent = /** @class */ (function () {
    function ControllerChangeEvent(fields) {
        this.channel = fields.channel - 1 || 0;
        this.controllerValue = fields.controllerValue;
        this.controllerNumber = fields.controllerNumber;
        this.delta = fields.delta || 0x00;
        this.name = 'ControllerChangeEvent';
        this.status = 0xB0;
        this.data = Utils.numberToVariableLength(fields.delta).concat(this.status | this.channel, this.controllerNumber, this.controllerValue);
    }
    return ControllerChangeEvent;
}());

/**
 * Object representation of a tempo meta event.
 * @param {object} fields {text: string, delta: integer}
 * @return {CopyrightEvent}
 */
var CopyrightEvent = /** @class */ (function () {
    function CopyrightEvent(fields) {
        this.delta = fields.delta || 0x00;
        this.name = 'CopyrightEvent';
        this.text = fields.text;
        this.type = 0x02;
        var textBytes = Utils.stringToBytes(this.text);
        // Start with zero time delta
        this.data = Utils.numberToVariableLength(this.delta).concat(Constants.META_EVENT_ID, this.type, Utils.numberToVariableLength(textBytes.length), // Size
        textBytes);
    }
    return CopyrightEvent;
}());

/**
 * Object representation of a cue point meta event.
 * @param {object} fields {text: string, delta: integer}
 * @return {CuePointEvent}
 */
var CuePointEvent = /** @class */ (function () {
    function CuePointEvent(fields) {
        this.delta = fields.delta || 0x00;
        this.name = 'CuePointEvent';
        this.text = fields.text;
        this.type = 0x07;
        var textBytes = Utils.stringToBytes(this.text);
        // Start with zero time delta
        this.data = Utils.numberToVariableLength(this.delta).concat(Constants.META_EVENT_ID, this.type, Utils.numberToVariableLength(textBytes.length), // Size
        textBytes);
    }
    return CuePointEvent;
}());

/**
 * Object representation of a end track meta event.
 * @param {object} fields {delta: integer}
 * @return {EndTrackEvent}
 */
var EndTrackEvent = /** @class */ (function () {
    function EndTrackEvent(fields) {
        this.delta = (fields === null || fields === void 0 ? void 0 : fields.delta) || 0x00;
        this.name = 'EndTrackEvent';
        this.type = [0x2F, 0x00];
        // Start with zero time delta
        this.data = Utils.numberToVariableLength(this.delta).concat(Constants.META_EVENT_ID, this.type);
    }
    return EndTrackEvent;
}());

/**
 * Object representation of an instrument name meta event.
 * @param {object} fields {text: string, delta: integer}
 * @return {InstrumentNameEvent}
 */
var InstrumentNameEvent = /** @class */ (function () {
    function InstrumentNameEvent(fields) {
        this.delta = fields.delta || 0x00;
        this.name = 'InstrumentNameEvent';
        this.text = fields.text;
        this.type = 0x04;
        var textBytes = Utils.stringToBytes(this.text);
        // Start with zero time delta
        this.data = Utils.numberToVariableLength(this.delta).concat(Constants.META_EVENT_ID, this.type, Utils.numberToVariableLength(textBytes.length), // Size
        textBytes);
    }
    return InstrumentNameEvent;
}());

/**
 * Object representation of a key signature meta event.
 * @return {KeySignatureEvent}
 */
var KeySignatureEvent = /** @class */ (function () {
    function KeySignatureEvent(sf, mi) {
        this.name = 'KeySignatureEvent';
        this.type = 0x59;
        var mode = mi || 0;
        sf = sf || 0;
        //	Function called with string notation
        if (typeof mi === 'undefined') {
            var fifths = [
                ['Cb', 'Gb', 'Db', 'Ab', 'Eb', 'Bb', 'F', 'C', 'G', 'D', 'A', 'E', 'B', 'F#', 'C#'],
                ['ab', 'eb', 'bb', 'f', 'c', 'g', 'd', 'a', 'e', 'b', 'f#', 'c#', 'g#', 'd#', 'a#']
            ];
            var _sflen = sf.length;
            var note = sf || 'C';
            if (sf[0] === sf[0].toLowerCase())
                mode = 1;
            if (_sflen > 1) {
                switch (sf.charAt(_sflen - 1)) {
                    case 'm':
                        mode = 1;
                        note = sf.charAt(0).toLowerCase();
                        note = note.concat(sf.substring(1, _sflen - 1));
                        break;
                    case '-':
                        mode = 1;
                        note = sf.charAt(0).toLowerCase();
                        note = note.concat(sf.substring(1, _sflen - 1));
                        break;
                    case 'M':
                        mode = 0;
                        note = sf.charAt(0).toUpperCase();
                        note = note.concat(sf.substring(1, _sflen - 1));
                        break;
                    case '+':
                        mode = 0;
                        note = sf.charAt(0).toUpperCase();
                        note = note.concat(sf.substring(1, _sflen - 1));
                        break;
                }
            }
            var fifthindex = fifths[mode].indexOf(note);
            sf = fifthindex === -1 ? 0 : fifthindex - 7;
        }
        // Start with zero time delta
        this.data = Utils.numberToVariableLength(0x00).concat(Constants.META_EVENT_ID, this.type, [0x02], // Size
        Utils.numberToBytes(sf, 1), // Number of sharp or flats ( < 0 flat; > 0 sharp)
        Utils.numberToBytes(mode, 1));
    }
    return KeySignatureEvent;
}());

/**
 * Object representation of a lyric meta event.
 * @param {object} fields {text: string, delta: integer}
 * @return {LyricEvent}
 */
var LyricEvent = /** @class */ (function () {
    function LyricEvent(fields) {
        this.delta = fields.delta || 0x00;
        this.name = 'LyricEvent';
        this.text = fields.text;
        this.type = 0x05;
        var textBytes = Utils.stringToBytes(this.text);
        // Start with zero time delta
        this.data = Utils.numberToVariableLength(this.delta).concat(Constants.META_EVENT_ID, this.type, Utils.numberToVariableLength(textBytes.length), // Size
        textBytes);
    }
    return LyricEvent;
}());

/**
 * Object representation of a marker meta event.
 * @param {object} fields {text: string, delta: integer}
 * @return {MarkerEvent}
 */
var MarkerEvent = /** @class */ (function () {
    function MarkerEvent(fields) {
        this.delta = fields.delta || 0x00;
        this.name = 'MarkerEvent';
        this.text = fields.text;
        this.type = 0x06;
        var textBytes = Utils.stringToBytes(this.text);
        // Start with zero time delta
        this.data = Utils.numberToVariableLength(this.delta).concat(Constants.META_EVENT_ID, this.type, Utils.numberToVariableLength(textBytes.length), // Size
        textBytes);
    }
    return MarkerEvent;
}());

/**
 * Holds all data for a "note on" MIDI event
 * @param {object} fields {data: []}
 * @return {NoteOnEvent}
 */
var NoteOnEvent = /** @class */ (function () {
    function NoteOnEvent(fields) {
        this.name = 'NoteOnEvent';
        this.channel = fields.channel || 1;
        this.pitch = fields.pitch;
        this.wait = fields.wait || 0;
        this.velocity = fields.velocity || 50;
        this.tick = fields.tick || null;
        this.delta = null;
        this.data = fields.data;
        this.status = 0x90;
    }
    /**
     * Builds int array for this event.
     * @param {Track} track - parent track
     * @return {NoteOnEvent}
     */
    NoteOnEvent.prototype.buildData = function (track, precisionDelta, options) {
        if (options === void 0) { options = {}; }
        this.data = [];
        // Explicitly defined startTick event
        if (this.tick) {
            this.tick = Utils.getRoundedIfClose(this.tick);
            // If this is the first event in the track then use event's starting tick as delta.
            if (track.tickPointer == 0) {
                this.delta = this.tick;
            }
        }
        else {
            this.delta = Utils.getTickDuration(this.wait);
            this.tick = Utils.getRoundedIfClose(track.tickPointer + this.delta);
        }
        this.deltaWithPrecisionCorrection = Utils.getRoundedIfClose(this.delta - precisionDelta);
        this.data = Utils.numberToVariableLength(this.deltaWithPrecisionCorrection)
            .concat(this.status | this.channel - 1, Utils.getPitch(this.pitch, options.middleC), Utils.convertVelocity(this.velocity));
        return this;
    };
    return NoteOnEvent;
}());

/**
 * Holds all data for a "note off" MIDI event
 * @param {object} fields {data: []}
 * @return {NoteOffEvent}
 */
var NoteOffEvent = /** @class */ (function () {
    function NoteOffEvent(fields) {
        this.name = 'NoteOffEvent';
        this.channel = fields.channel || 1;
        this.pitch = fields.pitch;
        this.velocity = fields.velocity || 50;
        this.tick = fields.tick || null;
        this.data = fields.data;
        this.delta = fields.delta || Utils.getTickDuration(fields.duration);
        this.status = 0x80;
    }
    /**
     * Builds int array for this event.
     * @param {Track} track - parent track
     * @return {NoteOffEvent}
     */
    NoteOffEvent.prototype.buildData = function (track, precisionDelta, options) {
        if (options === void 0) { options = {}; }
        if (this.tick === null) {
            this.tick = Utils.getRoundedIfClose(this.delta + track.tickPointer);
        }
        this.deltaWithPrecisionCorrection = Utils.getRoundedIfClose(this.delta - precisionDelta);
        this.data = Utils.numberToVariableLength(this.deltaWithPrecisionCorrection)
            .concat(this.status | this.channel - 1, Utils.getPitch(this.pitch, options.middleC), Utils.convertVelocity(this.velocity));
        return this;
    };
    return NoteOffEvent;
}());

/**
 * Wrapper for noteOnEvent/noteOffEvent objects that builds both events.
 * @param {object} fields - {pitch: '[C4]', duration: '4', wait: '4', velocity: 1-100}
 * @return {NoteEvent}
 */
var NoteEvent = /** @class */ (function () {
    function NoteEvent(fields) {
        this.data = [];
        this.name = 'NoteEvent';
        this.pitch = Utils.toArray(fields.pitch);
        this.channel = fields.channel || 1;
        this.duration = fields.duration || '4';
        this.grace = fields.grace;
        this.repeat = fields.repeat || 1;
        this.sequential = fields.sequential || false;
        this.tick = fields.startTick || fields.tick || null;
        this.velocity = fields.velocity || 50;
        this.wait = fields.wait || 0;
        this.tickDuration = Utils.getTickDuration(this.duration);
        this.restDuration = Utils.getTickDuration(this.wait);
        this.events = []; // Hold actual NoteOn/NoteOff events
    }
    /**
     * Builds int array for this event.
     * @return {NoteEvent}
     */
    NoteEvent.prototype.buildData = function () {
        var _this = this;
        // Reset data array
        this.data = [];
        // Apply grace note(s) and subtract ticks (currently 1 tick per grace note) from tickDuration so net value is the same
        if (this.grace) {
            var graceDuration_1 = 1;
            this.grace = Utils.toArray(this.grace);
            this.grace.forEach(function () {
                var noteEvent = new NoteEvent({ pitch: _this.grace, duration: 'T' + graceDuration_1 });
                _this.data = _this.data.concat(noteEvent.data);
            });
        }
        // fields.pitch could be an array of pitches.
        // If so create note events for each and apply the same duration.
        // By default this is a chord if it's an array of notes that requires one NoteOnEvent.
        // If this.sequential === true then it's a sequential string of notes that requires separate NoteOnEvents.
        if (!this.sequential) {
            // Handle repeat
            for (var j = 0; j < this.repeat; j++) {
                // Note on
                this.pitch.forEach(function (p, i) {
                    var noteOnNew;
                    if (i == 0) {
                        noteOnNew = new NoteOnEvent({
                            channel: _this.channel,
                            wait: _this.wait,
                            delta: Utils.getTickDuration(_this.wait),
                            velocity: _this.velocity,
                            pitch: p,
                            tick: _this.tick,
                        });
                    }
                    else {
                        // Running status (can ommit the note on status)
                        //noteOn = new NoteOnEvent({data: [0, Utils.getPitch(p), Utils.convertVelocity(this.velocity)]});
                        noteOnNew = new NoteOnEvent({
                            channel: _this.channel,
                            wait: 0,
                            delta: 0,
                            velocity: _this.velocity,
                            pitch: p,
                            tick: _this.tick,
                        });
                    }
                    _this.events.push(noteOnNew);
                });
                // Note off
                this.pitch.forEach(function (p, i) {
                    var noteOffNew;
                    if (i == 0) {
                        //noteOff = new NoteOffEvent({data: Utils.numberToVariableLength(tickDuration).concat(this.getNoteOffStatus(), Utils.getPitch(p), Utils.convertVelocity(this.velocity))});
                        noteOffNew = new NoteOffEvent({
                            channel: _this.channel,
                            duration: _this.duration,
                            velocity: _this.velocity,
                            pitch: p,
                            tick: _this.tick !== null ? Utils.getTickDuration(_this.duration) + _this.tick : null,
                        });
                    }
                    else {
                        // Running status (can omit the note off status)
                        //noteOff = new NoteOffEvent({data: [0, Utils.getPitch(p), Utils.convertVelocity(this.velocity)]});
                        noteOffNew = new NoteOffEvent({
                            channel: _this.channel,
                            duration: 0,
                            velocity: _this.velocity,
                            pitch: p,
                            tick: _this.tick !== null ? Utils.getTickDuration(_this.duration) + _this.tick : null,
                        });
                    }
                    _this.events.push(noteOffNew);
                });
            }
        }
        else {
            // Handle repeat
            for (var j = 0; j < this.repeat; j++) {
                this.pitch.forEach(function (p, i) {
                    var noteOnNew = new NoteOnEvent({
                        channel: _this.channel,
                        wait: (i > 0 ? 0 : _this.wait),
                        delta: (i > 0 ? 0 : Utils.getTickDuration(_this.wait)),
                        velocity: _this.velocity,
                        pitch: p,
                        tick: _this.tick,
                    });
                    var noteOffNew = new NoteOffEvent({
                        channel: _this.channel,
                        duration: _this.duration,
                        velocity: _this.velocity,
                        pitch: p,
                    });
                    _this.events.push(noteOnNew, noteOffNew);
                });
            }
        }
        return this;
    };
    return NoteEvent;
}());

/**
 * Holds all data for a "Pitch Bend" MIDI event
 * [ -1.0, 0, 1.0 ] ->  [ 0, 8192, 16383]
 * @param {object} fields { bend : float, channel : int, delta: int }
 * @return {PitchBendEvent}
 */
var PitchBendEvent = /** @class */ (function () {
    function PitchBendEvent(fields) {
        this.channel = fields.channel || 0;
        this.delta = fields.delta || 0x00;
        this.name = 'PitchBendEvent';
        this.status = 0xE0;
        var bend14 = this.scale14bits(fields.bend);
        var lsbValue = bend14 & 0x7f;
        var msbValue = (bend14 >> 7) & 0x7f;
        this.data = Utils.numberToVariableLength(this.delta).concat(this.status | this.channel, lsbValue, msbValue);
    }
    PitchBendEvent.prototype.scale14bits = function (zeroOne) {
        if (zeroOne <= 0) {
            return Math.floor(16384 * (zeroOne + 1) / 2);
        }
        return Math.floor(16383 * (zeroOne + 1) / 2);
    };
    return PitchBendEvent;
}());

/**
 * Holds all data for a "program change" MIDI event
 * @param {object} fields {instrument: integer, delta: integer}
 * @return {ProgramChangeEvent}
 */
var ProgramChangeEvent = /** @class */ (function () {
    function ProgramChangeEvent(fields) {
        this.channel = fields.channel || 0;
        this.delta = fields.delta || 0x00;
        this.instrument = fields.instrument;
        this.status = 0xC0;
        this.name = 'ProgramChangeEvent';
        // delta time defaults to 0.
        this.data = Utils.numberToVariableLength(this.delta).concat(this.status | this.channel, this.instrument);
    }
    return ProgramChangeEvent;
}());

/**
 * Object representation of a tempo meta event.
 * @param {object} fields {bpm: integer, delta: integer}
 * @return {TempoEvent}
 */
var TempoEvent = /** @class */ (function () {
    function TempoEvent(fields) {
        this.bpm = fields.bpm;
        this.delta = fields.delta || 0x00;
        this.tick = fields.tick;
        this.name = 'TempoEvent';
        this.type = 0x51;
        var tempo = Math.round(60000000 / this.bpm);
        // Start with zero time delta
        this.data = Utils.numberToVariableLength(this.delta).concat(Constants.META_EVENT_ID, this.type, [0x03], // Size
        Utils.numberToBytes(tempo, 3));
    }
    return TempoEvent;
}());

/**
 * Object representation of a tempo meta event.
 * @param {object} fields {text: string, delta: integer}
 * @return {TextEvent}
 */
var TextEvent = /** @class */ (function () {
    function TextEvent(fields) {
        this.delta = fields.delta || 0x00;
        this.text = fields.text;
        this.name = 'TextEvent';
        this.type = 0x01;
        var textBytes = Utils.stringToBytes(this.text);
        // Start with zero time delta
        this.data = Utils.numberToVariableLength(fields.delta).concat(Constants.META_EVENT_ID, this.type, Utils.numberToVariableLength(textBytes.length), // Size
        textBytes);
    }
    return TextEvent;
}());

/**
 * Object representation of a time signature meta event.
 * @return {TimeSignatureEvent}
 */
var TimeSignatureEvent = /** @class */ (function () {
    function TimeSignatureEvent(numerator, denominator, midiclockspertick, notespermidiclock) {
        this.name = 'TimeSignatureEvent';
        this.type = 0x58;
        // Start with zero time delta
        this.data = Utils.numberToVariableLength(0x00).concat(Constants.META_EVENT_ID, this.type, [0x04], // Size
        Utils.numberToBytes(numerator, 1), // Numerator, 1 bytes
        Utils.numberToBytes(Math.log2(denominator), 1), // Denominator is expressed as pow of 2, 1 bytes
        Utils.numberToBytes(midiclockspertick || 24, 1), // MIDI Clocks per tick, 1 bytes
        Utils.numberToBytes(notespermidiclock || 8, 1));
    }
    return TimeSignatureEvent;
}());

/**
 * Object representation of a tempo meta event.
 * @param {object} fields {text: string, delta: integer}
 * @return {TrackNameEvent}
 */
var TrackNameEvent = /** @class */ (function () {
    function TrackNameEvent(fields) {
        this.delta = fields.delta || 0x00;
        this.name = 'TrackNameEvent';
        this.text = fields.text;
        this.type = 0x03;
        var textBytes = Utils.stringToBytes(this.text);
        // Start with zero time delta
        this.data = Utils.numberToVariableLength(this.delta).concat(Constants.META_EVENT_ID, this.type, Utils.numberToVariableLength(textBytes.length), // Size
        textBytes);
    }
    return TrackNameEvent;
}());

/**
 * Holds all data for a track.
 * @param {object} fields {type: number, data: array, size: array, events: array}
 * @return {Track}
 */
var Track = /** @class */ (function () {
    function Track() {
        this.type = Constants.TRACK_CHUNK_TYPE;
        this.data = [];
        this.size = [];
        this.events = [];
        this.explicitTickEvents = [];
        // If there are any events with an explicit tick defined then we will create a "sub" track for those
        // and merge them in and the end.
        this.tickPointer = 0; // Each time an event is added this will increase
    }
    /**
     * Adds any event type to the track.
     * Events without a specific startTick property are assumed to be added in order of how they should output.
     * Events with a specific startTick property are set aside for now will be merged in during build process.
     *
     * TODO: Don't put startTick events in their own array.  Just lump everything together and sort it out during buildData();
     * @param {(NoteEvent|ProgramChangeEvent)} events - Event object or array of Event objects.
     * @param {Function} mapFunction - Callback which can be used to apply specific properties to all events.
     * @return {Track}
     */
    Track.prototype.addEvent = function (events, mapFunction) {
        var _this = this;
        Utils.toArray(events).forEach(function (event, i) {
            if (event instanceof NoteEvent) {
                // Handle map function if provided
                if (typeof mapFunction === 'function') {
                    var properties = mapFunction(i, event);
                    if (typeof properties === 'object') {
                        Object.assign(event, properties);
                    }
                }
                // If this note event has an explicit startTick then we need to set aside for now
                if (event.tick !== null) {
                    _this.explicitTickEvents.push(event);
                }
                else {
                    // Push each on/off event to track's event stack
                    event.buildData().events.forEach(function (e) { return _this.events.push(e); });
                }
            }
            else {
                _this.events.push(event);
            }
        });
        return this;
    };
    /**
     * Builds int array of all events.
     * @param {object} options
     * @return {Track}
     */
    Track.prototype.buildData = function (options) {
        var _this = this;
        if (options === void 0) { options = {}; }
        // Reset
        this.data = [];
        this.size = [];
        this.tickPointer = 0;
        var precisionLoss = 0;
        this.events.forEach(function (event) {
            // Build event & add to total tick duration
            if (event instanceof NoteOnEvent || event instanceof NoteOffEvent) {
                var built = event.buildData(_this, precisionLoss, options);
                precisionLoss = Utils.getPrecisionLoss(event.deltaWithPrecisionCorrection || 0);
                _this.data = _this.data.concat(built.data);
                _this.tickPointer = Utils.getRoundedIfClose(event.tick);
            }
            else if (event instanceof TempoEvent) {
                _this.tickPointer = Utils.getRoundedIfClose(event.tick);
                _this.data = _this.data.concat(event.data);
            }
            else {
                _this.data = _this.data.concat(event.data);
            }
        });
        this.mergeExplicitTickEvents();
        // If the last event isn't EndTrackEvent, then tack it onto the data.
        if (!this.events.length || !(this.events[this.events.length - 1] instanceof EndTrackEvent)) {
            this.data = this.data.concat((new EndTrackEvent).data);
        }
        this.size = Utils.numberToBytes(this.data.length, 4); // 4 bytes long
        return this;
    };
    Track.prototype.mergeExplicitTickEvents = function () {
        var _this = this;
        if (!this.explicitTickEvents.length)
            return;
        // First sort asc list of events by startTick
        this.explicitTickEvents.sort(function (a, b) { return a.tick - b.tick; });
        // Now this.explicitTickEvents is in correct order, and so is this.events naturally.
        // For each explicit tick event, splice it into the main list of events and
        // adjust the delta on the following events so they still play normally.
        this.explicitTickEvents.forEach(function (noteEvent) {
            // Convert NoteEvent to it's respective NoteOn/NoteOff events
            // Note that as we splice in events the delta for the NoteOff ones will
            // Need to change based on what comes before them after the splice.
            noteEvent.buildData().events.forEach(function (e) { return e.buildData(_this); });
            // Merge each event individually into this track's event list.
            noteEvent.events.forEach(function (event) { return _this.mergeSingleEvent(event); });
        });
        // Hacky way to rebuild track with newly spliced events.  Need better solution.
        this.explicitTickEvents = [];
        this.buildData();
    };
    /**
     * Merges another track's events with this track.
     * @param {Track} track
     * @return {Track}
     */
    Track.prototype.mergeTrack = function (track) {
        var _this = this;
        // First build this track to populate each event's tick property
        this.buildData();
        // Then build track to be merged so that tick property is populated on all events & merge each event.
        track.buildData().events.forEach(function (event) { return _this.mergeSingleEvent(event); });
        return this;
    };
    /**
     * Merges a single event into this track's list of events based on event.tick property.
     * @param {AbstractEvent} - event
     * @return {Track}
     */
    Track.prototype.mergeSingleEvent = function (event) {
        // There are no events yet, so just add it in.
        if (!this.events.length) {
            this.addEvent(event);
            return;
        }
        // Find index of existing event we need to follow with
        var lastEventIndex;
        for (var i = 0; i < this.events.length; i++) {
            if (this.events[i].tick > event.tick)
                break;
            lastEventIndex = i;
        }
        var splicedEventIndex = lastEventIndex + 1;
        // Need to adjust the delta of this event to ensure it falls on the correct tick.
        event.delta = event.tick - this.events[lastEventIndex].tick;
        // Splice this event at lastEventIndex + 1
        this.events.splice(splicedEventIndex, 0, event);
        // Now adjust delta of all following events
        for (var i = splicedEventIndex + 1; i < this.events.length; i++) {
            // Since each existing event should have a tick value at this point we just need to
            // adjust delta to that the event still falls on the correct tick.
            this.events[i].delta = this.events[i].tick - this.events[i - 1].tick;
        }
    };
    /**
     * Removes all events matching specified type.
     * @param {string} eventName - Event type
     * @return {Track}
     */
    Track.prototype.removeEventsByName = function (eventName) {
        var _this = this;
        this.events.forEach(function (event, index) {
            if (event.name === eventName) {
                _this.events.splice(index, 1);
            }
        });
        return this;
    };
    /**
     * Sets tempo of the MIDI file.
     * @param {number} bpm - Tempo in beats per minute.
     * @param {number} tick - Start tick.
     * @return {Track}
     */
    Track.prototype.setTempo = function (bpm, tick) {
        if (tick === void 0) { tick = 0; }
        return this.addEvent(new TempoEvent({ bpm: bpm, tick: tick }));
    };
    /**
     * Sets time signature.
     * @param {number} numerator - Top number of the time signature.
     * @param {number} denominator - Bottom number of the time signature.
     * @param {number} midiclockspertick - Defaults to 24.
     * @param {number} notespermidiclock - Defaults to 8.
     * @return {Track}
     */
    Track.prototype.setTimeSignature = function (numerator, denominator, midiclockspertick, notespermidiclock) {
        return this.addEvent(new TimeSignatureEvent(numerator, denominator, midiclockspertick, notespermidiclock));
    };
    /**
     * Sets key signature.
     * @param {*} sf -
     * @param {*} mi -
     * @return {Track}
     */
    Track.prototype.setKeySignature = function (sf, mi) {
        return this.addEvent(new KeySignatureEvent(sf, mi));
    };
    /**
     * Adds text to MIDI file.
     * @param {string} text - Text to add.
     * @return {Track}
     */
    Track.prototype.addText = function (text) {
        return this.addEvent(new TextEvent({ text: text }));
    };
    /**
     * Adds copyright to MIDI file.
     * @param {string} text - Text of copyright line.
     * @return {Track}
     */
    Track.prototype.addCopyright = function (text) {
        return this.addEvent(new CopyrightEvent({ text: text }));
    };
    /**
     * Adds Sequence/Track Name.
     * @param {string} text - Text of track name.
     * @return {Track}
     */
    Track.prototype.addTrackName = function (text) {
        return this.addEvent(new TrackNameEvent({ text: text }));
    };
    /**
     * Sets instrument name of track.
     * @param {string} text - Name of instrument.
     * @return {Track}
     */
    Track.prototype.addInstrumentName = function (text) {
        return this.addEvent(new InstrumentNameEvent({ text: text }));
    };
    /**
     * Adds marker to MIDI file.
     * @param {string} text - Marker text.
     * @return {Track}
     */
    Track.prototype.addMarker = function (text) {
        return this.addEvent(new MarkerEvent({ text: text }));
    };
    /**
     * Adds cue point to MIDI file.
     * @param {string} text - Text of cue point.
     * @return {Track}
     */
    Track.prototype.addCuePoint = function (text) {
        return this.addEvent(new CuePointEvent({ text: text }));
    };
    /**
     * Adds lyric to MIDI file.
     * @param {string} text - Lyric text to add.
     * @return {Track}
     */
    Track.prototype.addLyric = function (text) {
        return this.addEvent(new LyricEvent({ text: text }));
    };
    /**
     * Channel mode messages
     * @return {Track}
     */
    Track.prototype.polyModeOn = function () {
        var event = new NoteOnEvent({ data: [0x00, 0xB0, 0x7E, 0x00] });
        return this.addEvent(event);
    };
    /**
     * Sets a pitch bend.
     * @param {float} bend - Bend value ranging [-1,1], zero meaning no bend.
     * @return {Track}
     */
    Track.prototype.setPitchBend = function (bend) {
        return this.addEvent(new PitchBendEvent({ bend: bend }));
    };
    /**
     * Adds a controller change event
     * @param {number} number - Control number.
     * @param {number} value - Control value.
     * @param {number} channel - Channel to send controller change event on (1-based).
     * @param {number} delta - Track tick offset for cc event.
     * @return {Track}
     */
    Track.prototype.controllerChange = function (number, value, channel, delta) {
        return this.addEvent(new ControllerChangeEvent({ controllerNumber: number, controllerValue: value, channel: channel, delta: delta }));
    };
    return Track;
}());

var VexFlow = /** @class */ (function () {
    function VexFlow() {
    }
    /**
     * Support for converting VexFlow voice into MidiWriterJS track
     * @return MidiWriter.Track object
     */
    VexFlow.prototype.trackFromVoice = function (voice, options) {
        var _this = this;
        if (options === void 0) { options = { addRenderedAccidentals: false }; }
        var track = new Track;
        var wait = [];
        voice.tickables.forEach(function (tickable) {
            if (tickable.noteType === 'n') {
                track.addEvent(new NoteEvent({
                    pitch: tickable.keys.map(function (pitch, index) { return _this.convertPitch(pitch, index, tickable, options.addRenderedAccidentals); }),
                    duration: _this.convertDuration(tickable),
                    wait: wait
                }));
                // reset wait
                wait = [];
            }
            else if (tickable.noteType === 'r') {
                // move on to the next tickable and add this to the stack
                // of the `wait` property for the next note event
                wait.push(_this.convertDuration(tickable));
            }
        });
        // There may be outstanding rests at the end of the track,
        // pad with a ghost note (zero duration and velocity), just to capture the wait.
        if (wait.length > 0) {
            track.addEvent(new NoteEvent({ pitch: '[c4]', duration: '0', wait: wait, velocity: '0' }));
        }
        return track;
    };
    /**
     * Converts VexFlow pitch syntax to MidiWriterJS syntax
     * @param pitch string
     * @param index pitch index
     * @param note struct from Vexflow
     * @param addRenderedAccidentals adds Vexflow rendered accidentals
     */
    VexFlow.prototype.convertPitch = function (pitch, index, note, addRenderedAccidentals) {
        var _a;
        if (addRenderedAccidentals === void 0) { addRenderedAccidentals = false; }
        // Splits note name from octave
        var pitchParts = pitch.split('/');
        // Retrieves accidentals from pitch
        // Removes natural accidentals since they are not accepted in Tonal Midi
        var accidentals = pitchParts[0].substring(1).replace('n', '');
        if (addRenderedAccidentals) {
            (_a = note.getAccidentals()) === null || _a === void 0 ? void 0 : _a.forEach(function (accidental) {
                if (accidental.index === index) {
                    if (accidental.type === 'n') {
                        accidentals = '';
                    }
                    else {
                        accidentals += accidental.type;
                    }
                }
            });
        }
        return pitchParts[0][0] + accidentals + pitchParts[1];
    };
    /**
     * Converts VexFlow duration syntax to MidiWriterJS syntax
     * @param note struct from VexFlow
     */
    VexFlow.prototype.convertDuration = function (note) {
        return 'd'.repeat(note.dots) + this.convertBaseDuration(note.duration) + (note.tuplet ? 't' + note.tuplet.num_notes : '');
    };
    /**
     * Converts VexFlow base duration syntax to MidiWriterJS syntax
     * @param duration Vexflow duration
     * @returns MidiWriterJS duration
     */
    VexFlow.prototype.convertBaseDuration = function (duration) {
        switch (duration) {
            case 'w':
                return '1';
            case 'h':
                return '2';
            case 'q':
                return '4';
            default:
                return duration;
        }
    };
    return VexFlow;
}());

/**
 * Object representation of a header chunk section of a MIDI file.
 * @param {number} numberOfTracks - Number of tracks
 * @return {Header}
 */
var Header = /** @class */ (function () {
    function Header(numberOfTracks) {
        this.type = Constants.HEADER_CHUNK_TYPE;
        var trackType = numberOfTracks > 1 ? Constants.HEADER_CHUNK_FORMAT1 : Constants.HEADER_CHUNK_FORMAT0;
        this.data = trackType.concat(Utils.numberToBytes(numberOfTracks, 2), // two bytes long,
        Constants.HEADER_CHUNK_DIVISION);
        this.size = [0, 0, 0, this.data.length];
    }
    return Header;
}());

/**
 * Object that puts together tracks and provides methods for file output.
 * @param {array|Track} tracks - A single {Track} object or an array of {Track} objects.
 * @param {object} options - {middleC: 'C4'}
 * @return {Writer}
 */
var Writer = /** @class */ (function () {
    function Writer(tracks, options) {
        if (options === void 0) { options = {}; }
        // Ensure tracks is an array
        this.tracks = Utils.toArray(tracks);
        this.options = options;
    }
    /**
     * Builds array of data from chunkschunks.
     * @return {array}
     */
    Writer.prototype.buildData = function () {
        var _this = this;
        var data = [];
        data.push(new Header(this.tracks.length));
        // For each track add final end of track event and build data
        this.tracks.forEach(function (track) {
            data.push(track.buildData(_this.options));
        });
        return data;
    };
    /**
     * Builds the file into a Uint8Array
     * @return {Uint8Array}
     */
    Writer.prototype.buildFile = function () {
        var build = [];
        // Data consists of chunks which consists of data
        this.buildData().forEach(function (d) { return build = build.concat(d.type, d.size, d.data); });
        return new Uint8Array(build);
    };
    /**
     * Convert file buffer to a base64 string.  Different methods depending on if browser or node.
     * @return {string}
     */
    Writer.prototype.base64 = function () {
        if (typeof btoa === 'function') {
            var binary = '';
            var bytes = this.buildFile();
            var len = bytes.byteLength;
            for (var i = 0; i < len; i++) {
                binary += String.fromCharCode(bytes[i]);
            }
            return btoa(binary);
        }
        return Buffer.from(this.buildFile()).toString('base64');
    };
    /**
     * Get the data URI.
     * @return {string}
     */
    Writer.prototype.dataUri = function () {
        return 'data:audio/midi;base64,' + this.base64();
    };
    /**
     * Set option on instantiated Writer.
     * @param {string} key
     * @param {any} value
     * @return {Writer}
     */
    Writer.prototype.setOption = function (key, value) {
        this.options[key] = value;
        return this;
    };
    /**
     * Output to stdout
     * @return {string}
     */
    Writer.prototype.stdout = function () {
        return process.stdout.write(Buffer.from(this.buildFile()));
    };
    return Writer;
}());

var main = {
    Constants: Constants,
    ControllerChangeEvent: ControllerChangeEvent,
    CopyrightEvent: CopyrightEvent,
    CuePointEvent: CuePointEvent,
    EndTrackEvent: EndTrackEvent,
    InstrumentNameEvent: InstrumentNameEvent,
    KeySignatureEvent: KeySignatureEvent,
    LyricEvent: LyricEvent,
    MarkerEvent: MarkerEvent,
    NoteOnEvent: NoteOnEvent,
    NoteOffEvent: NoteOffEvent,
    NoteEvent: NoteEvent,
    PitchBendEvent: PitchBendEvent,
    ProgramChangeEvent: ProgramChangeEvent,
    TempoEvent: TempoEvent,
    TextEvent: TextEvent,
    TimeSignatureEvent: TimeSignatureEvent,
    Track: Track,
    TrackNameEvent: TrackNameEvent,
    Utils: Utils,
    VexFlow: VexFlow,
    Writer: Writer
};

module.exports = main;

}).call(this)}).call(this,require('_process'),require("buffer").Buffer)
},{"_process":4,"buffer":2}],6:[function(require,module,exports){
const MidiWriter = require('midi-writer-js');

const notes = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
    const baseNotes = [4, 9, 14, 19, 23, 28]; // E A D G B E のベース音
    const chordData = {
      "C": [0, 1, 0, 2, 3, -1],
      "Cm": [3, 4, 5, 5, 3, -1],
      "Cmaj7": [0, 0, 0, 2, 3, -1],
      "C7": [0, 1, 3, 2, 3, -1],
      "Cm7": [-1, 4, 3, 1, 3, -1],
      "Cdim": [8, 7, 8, 7, -1, -1],
      "Cadd9": [0, 3, 0, 2, 3, -1],
      "Csus4": [1, 1, 0, 3, 3, -1],
      "Caug": [-1, 1, 1, 2, 3, -1],
      "Cm7b5": [-1, 4, 3, 4, 3, -1],

      "C#": [1, 2, 1, 3, 4, -1],
      "C#m": [4, 5, 6, 6, 4, -1],
      "C#maj7": [1, 1, 1, 3, 4, -1],
      "C#7": [-1, 2, 4, 3, 4, -1],
      "C#m7": [-1, 5, 4, 2, 4, -1],
      "C#dim": [9, 8, 9, 8, -1, -1],
      "C#add9": [1, 4, 1, 3, 4, -1],
      "C#sus4": [-1, 2, 1, 4, 4, -1],
      "C#aug": [-1, 2, 2, 3, 4, -1],
      "C#m7b5": [-1, 5, 4, 5, 4, -1],

      "D": [2, 3, 2, 0, -1, -1],
      "Dm": [1, 3, 2, 0, -1, -1],
      "Dmaj7": [2, 2, 2, 0, -1, -1],
      "D7": [2, 1, 2, 0, -1, -1],
      "Dm7": [1, 1, 2, 0, -1, -1],
      "Ddim": [1, 0, 1, 0, -1, -1],
      "Dadd9": [2, 5, 2, 4, 5, -1],
      "Dsus4": [3, 3, 2, 0, -1, -1],
      "Daug": [-1, 3, 3, 4, 5, -1],
      "Dm7b5": [1, 1, 1, 0, -1, -1],
      
      "D#": [3, 4, 3, 1, -1, -1],
      "D#m": [2, 4, 3, 1, -1, -1],
      "D#maj7": [3, 3, 3, 1, -1, -1],
      "D#7": [3, 2, 3, 1, -1, -1],
      "D#m7": [2, 2, 3, 1, -1, -1],
      "D#dim": [2, 1, 3, 1, -1, -1],
      "D#add9": [3, 6, 3, 5, 6, -1],
      "D#sus4": [4, 4, 3, 1, -1, -1],
      "D#aug": [0, 1, 1, 2, -1, -1],
      "D#m7b5": [2, 2, 2, 1, -1, -1],
      
      "E": [0, 0, 1, 2, 2, 0],
      "Em": [0, 0, 0, 2, 2, 0],
      "Emaj7": [0, 0, 1, 1, 2, 0],
      "E7": [0, 0, 1, 0, 2, 0],
      "Em7": [0, 0, 0, 0, 2, 0],
      "Edim": [3, 2, 3, 2, -1, -1],
      "Eadd9": [4, 0, 3, 4, 4, 0],
      "Esus4": [0, 0, 2, 2, 2, 0],
      "Eaug": [0, 1, 1, 2, 2, 0],
      "Em7b5": [3, 3, 3, 2, -1, 0],
      
      "F": [1, 1, 2, 3, 3, 1],
      "Fm": [1, 1, 1, 3, 3, 1],
      "Fmaj7": [0, 1, 2, 3, -1, -1],
      "F7": [1, 1, 2, 1, 3, 1],
      "Fm7": [1, 1, 1, 1, 3, 1],
      "Fdim": [3, 2, 3, 2, -1, -1],
      "Fadd9": [3, 1, 2, 3, -1, -1],
      "Fsus4": [1, 1, 3, 3, 3, 1],
      "Faug": [1, 2, 2, 3, 3, 1],
      "Fm7b5": [-1, 0, 1, 1, -1, 1],
      
      "F#": [2, 2, 3, 4, 4, 2],
      "F#m": [2, 2, 2, 4, 4, 2],
      "F#maj7": [1, 2, 3, 3, 4, 2],
      "F#7": [2, 2, 3, 2, 4, 2],
      "F#m7": [2, 2, 2, 2, 4, 2],
      "F#dim": [1, 2, 0, 2, -1, -1],
      "F#add9": [2, 4, 3, 4, 4, 2],
      "F#sus4": [2, 2, 4, 4, 4, 2],
      "F#aug": [1, 2, 2, 3, -1, -1],
      "F#m7b5": [-1, 1, 2, 2, -1, 2],
      
      "G": [3, 3, 0, 0, 2, 3],
      "Gm": [3, 3, 3, 5, 5, 3],
      "Gmaj7": [2, 3, 0, 0, 2, 3],
      "G7": [1, 0, 0, 0, 2, 3],
      "Gm7": [3, 3, 3, 3, 5, 3],
      "Gdim": [-1, 2, 3, 2, -1, 3],
      "Gadd9": [3, 0, 2, 0, 0, 3],
      "Gsus4": [3, 1, 0, 0, 3, 3],
      "Gaug": [3, 4, 4, 5, -1, -1],
      "Gm7b5": [-1, 2, 3, 3, -1, 3],
      
      "G#": [4, 4, 5, 6, 6, 4],
      "G#m": [4, 4, 4, 6, 6, 4],
      "G#maj7": [3, 4, 5, 6, -1, -1],
      "G#7": [4, 4, 5, 4, 6, 4],
      "G#m7": [4, 4, 4, 4, 6, 4],
      "G#dim": [-1, 3, 4, 3, -1, 4],
      "G#add9": [-1, 4, 3, -1, 3, 4],
      "G#sus4": [4, 4, 6, 6, 6, 4],
      "G#aug": [4, 5, 5, 6, -1, -1],
      "G#m7b5": [-1, 3, 4, 4, -1, 4],
      
      "A": [0, 2, 2, 2, 0, -1],
      "Am": [0, 1, 2, 2, 0, -1],
      "Amaj7": [0, 2, 1, 2, 0, -1],
      "A7": [0, 2, 0, 2, 0, -1],
      "Am7": [0, 1, 0, 2, 0, -1],
      "Adim": [4, 5, 4, 5, -1, -1],
      "Aadd9": [0, 0, 2, 2, 0, -1],
      "Asus4": [0, 3, 2, 2, 0, -1],
      "Aaug": [-1, 2, 2, 3, 0, -1],
      "Am7b5": [-1, 1, 0, 1, 0, -1],
      
      "A#": [1, 3, 3, 3, 1, -1],
      "A#m": [1, 2, 3, 3, 1, -1],
      "A#maj7": [1, 3, 2, 3, 1, -1],
      "A#7": [1, 3, 1, 3, 1, -1],
      "A#m7": [1, 2, 1, 3, 1, -1],
      "A#dim": [5, 6, 5, 6, -1, -1],
      "A#add9": [1, 1, 3, 3, 1, -1],
      "A#sus4": [1, 4, 3, 3, 1, -1],
      "A#aug": [1, 3, 3, 4, 1, -1],
      "A#m7b5": [-1, 2, 1, 2, 1, -1],
      
      "B": [2, 4, 4, 4, 2, -1],
      "Bm": [2, 3, 4, 4, 2, -1],
      "Bmaj7": [2, 4, 3, 4, 2, -1],
      "B7": [2, 4, 2, 4, 2, -1],
      "Bm7": [2, 3, 2, 4, 2, -1],
      "Bdim": [7, 6, 7, 6, -1, -1],
      "Badd9": [2, 2, 4, 4, 2, -1],
      "Bsus4": [2, 5, 4, 4, 2, -1],
      "Baug": [-1, 4, 4, 5, 2, -1],
      "Bm7b5": [-1, 3, 2, 3, 2, -1]
      
    };

    const tableCells = document.querySelectorAll("td[data-string]");
    const muteCheckboxes = document.querySelectorAll("input[type='checkbox']");
    const notesDiv = document.getElementById("notes");
    const downloadButton = document.getElementById("downloadMIDI");
    const rootNoteSelect = document.getElementById("rootNoteSelect");
    const chordTypeSelect = document.getElementById("chordTypeSelect");
    const applyChordButton = document.getElementById("applyChordButton");
    const fretPositionsDiv = document.getElementById("fretPositions");
    const playMidiButton = document.getElementById("playMIDI");
    
    // 各弦の音を表示する
    function updateNotes() {
      let notesString = "<br>【各弦の音】<br>";
      let fretPositions = [];

      for (let i = 6; i >= 1; i--) {
        const fret = getSelectedFret(i);
        fretPositions.push(fret);

        if (fret === -1) {
          notesString += (7 - i) + "弦:- ";
        } else {
          const noteIndex = (baseNotes[i - 1] + fret) % 12;
          const octave = Math.floor((baseNotes[i - 1] + fret) / 12) + 2;
          notesString += (7 - i) + "弦:" + notes[noteIndex] + octave + " ";
        }
        notesString += "<br>"; // 改行を追加
      }
      notesDiv.innerHTML = notesString;
      fretPositionsDiv.textContent = JSON.stringify(fretPositions);
    }

    // 選択されたフレットを取得する
    function getSelectedFret(string) {
      const muteCheckbox = document.getElementById(`mute${string}`);
      if (muteCheckbox.checked) {
        return -1; // ミュート
      }
      for (let i = 0; i <= 21; i++) {
        const cell = document.getElementById(`string${string}-${i}`);
        if (cell.classList.contains("selected")) {
          return i;
        }
      }
      return 0; // 開放弦
    }
    
    // MIDIファイルを作成する
    function createMIDI() {
      const track = new MidiWriter.Track();

      const midiNotes = [];

      for (let i = 6; i >= 1; i--) {
        const fret = getSelectedFret(i);
        if (fret !== -1) {
          const noteIndex = (baseNotes[i - 1] + fret) % 12;
          const octave = Math.floor((baseNotes[i - 1] + fret) / 12) + 2;
          const midiNote = 12 * octave + noteIndex;
          midiNotes.push(midiNote);
        }
      }

      if (midiNotes.length > 0) {
        const note = new MidiWriter.NoteEvent({ pitch: midiNotes, duration: '4' });
        track.addEvent(note);
      }

      const writer = new MidiWriter.Writer(track);
      return writer.dataUri();
    }

    // MIDIファイルをダウンロードする
    downloadButton.addEventListener("click", () => {
      const midiDataUri = createMIDI();

      const link = document.createElement("a");
      link.href = midiDataUri;
      link.download = "chord.mid";
      link.click();
    });
    
    playMidiButton.addEventListener("click", () => {
      const sampler = new Tone.Sampler({
      	urls: {
      		C4: "C4.mp3",
      		"D#4": "Ds4.mp3",
      		"F#4": "Fs4.mp3",
      		A4: "A4.mp3",
      	},
      	release: 1,
      	baseUrl: "https://tonejs.github.io/audio/salamander/",
      }).toDestination();
      const midiNotes = [];
      for (let i = 6; i >= 1; i--) {
        const fret = getSelectedFret(i);

        if (fret !== -1) {
          const noteIndex = (baseNotes[i - 1] + fret) % 12;
          const octave = Math.floor((baseNotes[i - 1] + fret) / 12) + 2;
          midiNotes.push(notes[noteIndex] + octave);
        }
      }
      console.log(midiNotes)
      Tone.loaded().then(() => {
        	sampler.triggerAttackRelease(midiNotes, 4);
        });
      
    });

    // セルのクリックイベント
    tableCells.forEach(cell => {
      cell.addEventListener("click", () => {
        const string = cell.dataset.string;
        const fret = cell.dataset.fret;

        // 同じ弦の他のフレットを選択解除
        for (let i = 0; i <= 21; i++) {
          const otherCell = document.getElementById(`string${string}-${i}`);
          otherCell.classList.remove("selected");
        }

        // クリックされたセルを選択
        cell.classList.add("selected");

        // 音を更新
        updateNotes();
      });
    });

    // ミュートチェックボックスの変更イベント
    muteCheckboxes.forEach(checkbox => {
      checkbox.addEventListener("change", () => {
        const string = checkbox.id.substring(4);
        const fretCells = document.querySelectorAll(`td[data-string='${string}']`);

        if (checkbox.checked) {
          fretCells.forEach(cell => {
            cell.classList.remove("selected");
            cell.classList.add("muted");
          });
        } else {
          fretCells.forEach(cell => {
            cell.classList.remove("muted");
          });
        }

        // 音を更新
        updateNotes();
      });
    });
    
    applyChordButton.addEventListener("click", () => {
      const rootNote = rootNoteSelect.value;
      const chordType = chordTypeSelect.value;
      const chordName = rootNote + chordType;
      
      if (chordData.hasOwnProperty(chordName)) {
        const chord = chordData[chordName];
        applyChord(chord);
        updateNotes();
      }
    });
    
    function applyChord(chord) {
      for (let i = 1; i <= 6; i++) {
        const fret = chord[6 - i];
        const muteCheckbox = document.getElementById(`mute${i}`);
        const fretCells = document.querySelectorAll(`td[data-string='${i}']`);

        if (fret === -1) {
          muteCheckbox.checked = true;
          fretCells.forEach(cell => {
            cell.classList.remove("selected");
            cell.classList.add("muted");
          });
        } else {
          muteCheckbox.checked = false;
          fretCells.forEach(cell => {
            cell.classList.remove("selected");
            cell.classList.remove("muted");
          });
          const selectedCell = document.getElementById(`string${i}-${fret}`);
          selectedCell.classList.add("selected");
        }
      }
      updateNotes(); // 追加
    }

    // 初期表示
    updateNotes();

document.addEventListener('DOMContentLoaded', function() {
  const downloadButton = document.getElementById('downloadMIDI');
  downloadButton.addEventListener('click', downloadMIDI);
});
},{"midi-writer-js":5}]},{},[6]);

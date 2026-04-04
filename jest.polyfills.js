/**
 * Polyfills for Web Fetch API globals in jsdom test environment.
 *
 * jsdom does not expose Node 18+ built-in globals (Request, Response, etc.)
 * that Next.js server components and route handlers require. This file runs
 * via `setupFiles` (before the test environment is initialised) so the globals
 * are in place when any module is first required.
 *
 * Order matters: undici uses bare global identifiers (ReadableStream, MessagePort,
 * TextDecoder, etc.) at module load time, so those must be patched first.
 */

// 1. Text codecs
const { TextEncoder, TextDecoder } = require('util')
if (typeof global.TextEncoder === 'undefined') global.TextEncoder = TextEncoder
if (typeof global.TextDecoder === 'undefined') global.TextDecoder = TextDecoder

// 2. Streams (undici accesses ReadableStream as a bare global)
const { ReadableStream, WritableStream, TransformStream } = require('node:stream/web')
if (typeof global.ReadableStream === 'undefined') global.ReadableStream = ReadableStream
if (typeof global.WritableStream === 'undefined') global.WritableStream = WritableStream
if (typeof global.TransformStream === 'undefined') global.TransformStream = TransformStream

// 3. MessagePort (undici accesses this as a bare global)
const { MessagePort, MessageChannel } = require('node:worker_threads')
if (typeof global.MessagePort === 'undefined') global.MessagePort = MessagePort
if (typeof global.MessageChannel === 'undefined') global.MessageChannel = MessageChannel

// 4. Blob
const { Blob } = require('node:buffer')
if (typeof global.Blob === 'undefined') global.Blob = Blob

// 5. Fetch API (undici) — depends on all the above
const { Request, Response, Headers, fetch: undiciFetch, FormData } = require('undici')
if (typeof global.Request === 'undefined') global.Request = Request
if (typeof global.Response === 'undefined') global.Response = Response
if (typeof global.Headers === 'undefined') global.Headers = Headers
if (typeof global.fetch === 'undefined') global.fetch = undiciFetch
if (typeof global.FormData === 'undefined') global.FormData = FormData

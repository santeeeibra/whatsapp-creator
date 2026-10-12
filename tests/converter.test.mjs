import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import ts from 'typescript';
import sharp from 'sharp';

const require = createRequire(import.meta.url);

// Model a decoder separately from currentTime: assigning a time does not mean
// that drawImage can already read the requested frame.
function harness({ stuck = false, downloadFails = false } = {}) {
  const videos = [];
  const revoked = [];
  class Video extends EventTarget {
    constructor() {
      super();
      this.duration = 2;
      this.videoWidth = this.videoHeight = 16;
      this.readyState = 0;
      this.seeking = false;
      this.decodedTime = this.time = 0;
      videos.push(this);
    }
    get currentTime() { return this.time; }
    set currentTime(time) {
      this.time = time;
      this.seeking = true;
      if (stuck) return;
      setTimeout(() => {
        this.decodedTime = time;
        this.seeking = false;
        this.readyState = 2;
        this.dispatchEvent(new Event('seeked'));
      }, 700);
    }
    load() {
      if (!this.src) return;
      setTimeout(() => {
        this.readyState = 2;
        this.dispatchEvent(new Event('loadeddata'));
      }, 0);
    }
    pause() {}
    removeAttribute() { this.src = ''; }
  }
  const document = {
    createElement(tag) {
      if (tag === 'video') return new Video();
      const context = {
        clearRect() {},
        drawImage(video) { this.time = video.decodedTime; },
        getImageData() {
          return { data: new Uint8ClampedArray([Math.round(this.time * 100), 50, 100, 255]) };
        },
      };
      return { getContext: () => context };
    },
  };
  const code = ts.transpileModule(fs.readFileSync(require.resolve('../src/lib/converter.ts'), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const exports = {};
  vm.runInNewContext(code, {
    exports, require, document, Blob, Uint8Array, AbortSignal,
    fetch: async () => ({ ok: !downloadFails, blob: async () => new Blob(['video']) }),
    URL: { createObjectURL: () => 'blob:capture', revokeObjectURL: url => revoked.push(url) },
    setTimeout: (fn, ms) => setTimeout(fn, stuck && ms === 15_000 ? 20 : ms),
    clearTimeout,
  });
  return { convert: exports.convertVideoToGif, videos, revoked };
}

test('waits for slow decoded frames, uses a separate video and excludes the end', async () => {
  const { convert, videos, revoked } = harness();
  const preview = { currentSrc: '/api/proxy-video?url=example', currentTime: 1 };
  const progress = [];
  const gif = await convert(preview, { startTime: 0, endTime: 1.5, fps: 2, width: 1, onProgress: p => progress.push(p) });
  const { data, info } = await sharp(Buffer.from(await gif.arrayBuffer()), { animated: true }).raw().toBuffer({ resolveWithObject: true });
  assert.equal(info.height / info.pageHeight, 3);
  assert.deepEqual([data[0], data[info.channels], data[2 * info.channels]], [0, 50, 100]);
  assert.equal(preview.currentTime, 1);
  assert.equal(videos.length, 1);
  assert.equal(videos[0].src, '');
  assert.equal(progress.at(-1), 100);
  assert.deepEqual(revoked, ['blob:capture']);
});

test('a stalled seek rejects instead of silently duplicating a frame', async () => {
  const { convert, revoked } = harness({ stuck: true });
  await assert.rejects(convert({ src: 'blob:source' }, { startTime: 0.5, endTime: 1.5, fps: 2, width: 1 }), /No se pudo cargar un fotograma/);
  assert.deepEqual(revoked, ['blob:capture']);
});

test('a failed download rejects before starting the decoder', async () => {
  const { convert, videos } = harness({ downloadFails: true });
  await assert.rejects(convert({ src: '/api/proxy-video' }, { startTime: 0, endTime: 1 }), /No se pudo descargar/);
  assert.equal(videos.length, 0);
});

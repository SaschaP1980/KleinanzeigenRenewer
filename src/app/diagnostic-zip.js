(() => {
  const encoder = new TextEncoder();

  function bytes(value) {
    if (value instanceof Uint8Array) return value;
    if (value instanceof ArrayBuffer) return new Uint8Array(value);
    return encoder.encode(String(value ?? ''));
  }

  function concat(parts) {
    const size = parts.reduce((sum, part) => sum + part.length, 0);
    const out = new Uint8Array(size);
    let offset = 0;
    for (const part of parts) { out.set(part, offset); offset += part.length; }
    return out;
  }

  function u16(value) {
    const out = new Uint8Array(2);
    new DataView(out.buffer).setUint16(0, value >>> 0, true);
    return out;
  }

  function u32(value) {
    const out = new Uint8Array(4);
    new DataView(out.buffer).setUint32(0, value >>> 0, true);
    return out;
  }

  const CRC_TABLE = (() => {
    const table = new Uint32Array(256);
    for (let n = 0; n < 256; n += 1) {
      let c = n;
      for (let k = 0; k < 8; k += 1) c = (c & 1) ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      table[n] = c >>> 0;
    }
    return table;
  })();

  function crc32(data) {
    let crc = 0xffffffff;
    for (const byte of data) crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
    return (crc ^ 0xffffffff) >>> 0;
  }

  async function deflateRaw(data) {
    if (typeof CompressionStream !== 'function') return null;
    try {
      const stream = new Blob([data]).stream().pipeThrough(new CompressionStream('deflate-raw'));
      return new Uint8Array(await new Response(stream).arrayBuffer());
    } catch {
      return null;
    }
  }

  async function createZip(entries) {
    const locals = [];
    const centrals = [];
    let offset = 0;
    for (const entry of entries) {
      const name = bytes(entry.name);
      const source = bytes(entry.data);
      const compressed = await deflateRaw(source);
      const method = compressed && compressed.length < source.length ? 8 : 0;
      const payload = method === 8 ? compressed : source;
      const crc = crc32(source);
      const flags = 0x0800;
      const local = concat([
        u32(0x04034b50), u16(20), u16(flags), u16(method), u16(0), u16(0),
        u32(crc), u32(payload.length), u32(source.length), u16(name.length), u16(0), name, payload
      ]);
      locals.push(local);
      const central = concat([
        u32(0x02014b50), u16(20), u16(20), u16(flags), u16(method), u16(0), u16(0),
        u32(crc), u32(payload.length), u32(source.length), u16(name.length), u16(0), u16(0),
        u16(0), u16(0), u32(0), u32(offset), name
      ]);
      centrals.push(central);
      offset += local.length;
    }
    const centralBytes = concat(centrals);
    const end = concat([
      u32(0x06054b50), u16(0), u16(0), u16(entries.length), u16(entries.length),
      u32(centralBytes.length), u32(offset), u16(0)
    ]);
    return new Blob([...locals, centralBytes, end], { type: 'application/zip' });
  }

  const API = Object.freeze({ createZip, crc32 });
  globalThis.KRDeps?.register?.('KRDiagnosticZip', API);
  if (typeof module !== 'undefined' && module?.exports) module.exports = API;
})();

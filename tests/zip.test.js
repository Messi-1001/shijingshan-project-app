/* tests/zip.test.js */
const test = require('node:test');
const assert = require('node:assert/strict');
const zip = require('../js/logic/zip.js');

test('crc32 标准校验值', () => {
  assert.equal(zip.crc32(zip.utf8('123456789')).toString(16), 'cbf43926');
});

test('crc32 空输入为 0', () => {
  assert.equal(zip.crc32(new Uint8Array(0)), 0);
});

test('utf8 中文按 3 字节编码', () => {
  assert.equal(zip.utf8('你好').length, 6);
  assert.equal(zip.utf8('abc').length, 3);
});

test('makeZip 的 local header 与 EOCD 签名正确', () => {
  const b = zip.makeZip([{ name: 'a.txt', data: 'hi' }]);
  const dv = new DataView(b.buffer, b.byteOffset);
  assert.equal(dv.getUint32(0, true), 0x04034b50);
  const eocdOff = b.length - 22;
  assert.equal(new DataView(b.buffer, b.byteOffset).getUint32(eocdOff, true), 0x06054b50);
  assert.equal(dv.getUint16(eocdOff + 10, true), 1, '条目数应为 1');
});

test('中央目录偏移与文件总长自洽', () => {
  const files = [{ name: 'a.txt', data: 'aaa' }, { name: 'b/c.xml', data: '<x/>' }];
  const b = zip.makeZip(files, new Date(2026, 8, 25, 15, 30));
  const dv = new DataView(b.buffer, b.byteOffset);
  const eocdOff = b.length - 22;
  assert.equal(dv.getUint16(eocdOff + 10, true), 2);
  const cdSize = dv.getUint32(eocdOff + 12, true);
  const cdOff = dv.getUint32(eocdOff + 16, true);
  assert.equal(cdOff + cdSize + 22, b.length, 'CD 起始 + CD 长度 + EOCD 应等于总长');
  assert.equal(dv.getUint32(cdOff, true), 0x02014b50);
});

test('UTF-8 名称标志位置位', () => {
  const b = zip.makeZip([{ name: '中文.xml', data: 'x' }]);
  const dv = new DataView(b.buffer, b.byteOffset);
  assert.equal(dv.getUint16(6, true) & 0x0800, 0x0800);
});

test('条目可用 DataView 按名回读', () => {
  const b = zip.makeZip([{ name: 'x.txt', data: 'hello' }], new Date(2026, 0, 1));
  const dv = new DataView(b.buffer, b.byteOffset);
  const nameLen = dv.getUint16(26, true);
  const dataLen = dv.getUint32(18, true);
  assert.equal(nameLen, 5);
  assert.equal(dataLen, 5);
  const bytes = new Uint8Array(b.buffer, b.byteOffset + 30 + nameLen, dataLen);
  assert.equal(String.fromCharCode.apply(null, bytes), 'hello');
});

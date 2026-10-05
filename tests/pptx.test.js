/* tests/pptx.test.js */
const test = require('node:test');
const assert = require('node:assert/strict');
const p = require('../js/logic/pptx.js');

test('esc 转义 XML 特殊字符', () => {
  assert.equal(p.esc('<a & "b">'), '&lt;a &amp; &quot;b&quot;&gt;');
});

test('标题页含标题与副标题', () => {
  const x = p.slideXml({ layout: 'title', title: 'T', subtitle: 'S' });
  assert.ok(x.startsWith('<?xml'));
  assert.ok(x.includes('<a:t>T</a:t>'));
  assert.ok(x.includes('<a:t>S</a:t>'));
});

test('标题页无副标题时不产出空文本框', () => {
  const x = p.slideXml({ layout: 'title', title: 'T' });
  assert.equal((x.match(/<p:sp>/g) || []).length, 1);
});

test('内容页每个要点一个文本框', () => {
  const x = p.slideXml({ title: 'H', bullets: ['a', 'b', 'c'] });
  assert.equal((x.match(/<p:sp>/g) || []).length, 4); // 标题 + 3 要点
});

test('buildPptx 是合法 ZIP 且含必需部件', () => {
  const b = p.buildPptx([{ layout: 'title', title: 'T' }, { title: 'H', bullets: ['a'] }]);
  const dv = new DataView(b.buffer, b.byteOffset);
  assert.equal(dv.getUint32(0, true), 0x04034b50);
  const text = Buffer.from(b).toString('latin1');
  ['[Content_Types].xml', '_rels/.rels', 'ppt/presentation.xml', 'ppt/_rels/presentation.xml.rels',
   'ppt/slideMasters/slideMaster1.xml', 'ppt/slideMasters/_rels/slideMaster1.xml.rels',
   'ppt/slideLayouts/slideLayout1.xml', 'ppt/slideLayouts/_rels/slideLayout1.xml.rels',
   'ppt/slides/slide1.xml', 'ppt/slides/slide2.xml', 'ppt/theme/theme1.xml']
    .forEach((n) => assert.ok(text.includes(n), '缺部件 ' + n));
});

test('Content_Types 为每页 slide 产出 Override', () => {
  const b = p.buildPptx([{ title: 'A', bullets: [] }, { title: 'B', bullets: [] }, { title: 'C', bullets: [] }]);
  const text = Buffer.from(b).toString('latin1');
  assert.ok(text.includes('/ppt/slides/slide3.xml'));
});

test('presentation.xml 的 r:id 数量与幻灯片一致', () => {
  const b = p.buildPptx([{ title: 'A', bullets: [] }, { title: 'B', bullets: [] }]);
  const text = Buffer.from(b).toString('latin1');
  assert.ok(text.includes('rId2'));
  assert.ok(text.includes('rId3'));
  assert.ok(!text.includes('rId4" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide"'));
});

test('特殊字符不会破坏 XML', () => {
  const b = p.buildPptx([{ title: '<script>&"', bullets: ['a<b'] }]);
  const text = Buffer.from(b).toString('latin1');
  assert.ok(!text.includes('<script>'));
  assert.ok(text.includes('&lt;script&gt;'));
});

test('EMU 尺寸为 16:9', () => {
  assert.equal(p.EMU_W / p.EMU_H, 16 / 9);
});

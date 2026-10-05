/* js/logic/pptx.js */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./zip.js'));
  else { root.SJSQ = root.SJSQ || {}; root.SJSQ.logic = root.SJSQ.logic || {}; root.SJSQ.logic.pptx = factory(root.SJSQ.logic.zip); }
})(typeof self !== 'undefined' ? self : this, function (zip) {
  'use strict';

  var NS = 'xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" ' +
           'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" ' +
           'xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"';
  var R_NS = 'xmlns="http://schemas.openxmlformats.org/package/2006/relationships"';
  var CT_NS = 'xmlns="http://schemas.openxmlformats.org/package/2006/content-types"';
  var REL = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/';
  var EMU_W = 12192000, EMU_H = 6858000;
  var FONT = '微软雅黑';

  function esc(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function spTree(inner) {
    return '<p:cSld><p:spTree><p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr>' +
      '<p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/><a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr>' +
      inner + '</p:spTree></p:cSld>';
  }

  function textBox(id, x, y, cx, cy, paras, sizePt, bold, color) {
    var body = paras.map(function (t) {
      return '<a:p><a:pPr><a:buNone/></a:pPr><a:r><a:rPr lang="zh-CN" sz="' + Math.round(sizePt * 100) + '"' +
        (bold ? ' b="1"' : '') + '><a:solidFill><a:srgbClr val="' + color + '"/></a:solidFill>' +
        '<a:latin typeface="' + FONT + '"/><a:ea typeface="' + FONT + '"/></a:rPr><a:t>' + esc(t) + '</a:t></a:r></a:p>';
    }).join('');
    return '<p:sp><p:nvSpPr><p:cNvPr id="' + id + '" name="TextBox ' + id + '"/><p:cNvSpPr txBox="1"/><p:nvPr/></p:nvSpPr>' +
      '<p:spPr><a:xfrm><a:off x="' + x + '" y="' + y + '"/><a:ext cx="' + cx + '" cy="' + cy + '"/></a:xfrm>' +
      '<a:prstGeom prst="rect"><a:avLst/></a:prstGeom></p:spPr>' +
      '<p:txBody><a:bodyPr wrap="square" rtlCol="0"/><a:lstStyle/>' + body + '</p:txBody></p:sp>';
  }

  function slideXml(s) {
    var head = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><p:sld ' + NS + '>';
    if (s.layout === 'title') {
      return head + spTree(
        textBox(2, 914400, 2400000, EMU_W - 1828800, 1200000, [s.title], 40, true, '1F3864') +
        (s.subtitle ? textBox(3, 914400, 3700000, EMU_W - 1828800, 800000, [s.subtitle], 18, false, '595959') : '')
      ) + '</p:sld>';
    }
    var y = 1000000, id = 2, out = textBox(id++, 914400, 500000, EMU_W - 1828800, 800000, [s.title], 28, true, '1F3864');
    (s.bullets || []).forEach(function (b) {
      out += textBox(id++, 914400, y, EMU_W - 1828800, 460000, [b], 16, false, '262626');
      y += 520000;
    });
    return head + spTree(out) + '</p:sld>';
  }

  function buildPptx(slides) {
    var files = [];

    // 1) [Content_Types].xml
    var ct = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types ' + CT_NS + '>' +
      '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
      '<Default Extension="xml" ContentType="application/xml"/>' +
      '<Override PartName="/ppt/presentation.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml"/>' +
      '<Override PartName="/ppt/slideMasters/slideMaster1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideMaster+xml"/>' +
      '<Override PartName="/ppt/slideLayouts/slideLayout1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideLayout+xml"/>' +
      '<Override PartName="/ppt/theme/theme1.xml" ContentType="application/vnd.openxmlformats-officedocument.theme+xml"/>';
    slides.forEach(function (s, i) {
      ct += '<Override PartName="/ppt/slides/slide' + (i + 1) + '.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>';
    });
    files.push({ name: '[Content_Types].xml', data: ct + '</Types>' });

    // 2) _rels/.rels
    files.push({ name: '_rels/.rels', data: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships ' + R_NS + '>' +
      '<Relationship Id="rId1" Type="' + REL + 'officeDocument" Target="ppt/presentation.xml"/></Relationships>' });

    // 3) ppt/presentation.xml
    var sldIdLst = slides.map(function (s, i) { return '<p:sldId id="' + (256 + i) + '" r:id="rId' + (i + 2) + '"/>'; }).join('');
    files.push({ name: 'ppt/presentation.xml', data: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<p:presentation ' + NS + ' saveSubsetFonts="1">' +
      '<p:sldMasterIdLst><p:sldMasterId id="2147483648" r:id="rId1"/></p:sldMasterIdLst>' +
      '<p:sldIdLst>' + sldIdLst + '</p:sldIdLst>' +
      '<p:sldSz cx="' + EMU_W + '" cy="' + EMU_H + '"/>' +
      '<p:notesSz cx="6858000" cy="9144000"/></p:presentation>' });

    // 4) ppt/_rels/presentation.xml.rels
    var presRels = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships ' + R_NS + '>' +
      '<Relationship Id="rId1" Type="' + REL + 'slideMaster" Target="slideMasters/slideMaster1.xml"/>';
    slides.forEach(function (s, i) {
      presRels += '<Relationship Id="rId' + (i + 2) + '" Type="' + REL + 'slide" Target="slides/slide' + (i + 1) + '.xml"/>';
    });
    presRels += '<Relationship Id="rId' + (slides.length + 2) + '" Type="' + REL + 'theme" Target="theme/theme1.xml"/></Relationships>';
    files.push({ name: 'ppt/_rels/presentation.xml.rels', data: presRels });

    // 5/6) slideMaster
    var clrMap = 'bg1="lt1" tx1="dk1" bg2="lt2" tx2="dk2" accent1="accent1" accent2="accent2" accent3="accent3" ' +
      'accent4="accent4" accent5="accent5" accent6="accent6" hlink="hlink" folHlink="folHlink"';
    files.push({ name: 'ppt/slideMasters/slideMaster1.xml', data: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<p:sldMaster ' + NS + '>' + spTree('') + '<p:clrMap ' + clrMap + '/>' +
      '<p:sldLayoutIdLst><p:sldLayoutId id="2147483649" r:id="rId1"/></p:sldLayoutIdLst></p:sldMaster>' });
    files.push({ name: 'ppt/slideMasters/_rels/slideMaster1.xml.rels', data: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships ' + R_NS + '>' +
      '<Relationship Id="rId1" Type="' + REL + 'slideLayout" Target="../slideLayouts/slideLayout1.xml"/>' +
      '<Relationship Id="rId2" Type="' + REL + 'theme" Target="../theme/theme1.xml"/></Relationships>' });

    // 7/8) slideLayout（单张空白版式，所有页共用）
    files.push({ name: 'ppt/slideLayouts/slideLayout1.xml', data: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<p:sldLayout ' + NS + ' type="blank" preserve="1">' + spTree('') +
      '<p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr></p:sldLayout>' });
    files.push({ name: 'ppt/slideLayouts/_rels/slideLayout1.xml.rels', data: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships ' + R_NS + '>' +
      '<Relationship Id="rId1" Type="' + REL + 'slideMaster" Target="../slideMasters/slideMaster1.xml"/></Relationships>' });

    // 9) 每页 slide + rels
    slides.forEach(function (s, i) {
      files.push({ name: 'ppt/slides/slide' + (i + 1) + '.xml', data: slideXml(s) });
      files.push({ name: 'ppt/slides/_rels/slide' + (i + 1) + '.xml.rels', data: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships ' + R_NS + '>' +
        '<Relationship Id="rId1" Type="' + REL + 'slideLayout" Target="../slideLayouts/slideLayout1.xml"/></Relationships>' });
    });

    // 10) theme1.xml
    files.push({ name: 'ppt/theme/theme1.xml', data: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<a:theme xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" name="Office">' +
      '<a:themeElements><a:clrScheme name="Office">' +
      '<a:dk1><a:sysClr val="windowText" lastClr="000000"/></a:dk1><a:lt1><a:sysClr val="window" lastClr="FFFFFF"/></a:lt1>' +
      '<a:dk2><a:srgbClr val="1F3864"/></a:dk2><a:lt2><a:srgbClr val="EEECE1"/></a:lt2>' +
      '<a:accent1><a:srgbClr val="4472C4"/></a:accent1><a:accent2><a:srgbClr val="ED7D31"/></a:accent2>' +
      '<a:accent3><a:srgbClr val="A5A5A5"/></a:accent3><a:accent4><a:srgbClr val="FFC000"/></a:accent4>' +
      '<a:accent5><a:srgbClr val="5B9BD5"/></a:accent5><a:accent6><a:srgbClr val="70AD47"/></a:accent6>' +
      '<a:hlink><a:srgbClr val="0563C1"/></a:hlink><a:folHlink><a:srgbClr val="954F72"/></a:folHlink></a:clrScheme>' +
      '<a:fontScheme name="Office">' +
      '<a:majorFont><a:latin typeface="Calibri Light"/><a:ea typeface="' + FONT + '"/><a:cs typeface=""/></a:majorFont>' +
      '<a:minorFont><a:latin typeface="Calibri"/><a:ea typeface="' + FONT + '"/><a:cs typeface=""/></a:minorFont></a:fontScheme>' +
      '<a:fmtScheme name="Office">' +
      '<a:fillStyleLst><a:solidFill><a:schemeClr val="phClr"/></a:solidFill>' +
      '<a:solidFill><a:schemeClr val="phClr"/></a:solidFill>' +
      '<a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:fillStyleLst>' +
      '<a:lnStyleLst><a:ln w="6350"><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:ln>' +
      '<a:ln w="12700"><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:ln>' +
      '<a:ln w="19050"><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:ln></a:lnStyleLst>' +
      '<a:effectStyleLst><a:effectStyle><a:effectLst/></a:effectStyle>' +
      '<a:effectStyle><a:effectLst/></a:effectStyle><a:effectStyle><a:effectLst/></a:effectStyle></a:effectStyleLst>' +
      '<a:bgFillStyleLst><a:solidFill><a:schemeClr val="phClr"/></a:solidFill>' +
      '<a:solidFill><a:schemeClr val="phClr"/></a:solidFill>' +
      '<a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:bgFillStyleLst>' +
      '</a:fmtScheme></a:themeElements></a:theme>' });

    return zip.makeZip(files);
  }

  return { EMU_W: EMU_W, EMU_H: EMU_H, REL: REL, esc: esc, slideXml: slideXml, buildPptx: buildPptx };
});

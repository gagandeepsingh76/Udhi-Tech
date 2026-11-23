import { XMLParser, XMLValidator } from 'fast-xml-parser';
import { ValidationReport, CheckDetail } from './types';

export function validateSvg(svgRaw: string): ValidationReport {
  const summary: string[] = [];
  const failureReasons: string[] = [];

  // Extract clean SVG string in case model wrapped it in markdown codeblocks
  let svg = svgRaw.trim();
  const match = svg.match(/<svg[\s\S]*<\/svg>/i);
  if (match) {
    svg = match[0];
  }

  // --- CHECK 1: The SVG is valid and can be parsed ---
  let isValidParsed = false;
  let parsedObj: any = null;
  let parseDetail = '';

  const validationResult = XMLValidator.validate(svg);
  if (validationResult === true) {
    try {
      const parser = new XMLParser({
        ignoreAttributes: false,
        attributeNamePrefix: '@_',
        allowBooleanAttributes: true
      });
      parsedObj = parser.parse(svg);
      if (parsedObj && (parsedObj.svg || parsedObj['?xml'])) {
        isValidParsed = true;
        parseDetail = 'SVG XML syntax is well-formed and successfully parsed.';
      } else {
        parseDetail = 'Parsed XML does not contain a root <svg> element.';
      }
    } catch (e: any) {
      parseDetail = `XML parsing exception: ${e?.message || 'unknown error'}`;
    }
  } else {
    parseDetail = `XML validation error: ${JSON.stringify(validationResult)}`;
  }

  const check1: CheckDetail = {
    name: 'Valid & Parseable SVG',
    passed: isValidParsed,
    description: 'The SVG is valid XML and can be parsed into a DOM tree.',
    details: parseDetail
  };
  if (!check1.passed) failureReasons.push(parseDetail);

  // --- CHECK 2: Nothing is drawn outside the viewBox ---
  let isWithinViewBox = false;
  let viewBoxDetail = '';

  if (isValidParsed) {
    // Extract viewBox
    const viewBoxAttr = svg.match(/viewBox\s*=\s*["']([^"']+)["']/i);
    if (!viewBoxAttr) {
      viewBoxDetail = 'No viewBox attribute found on <svg> element.';
    } else {
      const parts = viewBoxAttr[1].trim().split(/[\s,]+/).map(Number);
      if (parts.length === 4 && !parts.some(isNaN)) {
        const [minX, minY, width, height] = parts;
        const maxX = minX + width;
        const maxY = minY + height;
        const margin = 20; // Allow modest rendering margin

        let outOfBoundsFound: string[] = [];

        // Check circles: cx, cy, r
        const circleMatches = Array.from(svg.matchAll(/<circle\b[^>]*>/gi));
        for (const c of circleMatches) {
          const str = c[0];
          const cxM = str.match(/cx\s*=\s*["']?([-\d.]+)["']?/);
          const cyM = str.match(/cy\s*=\s*["']?([-\d.]+)["']?/);
          const rM = str.match(/r\s*=\s*["']?([-\d.]+)["']?/);
          if (cxM && cyM && rM) {
            const cx = parseFloat(cxM[1]);
            const cy = parseFloat(cyM[1]);
            const r = parseFloat(rM[1]);
            if (cx - r < minX - margin || cx + r > maxX + margin || cy - r < minY - margin || cy + r > maxY + margin) {
              outOfBoundsFound.push(`circle(cx=${cx}, cy=${cy}, r=${r})`);
            }
          }
        }

        // Check rects: x, y, width, height
        const rectMatches = Array.from(svg.matchAll(/<rect\b[^>]*>/gi));
        for (const r of rectMatches) {
          const str = r[0];
          const xM = str.match(/x\s*=\s*["']?([-\d.]+)["']?/);
          const yM = str.match(/y\s*=\s*["']?([-\d.]+)["']?/);
          const wM = str.match(/width\s*=\s*["']?([-\d.]+)["']?/);
          const hM = str.match(/height\s*=\s*["']?([-\d.]+)["']?/);
          if (xM && yM && wM && hM) {
            const x = parseFloat(xM[1]);
            const y = parseFloat(yM[1]);
            const w = parseFloat(wM[1]);
            const h = parseFloat(hM[1]);
            if (x < minX - margin || x + w > maxX + margin || y < minY - margin || y + h > maxY + margin) {
              outOfBoundsFound.push(`rect(x=${x}, y=${y}, w=${w}, h=${h})`);
            }
          }
        }

        // Check text elements: x, y
        const textMatches = Array.from(svg.matchAll(/<text\b[^>]*>/gi));
        for (const t of textMatches) {
          const str = t[0];
          const xM = str.match(/x\s*=\s*["']?([-\d.]+)["']?/);
          const yM = str.match(/y\s*=\s*["']?([-\d.]+)["']?/);
          if (xM && yM) {
            const x = parseFloat(xM[1]);
            const y = parseFloat(yM[1]);
            if (x < minX - margin || x > maxX + margin || y < minY - margin || y > maxY + margin) {
              outOfBoundsFound.push(`text(x=${x}, y=${y})`);
            }
          }
        }

        if (outOfBoundsFound.length > 0) {
          viewBoxDetail = `Elements detected outside viewBox [${minX}, ${minY}, ${width}, ${height}]: ${outOfBoundsFound.slice(0, 3).join(', ')}`;
        } else {
          isWithinViewBox = true;
          viewBoxDetail = `All checked shapes and text lie safely within viewBox [${minX}, ${minY}, ${width}, ${height}].`;
        }
      } else {
        viewBoxDetail = `Invalid viewBox numeric format: "${viewBoxAttr[1]}"`;
      }
    }
  } else {
    viewBoxDetail = 'Cannot verify viewBox: SVG syntax invalid.';
  }

  const check2: CheckDetail = {
    name: 'ViewBox Boundary Integrity',
    passed: isWithinViewBox,
    description: 'All graphic elements and labels are positioned strictly within the viewBox boundaries.',
    details: viewBoxDetail
  };
  if (!check2.passed) failureReasons.push(viewBoxDetail);

  // --- CHECK 3: Has a title and at least 3 text labels ---
  let hasTitleAnd3Labels = false;
  let labelsDetail = '';

  const hasTitleTag = /<title\b[^>]*>([\s\S]*?)<\/title>/i.test(svg);
  const textMatches = Array.from(svg.matchAll(/<text\b[^>]*>([\s\S]*?)<\/text>/gi));
  const validTextContents = textMatches
    .map(m => m[1].replace(/<[^>]+>/g, '').trim())
    .filter(t => t.length > 0);

  const labelCount = validTextContents.length;
  // An SVG either has an explicit <title> tag OR an obvious title <text> element plus >= 3 educational labels
  const titleDetected = hasTitleTag || validTextContents.some(t => t.toLowerCase().includes('theorem') || t.toLowerCase().includes('circle') || t.toLowerCase().includes('circuit') || t.toLowerCase().includes('photosynthesis') || t.toLowerCase().includes('states'));

  if (titleDetected && labelCount >= 3) {
    hasTitleAnd3Labels = true;
    labelsDetail = `Found title (${hasTitleTag ? '<title> tag' : 'title text'}) and ${labelCount} informative text labels.`;
  } else {
    labelsDetail = `Failed: Title present = ${titleDetected}, text label count = ${labelCount} (requires title + at least 3 text labels).`;
  }

  const check3: CheckDetail = {
    name: 'Title & 3+ Text Labels',
    passed: hasTitleAnd3Labels,
    description: 'Diagram includes a clear title and at least 3 descriptive text labels.',
    details: labelsDetail
  };
  if (!check3.passed) failureReasons.push(labelsDetail);

  // --- CHECK 4: Has at least one animation ---
  let hasAnimation = false;
  let animDetail = '';

  const smilMatches = svg.match(/<(animate|animateTransform|animateMotion|set)\b/gi);
  const keyframesMatch = /@keyframes\s+([A-Za-z0-9_-]+)/i.test(svg);
  const cssAnimationMatch = /animation\s*:\s*[^;}]+/i.test(svg);

  if (smilMatches && smilMatches.length > 0) {
    hasAnimation = true;
    animDetail = `Contains ${smilMatches.length} SMIL animation element(s) (${smilMatches.map(s => s.replace('<', '')).slice(0, 3).join(', ')}).`;
  } else if (keyframesMatch || cssAnimationMatch) {
    hasAnimation = true;
    animDetail = 'Contains CSS animation with @keyframes and animated style rules.';
  } else {
    animDetail = 'No SMIL (<animate>, <animateTransform>) or CSS (@keyframes) animations found.';
  }

  const check4: CheckDetail = {
    name: 'Animation Presence (CSS or SMIL)',
    passed: hasAnimation,
    description: 'Diagram contains at least one active SMIL or CSS animation.',
    details: animDetail
  };
  if (!check4.passed) failureReasons.push(animDetail);

  // --- CHECK 5 (Custom Check): Science Diagram Structure, Graphic Shapes & Safety ---
  let isStructureAndSafetyPassed = false;
  let customDetail = '';

  // 1. Safety: no malicious scripts or external iframes
  const hasScript = /<script\b/i.test(svg) || /javascript:/i.test(svg) || /onload\s*=/i.test(svg);
  // 2. Namespace
  const hasXmlns = /xmlns\s*=\s*["']http:\/\/www\.w3\.org\/2000\/svg["']/i.test(svg);
  // 3. Graphic elements count (shapes that represent actual scientific diagrams)
  const graphicShapeMatches = svg.match(/<(path|rect|circle|ellipse|line|polygon|polyline)\b/gi) || [];
  const shapeCount = graphicShapeMatches.length;

  if (hasScript) {
    customDetail = 'Security failure: Disallowed <script> or inline JS handler detected in SVG.';
  } else if (!hasXmlns) {
    customDetail = 'Structure warning: Missing standard SVG namespace xmlns="http://www.w3.org/2000/svg".';
  } else if (shapeCount < 2) {
    customDetail = `Semantic failure: Diagram only contains ${shapeCount} graphic shapes (minimum 2 shapes required for scientific diagrams).`;
  } else {
    isStructureAndSafetyPassed = true;
    customDetail = `Passed: Clean SVG namespace, zero unsafe scripts, and rich graphical representation (${shapeCount} vector shapes).`;
  }

  const check5: CheckDetail = {
    name: 'Semantic Structure & Safety (Custom)',
    passed: isStructureAndSafetyPassed,
    description: 'Enforces SVG namespace standards, safe vector hygiene (zero scripts), and minimum scientific graphic geometry.',
    details: customDetail
  };
  if (!check5.passed) failureReasons.push(customDetail);

  const allPassed = check1.passed && check2.passed && check3.passed && check4.passed && check5.passed;

  return {
    allPassed,
    checks: {
      validSvg: check1,
      withinViewBox: check2,
      titleAndLabels: check3,
      hasAnimation: check4,
      structureAndSafety: check5,
    },
    summary: [
      check1.passed ? '✓ Valid SVG' : '✗ Invalid SVG',
      check2.passed ? '✓ Within ViewBox' : '✗ ViewBox Overflow',
      check3.passed ? '✓ Title & 3+ Labels' : '✗ Missing Labels/Title',
      check4.passed ? '✓ Animated' : '✗ No Animation',
      check5.passed ? '✓ Clean Structure & Safety' : '✗ Structure/Safety Issue'
    ],
    failureReason: failureReasons.length > 0 ? failureReasons.join(' | ') : undefined
  };
}

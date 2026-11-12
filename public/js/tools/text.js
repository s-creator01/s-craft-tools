// S Craft — Text Tools Engine (100% Client-Side Pure JavaScript)
import { textToPdf } from './pdf.js';

export { textToPdf };

export function convertCase(text, mode = 'upper') {
  if (!text) return '';
  switch (mode) {
    case 'upper':
      return text.toUpperCase();
    case 'lower':
      return text.toLowerCase();
    case 'title':
      return text.replace(/\b\w+/g, txt => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase());
    case 'sentence':
      return text.toLowerCase().replace(/(^\s*\w|[.!?]\s*\w)/g, c => c.toUpperCase());
    case 'camel':
      return text.toLowerCase().replace(/[^a-zA-Z0-9]+(.)/g, (m, chr) => chr.toUpperCase());
    case 'kebab':
      return text.trim().toLowerCase().replace(/[\s_]+/g, '-').replace(/[^a-zA-Z0-9-]/g, '');
    case 'snake':
      return text.trim().toLowerCase().replace(/[\s-]+/g, '_').replace(/[^a-zA-Z0-9_]/g, '');
    default:
      return text;
  }
}

export function countTextStats(text) {
  if (!text) {
    return { words: 0, characters: 0, charactersNoSpaces: 0, lines: 0, paragraphs: 0, readingTimeMin: 0 };
  }

  const words = (text.trim().match(/\S+/g) || []).length;
  const characters = text.length;
  const charactersNoSpaces = text.replace(/\s/g, '').length;
  const lines = text.split(/\r\n|\r|\n/).length;
  const paragraphs = text.split(/\n\s*\n/).filter(p => p.trim().length > 0).length || (text.trim() ? 1 : 0);
  const readingTimeMin = Math.ceil(words / 200);

  return {
    words,
    characters,
    charactersNoSpaces,
    lines,
    paragraphs,
    readingTimeMin
  };
}

export function findAndReplace(text, findStr, replaceStr, caseSensitive = false) {
  if (!text || !findStr) return { result: text, count: 0 };
  const flags = caseSensitive ? 'g' : 'gi';
  const escaped = findStr.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(escaped, flags);
  const matches = text.match(regex);
  const count = matches ? matches.length : 0;
  const result = text.replace(regex, replaceStr || '');
  return { result, count };
}

export function removeSpacesAndBlanks(text, options = { collapseSpaces: true, removeEmptyLines: true, trimLines: true }) {
  if (!text) return '';
  let lines = text.split(/\r?\n/);

  if (options.trimLines) {
    lines = lines.map(l => l.trim());
  }

  if (options.collapseSpaces) {
    lines = lines.map(l => l.replace(/[ \t]+/g, ' '));
  }

  if (options.removeEmptyLines) {
    lines = lines.filter(l => l.length > 0);
  }

  return lines.join('\n');
}

export function removeDuplicateLines(text, caseSensitive = true) {
  if (!text) return '';
  const lines = text.split(/\r?\n/);
  const seen = new Set();
  const result = [];

  for (const line of lines) {
    const key = caseSensitive ? line : line.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      result.push(line);
    }
  }

  return result.join('\n');
}

export function sortLines(text, mode = 'az') {
  if (!text) return '';
  const lines = text.split(/\r?\n/);

  lines.sort((a, b) => {
    if (mode === 'az') return a.localeCompare(b);
    if (mode === 'za') return b.localeCompare(a);
    if (mode === 'numeric') {
      const numA = parseFloat(a) || 0;
      const numB = parseFloat(b) || 0;
      return numA - numB;
    }
    if (mode === 'length') return a.length - b.length;
    return 0;
  });

  return lines.join('\n');
}

export function compareTextDiff(textA, textB) {
  const linesA = (textA || '').split(/\r?\n/);
  const linesB = (textB || '').split(/\r?\n/);
  const diff = [];

  const maxLen = Math.max(linesA.length, linesB.length);
  for (let i = 0; i < maxLen; i++) {
    const a = linesA[i];
    const b = linesB[i];

    if (a === b) {
      diff.push({ type: 'same', text: a });
    } else {
      if (a !== undefined) diff.push({ type: 'removed', text: a });
      if (b !== undefined) diff.push({ type: 'added', text: b });
    }
  }

  return diff;
}

const sampleWords = ['sensor','valve','motor','panel','camera','report','system','project','paper','signal','device','sample','garden','workshop','design','meter'];
const sampleSubjects = ['The technician','Our team','A visitor','This example','The operator','Every student','A designer','The application'];
const sampleVerbs = ['reviews','checks','creates','opens','updates','measures','organizes','tests'];
const sampleObjects = ['a simple report','the new design','a clean document','the next project','several useful tools','a small change','the final result','another example'];
const sampleEndings = ['before lunch','during the morning','without extra steps','at the workstation','on the same day','for quick testing','with careful attention','in a few minutes'];
const loremWords = ['lorem','ipsum','dolor','sit','amet','consectetur','adipiscing','elit','sed','do','eiusmod','tempor','incididunt','ut','labore','et','dolore','magna','aliqua','enim','ad','minim','veniam'];
function seededRandom(seed) { let x = (Math.trunc(Number(seed)) >>> 0) || 1; return () => { x ^= x << 13; x ^= x >>> 17; x ^= x << 5; return (x >>> 0) / 4294967296; }; }
function randomChoice(items, random) { return items[Math.floor(random() * items.length)]; }
export function generateRandomText({mode='sentences',quantity=3,sentencesPerParagraph=4,seed}={}) {
  const count=Number(quantity), per=Number(sentencesPerParagraph);
  if(!Number.isInteger(count)||count<1||count>1000) throw new RangeError('Quantity must be between 1 and 1000.');
  if(!Number.isInteger(per)||per<1||per>120) throw new RangeError('Sentences per paragraph must be between 1 and 120.');
  const actualSeed=seed ?? globalThis.crypto?.getRandomValues?.(new Uint32Array(1))?.[0] ?? Math.floor(Math.random()*0xffffffff);
  const random=seededRandom(actualSeed);
  const sentence=()=>`${randomChoice(sampleSubjects,random)} ${randomChoice(sampleVerbs,random)} ${randomChoice(sampleObjects,random)} ${randomChoice(sampleEndings,random)}.`;
  let text;
  if(mode==='words') text=Array.from({length:count},()=>randomChoice(sampleWords,random)).join(' ');
  else if(mode==='sentences') text=Array.from({length:count},sentence).join(' ');
  else if(mode==='paragraphs') text=Array.from({length:count},()=>Array.from({length:per},sentence).join(' ')).join('\n\n');
  else if(mode==='list') text=Array.from({length:count},()=>`• ${sentence()}`).join('\n');
  else if(mode==='lorem') text=Array.from({length:count},()=>randomChoice(loremWords,random)).join(' ');
  else throw new RangeError('Choose a supported text type.');
  if(text.length>2_000_000) throw new RangeError('Generated text is too large.');
  return {text,seed:actualSeed,mode,quantity:count};
}

export function extractTextItems(raw,mode='email',{unique=true}={}) {
  const text=String(raw).slice(0,1_000_000);
  let matches=[];
  if(mode==='email') matches=text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi) ?? [];
  else if(mode==='url') matches=(text.match(/https?:\/\/[^\s<>"']+/gi) ?? []).map(value=>value.replace(/[.,;!?]+$/g,''));
  else if(mode==='number') matches=text.match(/[-+]?(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?/gi) ?? [];
  else if(mode==='phone') matches=text.match(/(?:\+?\d[\d ().-]{5,}\d)/g) ?? [];
  else throw new RangeError('Choose email, URL, number or phone candidates.');
  return unique ? [...new Set(matches)] : matches;
}

export function makeSlug(raw,{unicode=false}={}) {
  let text=String(raw).normalize('NFKD').toLowerCase();
  if(!unicode) text=text.replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-');
  else text=text.replace(/[^\p{L}\p{N}]+/gu,'-');
  return text.replace(/-+/g,'-').replace(/^-|-$/g,'');
}

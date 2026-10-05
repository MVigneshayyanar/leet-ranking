const fs = require('fs');
const path = require('path');
const axios = require('axios');
const cheerio = require('cheerio');

const REQUEST_TIMEOUT_MS = 15000;
const REQUEST_DELAY_MS = 250;

const LABEL_MAP = {
  CODETRACK: 'codeTracks',
  CODETRACKS: 'codeTracks',
  CODETEST: 'codeTests',
  CODETESTS: 'codeTests',
  DAILYCHALLENGE: 'dailyChallenge',
  DC: 'dailyChallenge',
  DAILYTEST: 'dailyTest',
  DT: 'dailyTest',
  CODETUTOR: 'codeTutor'
};

function normalizeLabel(label = '') {
  return label.toUpperCase().replace(/[^A-Z]/g, '');
}

function toInt(value) {
  if (value == null) return 0;
  const parsed = Number.parseInt(String(value).replace(/[^\d]/g, ''), 10);
  return Number.isNaN(parsed) ? 0 : parsed;
}

function calculatePoints({ codeTracks = 0, dailyChallenge = 0, dailyTest = 0, codeTests = 0 }) {
  return (codeTracks * 2) + (dailyChallenge * 2) + (dailyTest * 20) + (codeTests * 30);
}

function isValidProfileUrl(url) {
  if (!url) return false;

  try {
    const parsed = new URL(url);
    const host = parsed.hostname.toLowerCase();
    if (!host.includes('skillrack.com')) return false;

    const pathname = parsed.pathname.toLowerCase();
    return pathname.includes('/profile/') || pathname.includes('resume.xhtml');
  } catch {
    return false;
  }
}

function extractStats(html) {
  const $ = cheerio.load(html);
  const stats = {
    codeTutor: 0,
    codeTracks: 0,
    dailyChallenge: 0,
    dailyTest: 0,
    codeTests: 0
  };

  $('.statistic').each((_, el) => {
    const label = normalizeLabel($(el).find('.label').text().trim());
    const value = toInt($(el).find('.value').text());
    const key = LABEL_MAP[label];

    if (key) {
      stats[key] = value;
    }
  });

  // Fallback parsing when `.statistic` blocks are unavailable.
  if (!Object.values(stats).some(Boolean)) {
    const text = $.text();
    const fallbackRegex = /(CODE\s*TRACKS?|DAILY\s*CHALLENGE|\bDC\b|DAILY\s*TEST|\bDT\b|CODE\s*TESTS?|CODE\s*TUTOR)\D*([\d,]+)/gi;

    for (const match of text.matchAll(fallbackRegex)) {
      const key = LABEL_MAP[normalizeLabel(match[1])];
      if (key) {
        stats[key] = toInt(match[2]);
      }
    }
  }

  return stats;
}

function serializeStudent(student) {
  const field = (value) => JSON.stringify(value ?? '');

  return `  { collegeId: ${field(student.collegeId)}, name: ${field(student.name)}, username: ${field(student.username)}, skillrackUrl: ${field(student.skillrackUrl)}, codeTutor: ${toInt(student.codeTutor)}, codeTracks: ${toInt(student.codeTracks)}, dailyChallenge: ${toInt(student.dailyChallenge)}, dailyTest: ${toInt(student.dailyTest)}, codeTests: ${toInt(student.codeTests)}, skillrackPoints: ${toInt(student.skillrackPoints)} }`;
}

async function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function scrapeAll() {
  const filePath = path.join(__dirname, '..', 'src', 'data', 'sampleData.js');
  const publicDataPath = path.join(__dirname, '..', 'public', 'skillrack-data.json');

  const content = fs.readFileSync(filePath, 'utf8');
  const studentsRegex = /export const students =\s*\[([\s\S]*?)\];/;
  const match = content.match(studentsRegex);

  if (!match) {
    throw new Error('Could not find students array in sampleData.js');
  }

  const parseStudents = new Function(`return [${match[1]}];`);
  const students = parseStudents();

  console.log(`Found ${students.length} students. Starting SkillRack sync...`);

  for (let i = 0; i < students.length; i += 1) {
    const student = students[i];

    if (!isValidProfileUrl(student.skillrackUrl)) {
      console.log(`[${i + 1}/${students.length}] Skipped ${student.name} (invalid or non-profile URL)`);
      continue;
    }

    try {
      const response = await axios.get(student.skillrackUrl, {
        timeout: REQUEST_TIMEOUT_MS,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36',
          Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9'
        }
      });

      const stats = extractStats(response.data);
      student.codeTutor = stats.codeTutor;
      student.codeTracks = stats.codeTracks;
      student.dailyChallenge = stats.dailyChallenge;
      student.dailyTest = stats.dailyTest;
      student.codeTests = stats.codeTests;
      student.skillrackPoints = calculatePoints(stats);

      console.log(
        `[${i + 1}/${students.length}] ${student.name} -> Tracks: ${student.codeTracks}, DC: ${student.dailyChallenge}, DT: ${student.dailyTest}, Tests: ${student.codeTests}, Points: ${student.skillrackPoints}`
      );
    } catch (error) {
      console.warn(`[${i + 1}/${students.length}] Failed for ${student.name}: ${error.message}`);
    }

    await delay(REQUEST_DELAY_MS);
  }

  const formattedStudents = students.map(serializeStudent).join(',\n');
  const nextContent = content.replace(studentsRegex, `export const students = [\n${formattedStudents}\n];`);

  fs.writeFileSync(filePath, nextContent, 'utf8');
  fs.writeFileSync(publicDataPath, `${JSON.stringify(students, null, 2)}\n`, 'utf8');

  console.log('Updated src/data/sampleData.js and public/skillrack-data.json');
}

scrapeAll().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});

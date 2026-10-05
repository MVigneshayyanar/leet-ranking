const fs = require('fs');
const path = require('path');
const axios = require('axios');
const cheerio = require('cheerio');

const SAMPLE_DATA_PATH = path.join(__dirname, '..', 'src', 'data', 'sampleData.js');
const PUBLIC_DATA_PATH = path.join(__dirname, '..', 'public', 'skillrack-data.json');

const LABEL_MAP = {
  'PROGRAMS SOLVED': 'programsSolved',
  'CODE TEST': 'codeTests',
  'CODE TRACK': 'codeTracks',
  DC: 'dailyChallenge',
  DT: 'dailyTest',
  'CODE TUTOR': 'codeTutor'
};

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function parseStudentsFromFile(content) {
  const studentsRegex = /export const students =\s*\[([\s\S]*?)\];/;
  const match = content.match(studentsRegex);

  if (!match) {
    throw new Error('Could not find students array in sampleData.js');
  }

  const parseStudents = new Function(`return [${match[1]}];`);
  return { students: parseStudents(), studentsRegex };
}

function calculatePoints(stats) {
  return ((stats.codeTracks || 0) * 2)
    + ((stats.dailyChallenge || 0) * 2)
    + ((stats.dailyTest || 0) * 20)
    + ((stats.codeTests || 0) * 30);
}

function formatStudents(students) {
  return students
    .map(
      (s) =>
        `  { collegeId: "${s.collegeId || ''}", name: "${s.name}", username: "${s.username}", skillrackUrl: "${s.skillrackUrl || ''}", codeTutor: ${s.codeTutor || 0}, codeTracks: ${s.codeTracks || 0}, dailyChallenge: ${s.dailyChallenge || 0}, dailyTest: ${s.dailyTest || 0}, codeTests: ${s.codeTests || 0}, skillrackPoints: ${s.skillrackPoints || 0} }`
    )
    .join(',\n');
}

async function scrapeStudent(skillrackUrl) {
  const response = await axios.get(skillrackUrl, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36',
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
      Referer: 'https://www.google.com/',
      Connection: 'keep-alive'
    },
    timeout: 10000
  });

  const $ = cheerio.load(response.data);
  const stats = {};

  $('.statistic').each((_, el) => {
    const value = $(el).find('.value').text().trim();
    const label = $(el).find('.label').text().trim();
    const key = LABEL_MAP[label];
    if (key) {
      stats[key] = parseInt(value.replace(/,/g, ''), 10) || 0;
    }
  });

  return stats;
}

async function scrapeAll() {
  const content = fs.readFileSync(SAMPLE_DATA_PATH, 'utf8');
  const { students, studentsRegex } = parseStudentsFromFile(content);
  const updatedStudents = [...students];

  console.log(`Found ${updatedStudents.length} students. Starting SkillRack scrape...`);

  for (let i = 0; i < updatedStudents.length; i += 1) {
    const student = updatedStudents[i];
    const hasValidUrl = student.skillrackUrl
      && (student.skillrackUrl.includes('profile') || student.skillrackUrl.includes('resume'));

    if (!hasValidUrl) {
      console.log(`[${i + 1}/${updatedStudents.length}] Skipped ${student.name} (No valid profile URL)`);
      continue;
    }

    try {
      const stats = await scrapeStudent(student.skillrackUrl);
      const points = calculatePoints(stats);

      student.codeTutor = stats.codeTutor || 0;
      student.codeTracks = stats.codeTracks || 0;
      student.dailyChallenge = stats.dailyChallenge || 0;
      student.dailyTest = stats.dailyTest || 0;
      student.codeTests = stats.codeTests || 0;
      student.skillrackPoints = points;

      console.log(
        `[${i + 1}/${updatedStudents.length}] ${student.name} => Tracks: ${student.codeTracks}, DC: ${student.dailyChallenge}, DT: ${student.dailyTest}, Tests: ${student.codeTests}, Points: ${points}`
      );
    } catch (error) {
      console.warn(`[${i + 1}/${updatedStudents.length}] Failed to scrape ${student.name}: ${error.message}`);
    }

    await wait(80);
  }

  const formattedStudents = formatStudents(updatedStudents);
  const updatedContent = content.replace(studentsRegex, `export const students = [\n${formattedStudents}\n];`);
  fs.writeFileSync(SAMPLE_DATA_PATH, updatedContent, 'utf8');
  console.log('Updated src/data/sampleData.js');

  if (!fs.existsSync(path.dirname(PUBLIC_DATA_PATH))) {
    fs.mkdirSync(path.dirname(PUBLIC_DATA_PATH), { recursive: true });
  }

  const payload = {
    lastUpdated: new Date().toISOString(),
    students: updatedStudents
  };

  fs.writeFileSync(PUBLIC_DATA_PATH, JSON.stringify(payload, null, 2), 'utf8');
  console.log('Updated public/skillrack-data.json');
}

scrapeAll().catch((error) => {
  console.error(error);
  process.exit(1);
});

const fs = require('fs');
const path = require('path');
const axios = require('axios');
const cheerio = require('cheerio');

async function scrapeAll() {
  const filePath = path.join(__dirname, '..', 'src', 'data', 'sampleData.js');
  const publicDataPath = path.join(__dirname, '..', 'public', 'skillrack-data.json');

  const content = fs.readFileSync(filePath, 'utf8');
  const studentsRegex = /export const students = \s*\[([\s\S]*?)\];/;
  const match = content.match(studentsRegex);
  if (!match) {
    console.error('Could not find students array in sampleData.js');
    process.exit(1);
  }

  // Parse students using Function
  const parseStudents = new Function(`return [${match[1]}];`);
  const students = parseStudents();
  console.log(`Found ${students.length} students. Starting live SkillRack scrape...`);

  const updatedStudents = [...students];

  for (let i = 0; i < updatedStudents.length; i++) {
    const s = updatedStudents[i];
    if (!s.skillrackUrl || (!s.skillrackUrl.includes('profile') && !s.skillrackUrl.includes('resume'))) {
      console.log(`[${i + 1}/${updatedStudents.length}] Skipped ${s.name} (No valid profile URL)`);
      continue;
    }

    try {
      const response = await axios.get(s.skillrackUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9'
        },
        timeout: 10000
      });

      const $ = cheerio.load(response.data);
      const labelMap = {
        'PROGRAMS SOLVED': 'programsSolved',
        'CODE TEST': 'codeTests',
        'CODE TRACK': 'codeTracks',
        'DC': 'dailyChallenge',
        'DT': 'dailyTest',
        'CODE TUTOR': 'codeTutor'
      };

      const stats = {};
      $('.statistic').each((_, el) => {
        const val = $(el).find('.value').text().trim();
        const lab = $(el).find('.label').text().trim();
        if (labelMap[lab]) {
          stats[labelMap[lab]] = parseInt(val.replace(/,/g, '')) || 0;
        }
      });

      const points = ((stats.codeTracks || 0) * 2) + 
                     ((stats.dailyChallenge || 0) * 2) + 
                     ((stats.dailyTest || 0) * 20) + 
                     ((stats.codeTests || 0) * 30);

      s.codeTutor = stats.codeTutor || 0;
      s.codeTracks = stats.codeTracks || 0;
      s.dailyChallenge = stats.dailyChallenge || 0;
      s.dailyTest = stats.dailyTest || 0;
      s.codeTests = stats.codeTests || 0;
      s.skillrackPoints = points;

      console.log(`[${i + 1}/${updatedStudents.length}] ${s.name} => Tracks: ${s.codeTracks}, DC: ${s.dailyChallenge}, DT: ${s.dailyTest}, Tests: ${s.codeTests}, Points: ${points}`);
    } catch (err) {
      console.warn(`[${i + 1}/${updatedStudents.length}] Failed to scrape ${s.name}:`, err.message);
    }

    // Small delay to be polite
    await new Promise(r => setTimeout(r, 80));
  }

  // Format updated students array back into sampleData.js
  const formatted = updatedStudents.map(s => 
    `  { collegeId: "${s.collegeId || ''}", name: "${s.name}", username: "${s.username}", skillrackUrl: "${s.skillrackUrl || ''}", codeTutor: ${s.codeTutor || 0}, codeTracks: ${s.codeTracks || 0}, dailyChallenge: ${s.dailyChallenge || 0}, dailyTest: ${s.dailyTest || 0}, codeTests: ${s.codeTests || 0}, skillrackPoints: ${s.skillrackPoints || 0} }`
  ).join(',\n');

  const newContent = content.replace(studentsRegex, `export const students = [\n${formatted}\n];`);
  fs.writeFileSync(filePath, newContent, 'utf8');
  console.log('Successfully updated src/data/sampleData.js with live SkillRack data!');

  // Also write public/skillrack-data.json for Netlify CDN hosting
  if (!fs.existsSync(path.dirname(publicDataPath))) {
    fs.mkdirSync(path.dirname(publicDataPath), { recursive: true });
  }
  fs.writeFileSync(publicDataPath, JSON.stringify(updatedStudents, null, 2), 'utf8');
  console.log('Successfully wrote public/skillrack-data.json for CDN hosting!');
}

scrapeAll().catch(console.error);

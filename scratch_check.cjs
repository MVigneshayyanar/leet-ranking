const axios = require('axios');
const cheerio = require('cheerio');

async function test() {
  const url = 'https://www.skillrack.com/faces/resume.xhtml?id=442563&key=4a3afc5dac8cb23ffab166f7b9da4c72678010fb';
  const res = await axios.get(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' } });
  const $ = cheerio.load(res.data);
  console.log('Statistics count:', $('.statistic').length);
  $('.statistic').each((i, el) => {
    console.log($(el).find('.label').text().trim(), ':', $(el).find('.value').text().trim());
  });

  const stats = {};
  const labelMap = {
    'PROGRAMS SOLVED': 'programsSolved',
    'CODE TEST': 'codeTests',
    'CODE TRACK': 'codeTracks',
    'DC': 'dailyChallenge',
    'DT': 'dailyTest',
    'CODE TUTOR': 'codeTutor'
  };

  $('.statistic').each((i, el) => {
    const val = $(el).find('.value').text().trim();
    const lab = $(el).find('.label').text().trim();
    if (labelMap[lab]) {
      stats[labelMap[lab]] = parseInt(val.replace(/,/g, '')) || 0;
    }
  });

  console.log('Parsed stats:', stats);

  // Also check profile URL:
  const profileUrl = 'http://www.skillrack.com/profile/442563/4a3afc5dac8cb23ffab166f7b9da4c72678010fb';
  try {
    const resProfile = await axios.get(profileUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    const $p = cheerio.load(resProfile.data);
    console.log('Profile statistics count:', $p('.statistic').length);
  } catch (e) {
    console.log('Profile URL error:', e.message);
  }
}

test().catch(e => console.error(e));

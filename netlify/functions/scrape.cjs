const axios = require('axios');
const cheerio = require('cheerio');

exports.handler = async (event) => {
  // Support CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'GET, OPTIONS'
      },
      body: ''
    };
  }

  let profileUrl = event.queryStringParameters?.url;
  if (profileUrl && event.queryStringParameters?.key && !profileUrl.includes('key=')) {
    profileUrl += `&key=${event.queryStringParameters.key}`;
  }

  if (!profileUrl) {
    return {
      statusCode: 400,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({ error: 'URL is required' })
    };
  }

  try {
    const response = await axios.get(profileUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9'
      },
      timeout: 10000
    });

    const $ = cheerio.load(response.data);
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

    const points = ((stats.codeTracks || 0) * 2) + 
                   ((stats.dailyChallenge || 0) * 2) + 
                   ((stats.dailyTest || 0) * 20) + 
                   ((stats.codeTests || 0) * 30);
    stats.skillrackPoints = points;

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type'
      },
      body: JSON.stringify(stats)
    };
  } catch (error) {
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({ error: 'Failed to scrape profile', message: error.message })
    };
  }
};

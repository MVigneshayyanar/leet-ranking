import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import axios from 'axios';
import * as cheerio from 'cheerio';
import fs from 'fs';
import path from 'path';

function skillrackDevPlugin() {
  return {
    name: 'skillrack-dev-middleware',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const urlObj = new URL(req.url, 'http://localhost');
        
        // Handle /api/skillrack/scrape or /scrape
        if (urlObj.pathname === '/api/skillrack/scrape' || urlObj.pathname === '/scrape') {
          const profileUrl = urlObj.searchParams.get('url');
          if (!profileUrl) {
            res.statusCode = 400;
            res.setHeader('Content-Type', 'application/json');
            return res.end(JSON.stringify({ error: 'URL is required' }));
          }

          try {
            const response = await axios.get(profileUrl, {
              headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
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
              const value = $(el).find('.value').text().trim();
              const label = $(el).find('.label').text().trim();
              if (labelMap[label]) {
                stats[labelMap[label]] = parseInt(value.replace(/,/g, '')) || 0;
              }
            });

            const points = ((stats.codeTracks || 0) * 2) + 
                           ((stats.dailyChallenge || 0) * 2) + 
                           ((stats.dailyTest || 0) * 20) + 
                           ((stats.codeTests || 0) * 30);
            stats.skillrackPoints = points;

            res.setHeader('Content-Type', 'application/json');
            return res.end(JSON.stringify(stats));
          } catch (err) {
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            return res.end(JSON.stringify({ error: 'Failed to scrape profile', message: err.message }));
          }
        }

        // Handle /api/skillrack/update-students or /update-students
        if ((urlObj.pathname === '/api/skillrack/update-students' || urlObj.pathname === '/update-students') && req.method === 'POST') {
          let body = '';
          req.on('data', chunk => { body += chunk; });
          req.on('end', () => {
            try {
              const { students: updatedStudents } = JSON.parse(body);
              if (!updatedStudents) {
                res.statusCode = 400;
                res.setHeader('Content-Type', 'application/json');
                return res.end(JSON.stringify({ error: 'Students data is required' }));
              }

              const filePath = path.join(process.cwd(), 'src', 'data', 'sampleData.js');
              let content = fs.readFileSync(filePath, 'utf8');

              const studentsRegex = /export const students = \s*\[([\s\S]*?)\];/;
              const formattedStudents = updatedStudents.map(s => 
                `  { collegeId: "${s.collegeId || ''}", name: "${s.name}", username: "${s.username}", skillrackUrl: "${s.skillrackUrl || ''}", codeTutor: ${s.codeTutor || 0}, codeTracks: ${s.codeTracks || 0}, dailyChallenge: ${s.dailyChallenge || 0}, dailyTest: ${s.dailyTest || 0}, codeTests: ${s.codeTests || 0}, skillrackPoints: ${s.skillrackPoints || 0} }`
              ).join(',\n');

              const newContent = content.replace(studentsRegex, `export const students = [\n${formattedStudents}\n];`);
              fs.writeFileSync(filePath, newContent);

              res.setHeader('Content-Type', 'application/json');
              return res.end(JSON.stringify({ success: true, message: 'Data saved to sampleData.js' }));
            } catch (err) {
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              return res.end(JSON.stringify({ error: 'Failed to update sampleData.js', message: err.message }));
            }
          });
          return;
        }

        next();
      });
    }
  };
}

export default defineConfig({
  plugins: [react(), skillrackDevPlugin()],
});

const express = require('express');
const cors = require('cors');
const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 5001;

app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Scrape student profile
app.get('/scrape', async (req, res) => {
    const { url } = req.query;
    if (!url) return res.status(400).json({ error: 'URL is required' });

    try {
        const response = await axios.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            },
            timeout: 10000
        });

        const $ = cheerio.load(response.data);
        const stats = {};

        // Mapping labels to keys
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

        // Calculate Guru Points
        const points = ((stats.codeTracks || 0) * 2) + 
                       ((stats.dailyChallenge || 0) * 2) + 
                       ((stats.dailyTest || 0) * 20) + 
                       ((stats.codeTests || 0) * 30);
        
        stats.skillrackPoints = points;

        console.log(`✅ Scraped: codeTracks=${stats.codeTracks || 0}, DC=${stats.dailyChallenge || 0}, DT=${stats.dailyTest || 0}, Tests=${stats.codeTests || 0}, Tutor=${stats.codeTutor || 0} => Points=${points}`);
        res.json(stats);
    } catch (error) {
        console.error(`Scraping error for ${url}:`, error.message);
        res.status(500).json({ error: 'Failed to scrape profile' });
    }
});

// Update sampleData.js with new student metrics
app.post('/update-students', (req, res) => {
    const { students: updatedStudents } = req.body;
    if (!updatedStudents) return res.status(400).json({ error: 'Students data is required' });

    try {
        const filePath = path.join(process.cwd(), 'src', 'data', 'sampleData.js');
        let content = fs.readFileSync(filePath, 'utf8');

        // Extract the existing students array to replace its contents
        const studentsRegex = /export const students = \s*\[([\s\S]*?)\];/;
        const match = content.match(studentsRegex);

        if (match) {
            // Transform the array of student objects back into a string
            const formattedStudents = updatedStudents.map(s => 
                `  { collegeId: "${s.collegeId || ''}", name: "${s.name}", username: "${s.username}", skillrackUrl: "${s.skillrackUrl || ''}", codeTutor: ${s.codeTutor || 0}, codeTracks: ${s.codeTracks || 0}, dailyChallenge: ${s.dailyChallenge || 0}, dailyTest: ${s.dailyTest || 0}, codeTests: ${s.codeTests || 0}, skillrackPoints: ${s.skillrackPoints || 0} }`
            ).join(',\n');

            const newContent = content.replace(studentsRegex, `export const students = [\n${formattedStudents}\n];`);
            fs.writeFileSync(filePath, newContent);
            res.json({ success: true, message: 'Data saved to sampleData.js' });
        } else {
            res.status(500).json({ error: 'Could not find students array in sampleData.js' });
        }
    } catch (error) {
        console.error('File update error:', error.message);
        res.status(500).json({ error: 'Failed to update sampleData.js' });
    }
});

app.listen(PORT, () => {
    console.log(`SkillRack Proxy running on http://localhost:${PORT}`);
});

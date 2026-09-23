const fs = require('fs');
const path = require('path');
const axios = require('axios');
const cheerio = require('cheerio');

const rawStudents = [
  {
    name: "Abinaya G",
    email: "ag4073170@gmail.com",
    collegeId: "SEC23CJ056", // Or derived from email / default
    username: "abinayagopalakrishnan",
    skillrackUrl: "http://www.skillrack.com/profile/442532/d84af030848bc909479ecf331458ca0d29cb0fe7"
  },
  {
    name: "Abul Hussain A",
    email: "sec23cj052@sairamtap.edu.in",
    collegeId: "SEC23CJ052",
    username: "Abul_Hussain_A",
    skillrackUrl: "http://www.skillrack.com/profile/442523/09d2654cd2ceef044fa90e7a3b9c55ef42a9fbb5"
  },
  {
    name: "BALAJI R",
    email: "sec23cj058@sairamtap.edu.in",
    collegeId: "SEC23CJ058",
    username: "Balaji2123",
    skillrackUrl: "https://www.skillrack.com/faces/resume.xhtml?id=442573&key=5e698a772b3098db08144c110736e031c6708ce4"
  },
  {
    name: "Bhuvan S",
    email: "sec23cj039@sairamtap.edu.in",
    collegeId: "SEC23CJ039",
    username: "n8SRk2xrw9",
    skillrackUrl: "http://www.skillrack.com/profile/442546/5b6adf7210c193c3e6b228409793b80f195ecdf4"
  },
  {
    name: "Dharaneshwaran R",
    email: "sec23cj019@sairamtap.edu.in",
    collegeId: "SEC23CJ019",
    username: "Dharanesh29",
    skillrackUrl: "http://www.skillrack.com/profile/442569/c146db6e370b413129ab490bbe6a5e378639b19"
  },
  {
    name: "Gopika S",
    email: "sec23cj043@sairamtap.edu.in",
    collegeId: "SEC23CJ043",
    username: "GOPIKA646",
    skillrackUrl: "http://www.skillrack.com/profile/442536/e02d784c5b148eb1a0d725f5aceb024252a911f1"
  },
  {
    name: "H.JANARTHANAN",
    email: "sec23cj040@sairamtap.edu.in",
    collegeId: "SEC23CJ040",
    username: "JANARTHANAN_H",
    skillrackUrl: "http://www.skillrack.com/profile/442543/02addda728f51c47d7231d73e67658309baab1b6"
  },
  {
    name: "Harini.R",
    email: "sec23cj018@sairamtap.edu.in",
    collegeId: "SEC23CJ018",
    username: "harini_harini",
    skillrackUrl: "http://www.skillrack.com/profile/442562/198749e353fe1e318bbbdfa781633483fbf7a3d5"
  },
  {
    name: "HARISH G",
    email: "sec23cj054@sairamtap.edu.in",
    collegeId: "SEC23CJ054",
    username: "HARISH_G007",
    skillrackUrl: "http://www.skillrack.com/profile/442525/b86225783aa60a5001754dfe1eb261cbaa6fe6b9"
  },
  {
    name: "Jayaganth J",
    email: "sec23cj031@sairamtap.edu.in",
    collegeId: "SEC23CJ031",
    username: "jayaganth_7",
    skillrackUrl: "http://www.skillrack.com/profile/442553/5dfb2893797e8c5e2275077437ddb70c8c6ff92f"
  },
  {
    name: "Karthik Jayaram S K",
    email: "sec23cj004@sairamtap.edu.in",
    collegeId: "SEC23CJ004",
    username: "karthik_jayaram_sk",
    skillrackUrl: "http://www.skillrack.com/profile/442538/490af4e3c77e891cd7bece58e37608bed92d63b7"
  },
  {
    name: "Kavin Kannan K",
    email: "sec23cj012@sairamtap.edu.in",
    collegeId: "SEC23CJ012",
    username: "aiku4",
    skillrackUrl: "http://www.skillrack.com/profile/442564/e03a27b4b4946709b17995cd44d24a764a1f37d9"
  },
  {
    name: "KAVIYA K",
    email: "sec23cj027@sairamtap.edu.in",
    collegeId: "SEC23CJ027",
    username: "kaviya_3467",
    skillrackUrl: "https://www.skillrack.com/profile/442560/6df6320c0d3d9326ec296a2fca2712b3f6033908"
  },
  {
    name: "Kaviya Priya V",
    email: "sec23cj028@sairamtap.edu.in",
    collegeId: "SEC23CJ028",
    username: "kaviyapriya_v",
    skillrackUrl: "http://www.skillrack.com/profile/442554/a89d41f0eab39b57e3ea1af4272be4846b6c2720"
  },
  {
    name: "Kavyadharshini S M",
    email: "sec23cj061@sairamtap.edu.in",
    collegeId: "SEC23CJ061",
    username: "Kavyadharshini-S-M",
    skillrackUrl: "http://www.skillrack.com/profile/442575/3cf126d9412efa6e7f443ae585d6db0fbf8320c8"
  },
  {
    name: "Madhumithaa R M",
    email: "sec23cj025@sairamtap.edu.in",
    collegeId: "SEC23CJ025",
    username: "Madhumithaa_RM7",
    skillrackUrl: "http://www.skillrack.com/profile/442559/f4e2a905395c18fa167d9c43343025190ce06b20"
  },
  {
    name: "Maga M",
    email: "sec23cj026@sairamtap.edu.in",
    collegeId: "SEC23CJ026",
    username: "Maga_M",
    skillrackUrl: "http://www.skillrack.com/profile/442556/dc50447f017d839d9d09f451ef9d55e5cba0813b"
  },
  {
    name: "Manoj Kumar R",
    email: "sec23cj035@sairamtap.edu.in",
    collegeId: "SEC23CJ035",
    username: "HbinzzV7VQ",
    skillrackUrl: "http://www.skillrack.com/profile/442549/03bc6f3392bed28ebf9cffeac9f452dc76b271ed"
  },
  {
    name: "Mathew Emmanuel A",
    email: "sec23cj016@sairamtap.edu.in",
    collegeId: "SEC23CJ016",
    username: "mathewEmmanuel",
    skillrackUrl: "http://www.skillrack.com/profile/442567/15a961de57b754d0d32bfc4a39c59825c4fe1272"
  },
  {
    name: "MICHAEL ROHIN D A",
    email: "sec23cj029@sairamtap.edu.in",
    collegeId: "SEC23CJ029",
    username: "Rohin_2125",
    skillrackUrl: "http://www.skillrack.com/profile/442555/bba9c838e77557b1ab309e66c2a682ad35ecf9f8"
  },
  {
    name: "Mugilan A",
    email: "sec23cj042@sairamtap.edu.in",
    collegeId: "SEC23CJ042",
    username: "sec23cj042",
    skillrackUrl: "http://www.skillrack.com/profile/442535/bee68db41c579cb1774bbe19019278f78d8545d5"
  },
  {
    name: "NAVEEN S",
    email: "sec1r23cj1@sairamtap.edu.in",
    collegeId: "SEC1R23CJ1",
    username: "naveensasikumar1503",
    skillrackUrl: "http://www.skillrack.com/profile/404204/2d23d650b4094b9b25f25ca27c17b18971d712a4"
  },
  {
    name: "NIRANJANA J",
    email: "sec23cj006@sairamtap.edu.in",
    collegeId: "SEC23CJ006",
    username: "Nira_26",
    skillrackUrl: "http://www.skillrack.com/profile/442516/9307651ff3371fb39c5760e4192969cb6aad2e2d"
  },
  {
    name: "Nithya varshini A",
    email: "sec23cj053@sairamtap.edu.in",
    collegeId: "SEC23CJ053",
    username: "nithyavarshini_A",
    skillrackUrl: "http://www.skillrack.com/profile/442524/70d655f18e25ebea8b0e4e5a867f47b32202eba9"
  },
  {
    name: "Phargavi S",
    email: "sec23cj038@sairamtap.edu.in",
    collegeId: "SEC23CJ038",
    username: "Phargavi_S",
    skillrackUrl: "http://www.skillrack.com/profile/442545/71e9f54794e55df5aca21798dd231beda2e12491"
  },
  {
    name: "Pon.S.Leela Percy",
    email: "sec23cj041@sairamtap.edu.in",
    collegeId: "SEC23CJ041",
    username: "LeelaPercy",
    skillrackUrl: "http://www.skillrack.com/profile/442534/217674e3be4881bfc2fd2518efa43a7bfa32752b"
  },
  {
    name: "Poojasree S",
    email: "sec23cj032@sairamtap.edu.in",
    collegeId: "SEC23CJ032",
    username: "Poojasree_S12",
    skillrackUrl: "http://www.skillrack.com/profile/442551/8d2cbc98b6b7770c5ac642c49feff76766f4ce3e"
  },
  {
    name: "Rajalakshmi.R",
    email: "sec23cj001@sairamtap.edu.in",
    collegeId: "SEC23CJ001",
    username: "Rajalakshmi_25",
    skillrackUrl: "http://www.skillrack.com/profile/442540/d289a325619c340f599ffb1c5b298a0242550f0f"
  },
  {
    name: "Reshma N",
    email: "sec23cj014@sairamtap.edu.in",
    collegeId: "SEC23CJ014",
    username: "Resh_03",
    skillrackUrl: "http://www.skillrack.com/profile/442565/0efe43e148e090e072212980f7bd23bf5f2834d2"
  },
  {
    name: "S Mridula",
    email: "sec23cj034@sairamtap.edu.in",
    collegeId: "SEC23CJ034",
    username: "s_mridula",
    skillrackUrl: "http://www.skillrack.com/profile/442548/65d42db217e131759edda597bca4482a2cea7bd4"
  },
  {
    name: "Saai Shrindhi S V",
    email: "sec23cj021@sairamtap.edu.in",
    collegeId: "SEC23CJ021",
    username: "saai_shrinidhi_s_v",
    skillrackUrl: "https://www.skillrack.com/profile/442570/0fcd5689200c908c975133067290d2c2e08eca69"
  },
  {
    name: "Saivarsha A",
    email: "sec23cj059@sairamtap.edu.in",
    collegeId: "SEC23CJ059",
    username: "Saivarsha_A",
    skillrackUrl: "https://www.skillrack.com/profile/442572/4ee4958bb923c83ec4e83f0986a8795a45167fc9"
  },
  {
    name: "SANDHIYA R",
    email: "sec23cj046@sairamtap.edu.in",
    collegeId: "SEC23CJ046",
    username: "sandhiyarajesh",
    skillrackUrl: "http://www.skillrack.com/profile/442528/2adcafc8a2fadc29613c774c57429ae1414b8b94"
  },
  {
    name: "SANJAY S",
    email: "sanjayraj19.2005@gmail.com",
    collegeId: "SEC23CJ015",
    username: "mdSE3YJBKr",
    skillrackUrl: "http://www.skillrack.com/profile/442531/91e6affe8ebfedd9b6c2d7d35f7a1763ccee5de9"
  },
  {
    name: "SARAVANAN S",
    email: "sec23cj007@sairamtap.edu.in",
    collegeId: "SEC23CJ007",
    username: "saravanankumaresan",
    skillrackUrl: "https://www.skillrack.com/faces/resume.xhtml?id=442521&key=006e1305fb07c4c7ffec711cd288d8dbb7f02227"
  },
  {
    name: "Satheeswari R",
    email: "sec23cj005@sairamtap.edu.in",
    collegeId: "SEC23CJ005",
    username: "Satheeswari_",
    skillrackUrl: "http://www.skillrack.com/profile/442542/687dcdb4964edd0e612cfea100f77d60f8cd489e"
  },
  {
    name: "Selvapriya S",
    email: "sec23cj008@sairamtap.edu.in",
    collegeId: "SEC23CJ008",
    username: "selvapriya2104",
    skillrackUrl: "https://skillrack.com/faces/candidate/manageprofile.xhtml"
  },
  {
    name: "Shakthi Akshata G",
    email: "sec23cj033@sairamtap.edu.in",
    collegeId: "SEC23CJ033",
    username: "0VdnSCNwLZ",
    skillrackUrl: "http://www.skillrack.com/profile/442547/1866cd8e27acff1fdad7ed7ceec379ceabd586ca"
  },
  {
    name: "Sk NITHISH",
    email: "sec23cj047@sairamtap.edu.in",
    collegeId: "SEC23CJ047",
    username: "nithish_sk",
    skillrackUrl: "http://www.skillrack.com/profile/442529/da07a46f802367e620877b66395ce0b336af9fe1"
  },
  {
    name: "SOWMIYA R",
    email: "sec23cj055@sairamtap.edu.in",
    collegeId: "SEC23CJ055",
    username: "Sow_miya_r",
    skillrackUrl: "https://skillrack.com/faces/candidate/manageprofile.xhtml"
  },
  {
    name: "SRIRAM M",
    email: "sec23cj045@sairamtap.edu.in",
    collegeId: "SEC23CJ045",
    username: "dragoon123",
    skillrackUrl: "http://www.skillrack.com/profile/442533/6d00e814eb7b717e57462a52d8929eaa7337c8b4"
  },
  {
    name: "SUJAN P",
    email: "sec23cj020@sairamtap.edu.in",
    collegeId: "SEC23CJ020",
    username: "S_U_J_A_N",
    skillrackUrl: "http://www.skillrack.com/profile/442568/d1725f74045b44673d55fd4d357a072b0d132397"
  },
  {
    name: "THARANI.P",
    email: "sec23cj036@sairamtap.edu.in",
    collegeId: "SEC23CJ036",
    username: "tharani_2101",
    skillrackUrl: "http://www.skillrack.com/profile/442550/b91b7766d491555a201aa115a71daf12d39d497e"
  },
  {
    name: "Udheshkumar C",
    email: "sec23cj002@sairamtap.edu.in",
    collegeId: "SEC23CJ002",
    username: "Udheshkumar1536",
    skillrackUrl: "http://www.skillrack.com/profile/442541/fd04671abe864ed8511bb2b05bb1f104aadc20d8"
  },
  {
    name: "UGAPRIYA S",
    email: "sec23cj044@sairamtap.edu.in",
    collegeId: "SEC23CJ044",
    username: "ugapriya",
    skillrackUrl: "http://www.skillrack.com/profile/442537/e7cee408b3b6e7f8ab739908488fd9ec92d50888"
  },
  {
    name: "VASANTHAN M",
    email: "sec23cj048@sairamtap.edu.in",
    collegeId: "SEC23CJ048",
    username: "Vasanthan__7",
    skillrackUrl: "http://www.skillrack.com/profile/442527/cf26ff6f3e5cd2906e546201e006890b2229bb22"
  },
  {
    name: "Vidula.G",
    email: "sec23cj024@sairamtap.edu.in",
    collegeId: "SEC23CJ024",
    username: "VIDULA666",
    skillrackUrl: "http://www.skillrack.com/profile/442558/86c5d226539adcb010668b443ba642c6bdca69d3"
  },
  {
    name: "VIGNESH S",
    email: "sec23cj003@sairamtap.edu.in",
    collegeId: "SEC23CJ003",
    username: "OiS37olExO",
    skillrackUrl: "http://www.skillrack.com/profile/442539/982da11f1425a9e683432d67d23f41fe00971f2a"
  },
  {
    name: "VIGNESHAYYANAR M",
    email: "sec23cj013@sairamtap.edu.in",
    collegeId: "SEC23CJ013",
    username: "vigneshinr",
    skillrackUrl: "http://www.skillrack.com/profile/442563/4a3afc5dac8cb23ffab166f7b9da4c72678010fb"
  },
  {
    name: "yuvashakthi",
    email: "sec23cj022@sairamtap.edu.in",
    collegeId: "SEC23CJ022",
    username: "yuva_shakthi",
    skillrackUrl: "http://www.skillrack.com/profile/442571/77c13212f1d71de50dd3ac1a66e942fb55428424"
  },
  {
    name: "Jebastin preethi J",
    email: "sec23cj057@sairamtap.edu.in",
    collegeId: "SEC23CJ057",
    username: "Jebastin_preethi",
    skillrackUrl: "https://skillrack.com/faces/ui/profile.xhtml"
  },
  {
    name: "Pooja@Poonkodi",
    email: "sec23cj050@sairamtap.edu.in",
    collegeId: "SEC23CJ050",
    username: "poojapoonkodi",
    skillrackUrl: "http://www.skillrack.com/profile/442530/b5874905deceac3cbfa09570d7e71fa01b310386"
  },
  {
    name: "SHREEHARSHINI VK",
    email: "sec23cj023@sairamtap.edu.in",
    collegeId: "SEC23CJ023",
    username: "SHREEHARSHINIvk",
    skillrackUrl: "http://www.skillrack.com/profile/442557/4caac7181c763878a0d006e296a5e70ab6238b57"
  },
  {
    name: "Bhuvanesh M",
    email: "sec23cj010@sairamtap.edu.in",
    collegeId: "SEC23CJ010",
    username: "dark_web11",
    skillrackUrl: "http://www.skillrack.com/profile/442517/29fc195f8fcd03707a168a3606eac699af6e4c7e"
  },
  {
    name: "Ashwin Annamalai Lena",
    email: "ashwinannamalailena@gmail.com",
    collegeId: "SEC23CJ051",
    username: "ashnova07",
    skillrackUrl: "http://www.skillrack.com/profile/442544/3182f07070c1b95e6d852e8fc13a350d4b2694a2"
  },
  {
    name: "MUPIDATHY GOWTHAM. T",
    email: "sec23cj060@sairamtap.edu.in",
    collegeId: "SEC23CJ060",
    username: "Gowtham_tf",
    skillrackUrl: "http://www.skillrack.com/profile/442576/ceb2478ab8e73838a7f08a14b83ca4083b676359"
  }
];

const labelMap = {
  'PROGRAMS SOLVED': 'programsSolved',
  'CODE TEST': 'codeTests',
  'CODE TRACK': 'codeTracks',
  'DC': 'dailyChallenge',
  'DT': 'dailyTest',
  'CODE TUTOR': 'codeTutor'
};

async function scrapeStudent(student) {
  if (!student.skillrackUrl || !student.skillrackUrl.includes('skillrack.com/profile') && !student.skillrackUrl.includes('skillrack.com/faces/resume')) {
    return {
      collegeId: student.collegeId,
      name: student.name,
      username: student.username,
      skillrackUrl: student.skillrackUrl,
      codeTutor: 0,
      codeTracks: 0,
      dailyChallenge: 0,
      dailyTest: 0,
      codeTests: 0,
      skillrackPoints: 0
    };
  }

  try {
    const res = await axios.get(student.skillrackUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
      timeout: 8000
    });
    const $ = cheerio.load(res.data);
    const stats = {};
    $('.statistic').each((i, el) => {
      const val = $(el).find('.value').text().trim();
      const lab = $(el).find('.label').text().trim();
      if (labelMap[lab]) stats[labelMap[lab]] = parseInt(val.replace(/,/g, '')) || 0;
    });

    const codeTutor = stats.codeTutor || 0;
    const codeTracks = stats.codeTracks || 0;
    const dailyChallenge = stats.dailyChallenge || 0;
    const dailyTest = stats.dailyTest || 0;
    const codeTests = stats.codeTests || 0;
    const skillrackPoints = (codeTracks * 2) + (dailyChallenge * 2) + (dailyTest * 20) + (codeTests * 30);

    return {
      collegeId: student.collegeId,
      name: student.name,
      username: student.username,
      skillrackUrl: student.skillrackUrl,
      codeTutor,
      codeTracks,
      dailyChallenge,
      dailyTest,
      codeTests,
      skillrackPoints
    };
  } catch (err) {
    console.error(`Error scraping ${student.name}: ${err.message}`);
    return {
      collegeId: student.collegeId,
      name: student.name,
      username: student.username,
      skillrackUrl: student.skillrackUrl,
      codeTutor: 0,
      codeTracks: 0,
      dailyChallenge: 0,
      dailyTest: 0,
      codeTests: 0,
      skillrackPoints: 0
    };
  }
}

async function run() {
  console.log(`Starting scrape of ${rawStudents.length} students...`);
  const results = [];
  for (let i = 0; i < rawStudents.length; i++) {
    const s = rawStudents[i];
    process.stdout.write(`[${i+1}/${rawStudents.length}] Scraping ${s.name}... `);
    const data = await scrapeStudent(s);
    console.log(`Points: ${data.skillrackPoints}`);
    results.push(data);
    await new Promise(r => setTimeout(r, 150));
  }

  // Update sampleData.js in c:\leet-ranking\src\data\sampleData.js
  const targetFile = 'c:/leet-ranking/src/data/sampleData.js';
  let content = fs.readFileSync(targetFile, 'utf8');

  // Format array
  const formatted = results.map(s => 
    `  { collegeId: "${s.collegeId}", name: "${s.name}", username: "${s.username}", skillrackUrl: "${s.skillrackUrl}", codeTutor: ${s.codeTutor}, codeTracks: ${s.codeTracks}, dailyChallenge: ${s.dailyChallenge}, dailyTest: ${s.dailyTest}, codeTests: ${s.codeTests}, skillrackPoints: ${s.skillrackPoints} }`
  ).join(',\n');

  const studentsBlock = `\n\nexport const students = [\n${formatted}\n];\n`;

  // Check if students already exported
  if (content.includes('export const students =')) {
    content = content.replace(/export const students = \s*\[[\s\S]*?\];/, `export const students = [\n${formatted}\n];`);
  } else {
    content += studentsBlock;
  }

  fs.writeFileSync(targetFile, content);
  console.log(`\nSuccessfully updated ${targetFile} with ${results.length} students!`);
}

run();

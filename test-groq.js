import { config } from 'dotenv';
config({ path: '.env' });

import { generateBriefData } from './src/services/groqService.js';

async function test() {
  try {
    const res = await generateBriefData('Intelligenza Artificiale 2026');
    console.log("SUCCESS:");
    console.log(res);
  } catch (e) {
    console.error("FAIL:");
    console.error(e);
  }
}

test();

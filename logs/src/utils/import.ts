import 'reflect-metadata';

import fs from 'fs';
import readline from 'readline';
import { Container } from 'typedi';

import { Reader } from '../Reader';

const reader = Container.get(Reader);

async function processLineByLine() {
  const fileStream = fs.createReadStream(process.argv[2]);

  const rl = readline.createInterface({
    input: fileStream,
    // crlfDelay: Infinity,
  });
  // Note: we use the crlfDelay option to recognize all instances of CR LF
  // ('\r\n') in input.txt as a single line break.

  for await (const line of rl) {
    const m = line.match(/(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d+Z)\s+(.*)$/);
    if (m) {
      const date = new Date(m[1]);
      console.log(date, m[2]);
      await reader.processLine(m[2], date);
    } else {
      console.log('***', line);
    }
  }
}

processLineByLine()
  .then(() => {
    process.exit(0);
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });

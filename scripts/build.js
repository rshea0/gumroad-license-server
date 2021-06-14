const fs = require('fs');
const path = require('path');

const env = process.env;

async function run() {
  await fs.promises.writeFile(
    path.resolve(__dirname, '../env.json'),
    JSON.stringify({
      LICENSE_PRIVATE_KEY: env.LICENSE_PRIVATE_KEY,
    }),
  );
}

run().catch(e => console.error(e));

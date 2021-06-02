import NodeRSA from 'node-rsa';

import env from '../env.json';

const LICENSE_SIG_ENCODING = 'base64';
const LICENSE_DELIMITER = '|';

export function signLicense(licenseKey: string): string {
  const privateKey = env.LICENSE_PRIVATE_KEY.replace(/_/g, '\n');
  const rsa = new NodeRSA(privateKey);
  const sig = rsa.sign(licenseKey, LICENSE_SIG_ENCODING);

  return [licenseKey, sig].join(LICENSE_DELIMITER);
}

import NodeRSA from 'node-rsa';

import env from '../env.json';
import { License } from './types';

export const LICENSE_SIG_ENCODING = 'base64';
export const LICENSE_DELIMITER = '|';

export function signLicense(
  licenseData: string | object,
): Omit<License, 'isTrial'> {
  const licenseStr =
    typeof licenseData === 'string' ? licenseData : JSON.stringify(licenseData);
  const privateKey = env.LICENSE_PRIVATE_KEY.replace(/_/g, '\n');
  const rsa = new NodeRSA(privateKey);

  return {
    data: licenseStr,
    sig: rsa.sign(licenseStr, LICENSE_SIG_ENCODING),
  };
}

export function stringifyLicense(license: License): string {
  return [license.data, license.sig].join(LICENSE_DELIMITER);
}

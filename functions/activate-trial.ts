import { Handler } from '@netlify/functions';

import { signLicense, stringifyLicense } from '../lib/sign-license';
import { License } from '../lib/types';
import { jsonResponse } from '../lib/utils';

interface Output {
  license: License;
  // LEGACY: v1.x
  signedLicense: string;
}

interface TrialLicenseData {
  isTrial: true;
  expDate: string;
}

export const handler: Handler = async event => {
  if (event.httpMethod !== 'POST') {
    return jsonResponse(405, {
      errors: 'Method not allowed',
    });
  }

  const license = createTrialLicense();

  return jsonResponse<Output>(200, {
    license,
    signedLicense: stringifyLicense(license),
  });
};

const TRIAL_DAYS = 14;

function createTrialLicense(): License {
  const expDate = new Date();
  expDate.setDate(expDate.getDate() + TRIAL_DAYS);

  const licenseData: TrialLicenseData = {
    isTrial: true,
    expDate: expDate.toISOString(),
  };

  return {
    ...signLicense(licenseData),
    isTrial: true,
  };
}

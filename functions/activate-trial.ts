import { Handler } from '@netlify/functions';

import { signLicense } from '../lib/sign-license';
import { jsonResponse } from '../lib/utils';

interface Output {
  signedLicense: string;
}

export const handler: Handler = async event => {
  if (event.httpMethod !== 'POST') {
    return jsonResponse(405, {
      errors: 'Method not allowed',
    });
  }

  return jsonResponse<Output>(200, {
    signedLicense: createTrialLicense(),
  });
};

const TRIAL_PREFIX = 'TRIAL:';
const TRIAL_DAYS = 7;

function createTrialLicense(): string {
  const expDate = new Date();
  expDate.setDate(expDate.getDate() + TRIAL_DAYS);

  const license = TRIAL_PREFIX + new Date().toISOString();

  return signLicense(license);
}

import { Handler } from '@netlify/functions';
import Ajv, { JSONSchemaType } from 'ajv';

import { PRODUCT_PERMALINKS } from '../lib/constants';
import { signLicense, stringifyLicense } from '../lib/sign-license';
import { License } from '../lib/types';
import { jsonResponse } from '../lib/utils';

interface Input {
  productId: string;
}

interface Output {
  license: License;
  // LEGACY: v1.x
  signedLicense: string;
}

interface TrialLicenseData {
  isTrial: true;
  productId: string;
  expDate: string;
}

const INPUT_SCHEMA: JSONSchemaType<Input> = {
  type: 'object',
  properties: {
    productId: { type: 'string' },
  },
  required: ['productId'],
  additionalProperties: false,
};

const validateInput = new Ajv().compile(INPUT_SCHEMA);

export const handler: Handler = async event => {
  if (event.httpMethod !== 'POST') {
    return jsonResponse(405, {
      errors: 'Method not allowed',
    });
  }
  let input;
  try {
    input = JSON.parse(event.body ?? '{}');
  } catch {
    return jsonResponse(400, {
      errors: 'Failed to parse body',
    });
  }
  if (!validateInput(input)) {
    return jsonResponse(422, {
      errors: validateInput.errors,
    });
  }

  try {
    const license = createTrialLicense(input);

    return jsonResponse<Output>(200, {
      license,
      signedLicense: stringifyLicense(license),
    });
  } catch (e) {
    return jsonResponse(400, {
      errors: e.message,
    });
  }
};

const TRIAL_DAYS = 14;

function createTrialLicense(input: Input): License {
  const permalink = PRODUCT_PERMALINKS[input.productId];
  if (!permalink) {
    throw new Error(`Invalid product id ${input.productId}`);
  }

  const expDate = new Date();
  expDate.setDate(expDate.getDate() + TRIAL_DAYS);

  const licenseData: TrialLicenseData = {
    isTrial: true,
    productId: input.productId,
    expDate: expDate.toISOString(),
  };

  return {
    ...signLicense(licenseData),
    isTrial: true,
  };
}

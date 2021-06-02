import { Handler } from '@netlify/functions';
import Ajv, { JSONSchemaType } from 'ajv';
import fetch from 'node-fetch';
import { URLSearchParams } from 'url';

import env from '../env.json';
import { signLicense } from '../lib/sign-license';
import { jsonResponse } from '../lib/utils';

interface Input {
  licenseKey: string;
}

interface Output {
  signedLicense: string;
}

interface GumroadLicense {
  success: boolean;
  uses: number;
  purchase: {
    [name: string]: any;
    license_key: string;
  };
}

const INPUT_SCHEMA: JSONSchemaType<Input> = {
  type: 'object',
  properties: {
    licenseKey: { type: 'string' },
  },
  required: ['licenseKey'],
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
    return jsonResponse<Output>(200, {
      signedLicense: await activateLicense(input),
    });
  } catch (e) {
    return jsonResponse(400, {
      errors: e.message,
    });
  }
};

async function activateLicense(input: Input): Promise<string> {
  const res = await fetch(`${env.GUMROAD_API}/licenses/verify`, {
    method: 'POST',
    body: new URLSearchParams({
      product_permalink: env.GUMROAD_PRODUCT_ID,
      license_key: input.licenseKey,
    }),
  });

  if (!res.ok) {
    throw new Error('Failed to verify license');
  }

  const license: GumroadLicense = await res.json();

  return signLicense(license.purchase.license_key);
}

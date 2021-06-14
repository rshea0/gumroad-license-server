import { Handler } from '@netlify/functions';
import Ajv, { JSONSchemaType } from 'ajv';
import fetch from 'node-fetch';
import { URLSearchParams } from 'url';

import { GUMROAD_API, PRODUCT_PERMALINKS } from '../lib/constants';
import { signLicense, stringifyLicense } from '../lib/sign-license';
import { License } from '../lib/types';
import { jsonResponse } from '../lib/utils';

interface Input {
  productId: string;
  licenseKey: string;
}

interface Output {
  license: License;
  // LEGACY: v1.x
  signedLicense: string;
}

interface GumroadLicense {
  success: boolean;
  uses: number;
  purchase: {
    [name: string]: any;
    product_id: string;
    license_key: string;
  };
}

const INPUT_SCHEMA: JSONSchemaType<Input> = {
  type: 'object',
  properties: {
    productId: { type: 'string' },
    licenseKey: { type: 'string' },
  },
  required: ['productId', 'licenseKey'],
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
    const license = await activateLicense(input);

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

async function activateLicense(input: Input): Promise<License> {
  const permalink = PRODUCT_PERMALINKS[input.productId];
  if (!permalink) {
    throw new Error(`Invalid product id ${input.productId}`);
  }

  const res = await fetch(`${GUMROAD_API}/licenses/verify`, {
    method: 'POST',
    body: new URLSearchParams({
      product_permalink: permalink,
      license_key: input.licenseKey,
    }),
  });

  if (!res.ok) {
    throw new Error('Failed to verify license');
  }

  const gumroadLicense: GumroadLicense = await res.json();

  return {
    ...signLicense(gumroadLicense),
    isTrial: false,
  };
}

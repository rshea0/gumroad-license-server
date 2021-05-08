import { Handler, HandlerResponse } from '@netlify/functions';
import Ajv, { JSONSchemaType } from 'ajv';
import fetch from 'node-fetch';
import NodeRSA from 'node-rsa';
import { URLSearchParams } from 'url';

const env = process.env;

interface Input {
  licenseKey: string;
}

interface Output {
  signedLicense: string;
}

interface GumroadLicense {
  success: boolean;
  uses: number;
  purchase: object;
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

  return verifyLicense(input);
};

async function verifyLicense(input: Input): Promise<HandlerResponse> {
  const res = await fetch(`${env.GUMROAD_API}/licenses/verify`, {
    method: 'POST',
    body: new URLSearchParams({
      product_permalink: env.GUMROAD_PRODUCT_ID,
      license_key: input.licenseKey,
    }),
  });

  if (!res.ok) {
    return jsonResponse(400, {
      errors: 'Failed to verify license',
    });
  }

  const license: GumroadLicense = await res.json();
  const signedLicense = signLicense(license);

  return jsonResponse<Output>(200, { signedLicense });
}

function signLicense(license: GumroadLicense): string {
  const privateKey = env.LICENSE_PRIVATE_KEY.replace(/_/g, '\n');
  const rsa = new NodeRSA(privateKey);

  return rsa.sign(JSON.stringify(license), 'base64');
}

function jsonResponse<T = object>(
  statusCode: number,
  body: T,
): HandlerResponse {
  return {
    statusCode,
    body: JSON.stringify(body),
  };
}

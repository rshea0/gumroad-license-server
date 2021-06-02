import { HandlerResponse } from '@netlify/functions';

export function jsonResponse<T = object>(
  statusCode: number,
  body: T,
): HandlerResponse {
  return {
    statusCode,
    body: JSON.stringify(body),
    headers: {
      'Content-Type': 'application/json',
    },
  };
}

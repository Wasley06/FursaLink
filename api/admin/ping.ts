import type { VercelRequest, VercelResponse } from '@vercel/node';

export const config = {
  runtime: 'nodejs',
};

export default async function handler(_req: VercelRequest, res: VercelResponse) {
  res.status(200).setHeader('content-type', 'application/json').send(JSON.stringify({ ok: true }));
}

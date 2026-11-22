// Función de Netlify: /api/ml → almacén central del machine learning (Netlify Blobs)
import { getStore } from '@netlify/blobs';
import { makeHandler } from './core.mjs';
export default async (req) => makeHandler(getStore({ name: 'modapts-ml', consistency: 'strong' }), process.env)(req);
export const config = { path: '/api/ml' };

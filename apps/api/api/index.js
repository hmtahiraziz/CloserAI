/**
 * Vercel looks for /api as the serverless function root when Root Directory is apps/api.
 * Nest is compiled to dist/ first (see vercel.json buildCommand).
 */
const mod = require('../dist/serverless.js');
module.exports = mod.default || mod;

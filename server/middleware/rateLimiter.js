import rateLimit from 'express-rate-limit';

// Limiteaza tentativele de login/register pentru a preveni atacuri brute-force
// 10 incercari in 15 minute per IP este o valoare standard in industrie
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { success: false, message: 'Prea multe încercări. Încearcă din nou peste 15 minute.' }
});

import { verifyAccessToken } from '../services/tokenService.js';

// Verifica daca request-ul vine de la un user autentificat
// Aplicat pe toate rutele protejate
export const authMiddleware = (req, res, next) => {
  const token = req.cookies?.accessToken;

  if (!token) {
    return res.status(401).json({ success: false, message: 'Acces refuzat. Autentifică-te pentru a continua.' });
  }

  const payload = verifyAccessToken(token);

  if (!payload) {
    return res.status(401).json({ success: false, message: 'Sesiune expirată. Autentifică-te din nou.' });
  }

  // Punem datele userului in req.user pentru a fi accesibile in controllere
  req.user = payload;
  next();
};

// Verifica daca userul autentificat are rolul de ADMIN
// Aplicat intotdeauna dupa authMiddleware
export const adminMiddleware = (req, res, next) => {
  if (req.user.role !== 'ADMIN') {
    return res.status(403).json({  message: 'Acces refuzat. Doar administratorii au acces.' });
  }

  next();
};

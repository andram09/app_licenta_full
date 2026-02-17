const { verifyAccessToken } = require('../services/tokenService');

// Verifica daca request-ul vine de la un user autentificat
// Aplicat pe toate rutele protejate
const authMiddleware = (req, res, next) => {
  const token = req.cookies.accessToken;

  if (!token) {
    return res.status(401).json({ success: false, message: 'Access denied. No token provided.' });
  }

  const payload = verifyAccessToken(token);

  if (!payload) {
    return res.status(401).json({ success: false, message: 'Access denied. Invalid or expired token.' });
  }

  // Punem datele userului in req.user pentru a fi accesibile in controllere
  req.user = payload;
  next();
};

// Verifica daca userul autentificat are rolul de ADMIN
// Aplicat intotdeauna dupa authMiddleware
const adminMiddleware = (req, res, next) => {
  if (req.user.role !== 'ADMIN') {
    return res.status(403).json({ success: false, message: 'Access denied. Admins only.' });
  }

  next();
};

module.exports = { authMiddleware, adminMiddleware };
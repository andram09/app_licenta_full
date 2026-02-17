import jwt from "jsonwebtoken";

export const generateAccessToken = (user) => {
  return jwt.sign(
    { id: user.id_user, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
};

export const verifyAccessToken = (token) => {
  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    return null;
  }
};


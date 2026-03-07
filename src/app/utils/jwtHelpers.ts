import jwt, { JwtPayload, Secret } from 'jsonwebtoken';

const generateToken = (
  payload: Record<string, unknown>,
  secret: Secret,
  expiresIn: string
) => {
  return jwt.sign(payload, secret, {
    expiresIn,
  });
};

const verifyToken = (token: string, secret: Secret) => {
  return jwt.verify(token, secret) as JwtPayload;
};

export const JwtHelpers = {
  generateToken,
  verifyToken,
};

import bcrypt from "bcryptjs";
import { envVars } from "../config/env";

/**
 * Hash a plain-text password
 */
export const hashPassword = async (password: string): Promise<string> => {
  return await bcrypt.hash(password, Number(envVars.BCRYPT_SALT_ROUNDS));
};

/**
 * Compare plain-text password with hashed password
 */
export const comparePassword = async (password: string, hash: string): Promise<boolean> => {
  return await bcrypt.compare(password, hash);
};
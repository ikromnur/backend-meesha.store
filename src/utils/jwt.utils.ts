import jwt from "jsonwebtoken";
import * as crypto from "crypto";

// Fungsi untuk menghasilkan token JWT
export const generateToken = (userId: string, role: string): string => {
  // Pastikan userId sudah bertipe string (UUID) dan role adalah string yang sesuai dengan enum Role
  if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET not defined in environment variables.");
  }

  const userPayload = {
    userId, // userId sudah bertipe string (UUID), jadi tidak perlu diubah
    role,
  };

  // Generate token dengan secret dan waktu kadaluarsa 7 hari
  return jwt.sign(userPayload, process.env.JWT_SECRET, { expiresIn: "7d" });
};

// Fungsi untuk menghasilkan reset token yang aman
export const generateResetToken = (): string => {
  // Menggunakan kombinasi random yang lebih aman
  return crypto.randomBytes(32).toString("hex"); // Menghasilkan string hexadecimal yang lebih aman
};

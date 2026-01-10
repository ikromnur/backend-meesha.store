import type { Request, Response, NextFunction } from "express"

export const validateRegister = (req: Request, res: Response, next: NextFunction) => {
  const { name, email, password, phone } = req.body
  const errors = []

  // Validasi nama
  if (!name || name.trim() === "") {
    errors.push("Nama lengkap diperlukan")
  }

  // Validasi email
  if (!email || !email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
    errors.push("Email tidak valid")
  }

  // Validasi password
  if (!password || password.length < 6) {
    errors.push("Password harus minimal 6 karakter")
  }

  // Validasi nomor telepon (opsional)
  if (phone && !phone.match(/^(\+62|62|0)[0-9]{9,13}$/)) {
    errors.push("Format nomor telepon tidak valid")
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      message: "Validasi gagal",
      errors,
    })
  }

  next()
}

import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { env } from "../../config/env.js";
import { AppError } from "../../core/errors.js";
import { UserModel } from "../users/user.model.js";

export class AuthService {
  async register(email: string, password: string) {
    const passwordHash = await bcrypt.hash(password, 12);
    const user = await UserModel.create({ email, passwordHash, role: "user", quotaBytes: 5_000_000_000 });
    return this.issueToken(user.id, user.role);
  }

  async login(email: string, password: string) {
    const user = await UserModel.findOne({ email });
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      throw new AppError("Invalid credentials", 401, "INVALID_CREDENTIALS");
    }
    return this.issueToken(user.id, user.role);
  }

  private issueToken(id: string, role: string) {
    const token = jwt.sign({ id, role }, env.JWT_SECRET, { expiresIn: env.JWT_EXPIRES_IN as any });
    return { token };
  }
}

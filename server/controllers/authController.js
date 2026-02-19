import bcrypt from "bcryptjs";
import crypto from "crypto";
import nodemailer from "nodemailer";

import { generateAccessToken } from "../services/tokenService.js";
import { User } from "../models/User.js";
import { UserToken } from "../models/UserToken.js";

const transporter = nodemailer.createTransport({
  host: 'smtp.sendgrid.net',
  port: 587,
  secure: false,
  auth: {
    user: 'apikey',
    pass: process.env.EMAIL_PASS
  }
});

const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "strict",
  path: "/",
  maxAge: 7 * 24 * 60 * 60 * 1000 // 7 zile
};

export const authController = {

  // REGISTER
  register: async (req, res) => {
    try {
      const { first_name, last_name, email, password } = req.body;

      const emailNormalized = email.toLowerCase().trim();

      const existingUser = await User.findOne({
        where: { email: emailNormalized }
      });

      if (existingUser) {
        return res.status(409).json({
          message: "An account with this email already exists."
        });
      }

      const password_hash = await bcrypt.hash(password, 10);

      await User.create({
        first_name,
        last_name,
        email: emailNormalized,
        password_hash
      });

      return res.status(201).json({
        message: "Account created successfully."
      });

    } catch (error) {
      console.error("Register error:", error);
      return res.status(500).json({
        message: "Something went wrong."
      });
    }
  },

  // LOGIN
  login: async (req, res) => {
    try {
      const { email, password } = req.body;

      const emailNormalized = email.toLowerCase().trim();

      const user = await User.findOne({
        where: { email: emailNormalized }
      });

      if (!user) {
        return res.status(401).json({
          message: "Invalid email or password."
        });
      }

      const isPasswordValid = await bcrypt.compare(
        password,
        user.password_hash
      );

      if (!isPasswordValid) {
        return res.status(401).json({
          message: "Invalid email or password."
        });
      }

      const token = generateAccessToken(user);

      res.cookie("accessToken", token, cookieOptions);

      return res.status(200).json({
        message: "Logged in successfully.",
        data: {
          id: user.id_user,
          first_name: user.first_name,
          last_name: user.last_name,
          email: user.email,
          role: user.role
        }
      });

    } catch (error) {
      console.error("Login error:", error);
      return res.status(500).json({
        message: "Something went wrong."
      });
    }
  },

  // LOGOUT
  logout: async (req, res) => {
    res.clearCookie("accessToken", cookieOptions);

    return res.status(200).json({
      message: "Logged out successfully."
    });
  },

  // GET ME
  getMe: async (req, res) => {
    try {
      const user = await User.findByPk(req.user.id);

      if (!user) {
        return res.status(404).json({
          message: "User not found."
        });
      }

      return res.status(200).json({
        data: {
          id: user.id_user,
          first_name: user.first_name,
          last_name: user.last_name,
          email: user.email,
          role: user.role
        }
      });

    } catch (error) {
      console.error("GetMe error:", error);
      return res.status(500).json({
        message: "Something went wrong."
      });
    }
  },

  // FORGOT PASSWORD
  forgotPassword: async (req, res) => {
    try {
      const { email } = req.body;

      const emailNormalized = email.toLowerCase().trim();

      const user = await User.findOne({
        where: { email: emailNormalized }
      });

      if (!user) {
        return res.status(200).json({
          message: "If your email is registered, you will receive a password reset link shortly."
        });
      }

      await UserToken.update(
        { used_at: new Date() },
        { where: { id_user: user.id_user, used_at: null } }
      );

      const resetToken = crypto.randomBytes(32).toString("hex");

      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 1);

      await UserToken.create({
        id_user: user.id_user,
        token: resetToken,
        expires_at: expiresAt
      });

      const resetLink = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;

      await transporter.sendMail({
        from: process.env.EMAIL_FROM,
        to: emailNormalized,
        subject: "Reset your password",
        html: `
          <h2>Password Reset Request</h2>
          <p>You requested to reset your password. Click the link below:</p>
          <a href="${resetLink}">Reset Password</a>
          <p>This link will expire in <strong>1 hour</strong>.</p>
        `
      });

      return res.status(200).json({
        message: "If your email is registered, you will receive a password reset link shortly."
      });

    } catch (error) {
      console.error("ForgotPassword error:", error);
      return res.status(500).json({
        message: "Something went wrong."
      });
    }
  },

  // RESET PASSWORD
  resetPassword: async (req, res) => {
    try {
      const { token, password } = req.body;

      const userToken = await UserToken.findOne({
        where: { token, used_at: null }
      });

      if (!userToken || new Date() > userToken.expires_at) {
        return res.status(400).json({
          message: "This reset link is invalid or expired."
        });
      }

      const password_hash = await bcrypt.hash(password, 10);

      await User.update(
        { password_hash },
        { where: { id_user: userToken.id_user } }
      );

      await userToken.update({ used_at: new Date() });

      return res.status(200).json({
        message: "Your password has been reset successfully."
      });

    } catch (error) {
      console.error("ResetPassword error:", error);
      return res.status(500).json({
        message: "Something went wrong."
      });
    }
  }
};

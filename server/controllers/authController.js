import bcrypt from "bcryptjs";
import crypto from "crypto";
import nodemailer from "nodemailer";

import { generateAccessToken } from "../services/tokenService.js";
import { User } from "../models/User.js";
import { UserToken } from "../models/UserToken.js";

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax",
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
          message: "Există deja un cont cu această adresă de email."
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
        message: "Contul a fost creat cu succes."
      });

    } catch (error) {
      console.error("Register error:", error);
      return res.status(500).json({
        message: "A apărut o eroare. Încearcă din nou."
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
          message: "Email sau parolă incorectă."
        });
      }

      const isPasswordValid = await bcrypt.compare(
        password,
        user.password_hash
      );

      if (!isPasswordValid) {
        return res.status(401).json({
          message: "Email sau parolă incorectă."
        });
      }

      const token = generateAccessToken(user);

      res.cookie("accessToken", token, cookieOptions);

      return res.status(200).json({
        message: "Autentificare reușită.",
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
        message: "A apărut o eroare. Încearcă din nou."
      });
    }
  },

  // LOGOUT
  logout: async (req, res) => {
    res.clearCookie("accessToken", cookieOptions);

    return res.status(200).json({
      message: "Deconectare reușită."
    });
  },

  // GET ME
  getMe: async (req, res) => {
    try {
      const user = await User.findByPk(req.user.id);

      if (!user) {
        return res.status(404).json({
          message: "Utilizatorul nu a fost găsit."
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
        message: "A apărut o eroare. Încearcă din nou."
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
          message: "Dacă adresa de email este înregistrată, vei primi un link de resetare în scurt timp."
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
        subject: "Resetare parola Travel Planner App",
        html: `
          <h2>Solicitare resetare parolă</h2>
          <p>Ai solicitat resetarea parolei. Apasă pe link-ul de mai jos:</p>
          <a href="${resetLink}">Resetează parola</a>
          <p>Acest link va expira în <strong>1 oră</strong>.</p>
        `
      });

      return res.status(200).json({
        message: "Dacă adresa de email este înregistrată, vei primi un link de resetare în scurt timp."
      });

    } catch (error) {
      console.error("ForgotPassword error:", error);
      return res.status(500).json({
        message: "A apărut o eroare. Încearcă din nou."
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
          message: "Link-ul de resetare este invalid sau a expirat."
        });
      }

      const password_hash = await bcrypt.hash(password, 10);

      await User.update(
        { password_hash },
        { where: { id_user: userToken.id_user } }
      );

      await userToken.update({ used_at: new Date() });

      return res.status(200).json({
        message: "Parola a fost resetată cu succes."
      });

    } catch (error) {
      console.error("ResetPassword error:", error);
      return res.status(500).json({
        message: "A apărut o eroare. Încearcă din nou."
      });
    }
  },

  // UPDATE PROFILE - actualizeaza prenume si nume
  updateProfile: async (req, res) => {
    try {
      const { first_name, last_name } = req.body;

      const user = await User.findByPk(req.user.id);

      if (!user) {
        return res.status(404).json({ message: "Utilizatorul nu a fost găsit." });
      }
      await user.update({ first_name, last_name });

      return res.status(200).json({
        message: "Profilul a fost actualizat cu succes.",
        data: {
          id: user.id_user,
          first_name: user.first_name,
          last_name: user.last_name,
          email: user.email,
          role: user.role
        }
      });

    } catch (error) {
      console.error("UpdateProfile error:", error);
      return res.status(500).json({ message: "Something went wrong." });
    }
  },

  // CHANGE PASSWORD - schimba parola utilizatorului autentificat
  // Necesita parola curenta pentru confirmare inainte de schimbare
  changePassword: async (req, res) => {
    try {
      const { current_password, new_password } = req.body;

      const user = await User.findByPk(req.user.id);
      if (!user) {
        return res.status(404).json({ message: "Utilizatorul nu a fost găsit." });
      }

      // verificam ca parola curenta introdusa este corecta
      const isCurrentPasswordValid = await bcrypt.compare(
        current_password,
        user.password_hash
      );

      if (!isCurrentPasswordValid) {
        return res.status(400).json({
          message: "Parola curentă este incorectă."
        });
      }

      // prevenim reutilizarea aceleiasi parole
      const isSamePassword = await bcrypt.compare(
        new_password,
        user.password_hash
      );

      if (isSamePassword) {
        return res.status(400).json({
          message: "Parola nouă trebuie să fie diferită de cea curentă."
        });
      }

      const password_hash = await bcrypt.hash(new_password, 10);

      await user.update({ password_hash });

      return res.status(200).json({
        message: "Parola a fost schimbată cu succes."
      });

    } catch (error) {
      console.error("ChangePassword error:", error);
      return res.status(500).json({ message: "Something went wrong." });
    }
  }
};

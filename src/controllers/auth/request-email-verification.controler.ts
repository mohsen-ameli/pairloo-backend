import { Request, Response } from "express";
import User from "../../models/user.model";
import { EMAIL_USER } from "../../utils/constants";
import { transporter } from "../../server";
import Verification from "../../models/verification.model";

export async function requestEmailVerification(req: Request, res: Response) {
  const { email } = req.body;

  try {
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(400).json({
        error:
          "Invalid email. Please check your email address again and try again.",
      });
    }

    const verificationCode = Math.floor(100000 + Math.random() * 900000); // 6-digit code

    const mailOptions = {
      from: EMAIL_USER,
      to: user.email,
      subject: "Verification Code",
      text: `Your verification code is: ${verificationCode}`,
    };

    await transporter.sendMail(mailOptions);

    if (await Verification.findOne({ email: user.email })) {
      return res.status(400).json({
        error: "Verification code already sent to this email.",
      });
    }

    try {
      const verification = new Verification({
        email: user.email,
        code: verificationCode,
      });
      await verification.save();
    } catch (err) {
      return res.status(400).json({
        error: "Verification code already sent to this email.",
      });
    }

    return res.status(200).json({
      message: "Verification code sent to email.",
    });
  } catch (err: any) {
    return res.status(400).json({
      error: "Failed to connect to database. Please try again later.",
    });
  }
}

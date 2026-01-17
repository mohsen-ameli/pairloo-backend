import { Request, Response } from "express";
import User from "../../models/user.model";
import Verification from "../../models/verification.model";
import createJWT from "../../utils/create-jwt";

export async function verifyEmailCode(req: Request, res: Response) {
  const {
    email,
    code,
    signUp,
  }: { email: string; code: string; signUp: boolean } = req.body;

  try {
    const userVerify = await Verification.findOne({
      email: email.toLowerCase(),
      code: Number(code),
    });
    if (!userVerify) {
      return res.status(400).json({
        error:
          "Invalid verification code. Please check the code again and try again.",
      });
    }

    if (!signUp) {
      const user = await User.findOne({ email: email.toLowerCase() });
      if (!user) {
        return res.status(400).json({
          error:
            "Invalid email. Please check your email address again and try again.",
        });
      }

      await Verification.deleteMany({ email: email.toLowerCase() });

      const { accessToken, refreshToken } = await createJWT(
        user._id.toString()
      );

      return res.status(200).json({
        _id: user._id,
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        phoneNumber: user.phoneNumber,
        country: user.country,
        city: user.city,
        state: user.state,
        latitude: user.latitude,
        longitude: user.longitude,
        timezone: user.timezone,
        locationId: user.locationId,
        email: user.email,
        picture: user.picture,
        accessToken,
        refreshToken,
      });
    }

    return res.status(200).json({ message: "Email verified successfully." });
  } catch (err: any) {
    return res.status(500).json({
      error: "Failed to connect. Please try again later.",
    });
  }
}

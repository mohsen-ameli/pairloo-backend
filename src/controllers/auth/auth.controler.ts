import { Request, Response } from "express";
import User from "../../models/user.model";
import createJWT from "../../utils/create-jwt";

export async function signupPost(req: Request, res: Response) {
  const userData = {
    username: req.body.username.toLowerCase(),
    firstName: req.body.firstName,
    lastName: req.body.lastName,
    phoneNumber: req.body.phoneNumber,
    country: req.body.country,
    city: req.body.city,
    email: req.body.email.toLowerCase(),
  };
  try {
    const user = new User(userData);
    const err = user.validateSync();
    const errors = await handleSignupErrors(err, userData);
    if (errors) return res.status(400).json({ errors });
    await user.save();

    const { accessToken, refreshToken } = await createJWT(user._id.toString());

    res.status(201).json({
      id: user._id,
      username: user.username,
      firstName: user.firstName,
      lastName: user.lastName,
      phoneNumber: user.phoneNumber,
      country: user.country,
      city: user.city,
      email: user.email,
      accessToken,
      refreshToken,
    });
  } catch (err: any) {
    res.status(500).json({ errors: { general: err.message } });
  }
}

async function handleSignupErrors(err: any, user: typeof User.prototype) {
  const errors = {
    username: "",
    firstName: "",
    lastName: "",
    phoneNumber: "",
    country: "",
    city: "",
    email: "",
  };
  if (err) {
    Object.values(err.errors).forEach(({ properties }: any) => {
      errors[properties.path as keyof typeof errors] = properties.message;
    });
    return errors;
  } else {
    // query for existing username, email, phoneNumber
    const existingUser = await User.findOne({
      $or: [
        { username: user.username },
        { email: user.email },
        { phoneNumber: user.phoneNumber },
      ],
    });

    if (existingUser) {
      if (existingUser.username === user.username) {
        errors.username = "Username already exists";
      }
      if (existingUser.email === user.email) {
        errors.email = "Email already exists";
      }
      if (existingUser.phoneNumber === user.phoneNumber) {
        errors.phoneNumber = "Phone number already exists";
      }
      return errors;
    }
  }
  return null;
}

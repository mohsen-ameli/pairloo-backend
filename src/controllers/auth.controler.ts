import { Request, Response } from "express";
import User from "../models/user.model";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

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

function createJWT(id: string) {
  return jwt.sign({ id }, process.env.JWT_SECRET as string, {
    expiresIn: "2d",
  });
}

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

    const token = createJWT(user._id.toString());

    res.status(201).json({
      id: user._id,
      username: user.username,
      firstName: user.firstName,
      lastName: user.lastName,
      phoneNumber: user.phoneNumber,
      country: user.country,
      city: user.city,
      email: user.email,
      token,
    });
  } catch (err: any) {
    res.status(500).json({ errors: { general: err.message } });
  }
}

export async function loginPost(req: Request, res: Response) {
  const username = req.body.username;
  const password = req.body.password;
  console.log("username:", username);
  console.log("password:", password);

  res.status(200).json({ message: "Login endpoint hit" });
  // try {
  //   // Find user by username
  //   const user = await User.findOne({ username: req.body.username }).populate(
  //     "roles",
  //     "-__v"
  //   );
  //   if (!user) {
  //     return res.status(404).json({ message: "User Not found." });
  //   }
  //   // Validate password
  //   const passwordIsValid = bcrypt.compareSync(
  //     req.body.password,
  //     user.password
  //   );
  //   if (!passwordIsValid) {
  //     return res.status(401).json({
  //       accessToken: null,
  //       message: "Invalid Password!",
  //     });
  //   }
  //   // Generate JWT
  //   const token = jwt.sign({ id: user.id }, config.secret, {
  //     algorithm: "HS256",
  //     expiresIn: 86400, // 24 hours
  //   });
  //   // Extract user roles
  //   const authorities = user.roles.map(
  //     (role) => `ROLE_${role.name.toUpperCase()}`
  //   );
  //   res.status(200).json({
  //     id: user._id,
  //     username: user.username,
  //     email: user.email,
  //     roles: authorities,
  //     accessToken: token,
  //   });
  // } catch (err) {
  //   res.status(500).json({ message: err.message });
  // }
}

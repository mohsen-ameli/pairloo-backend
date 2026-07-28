import { Request, Response } from "express"
import mongoose from "mongoose"
import Report from "../models/report.model"
import { EMAIL_FROM, REPORT_EMAIL } from "../utils/constants"
import { resend } from "../server"

export async function reportPost(req: Request, res: Response) {
  const postId = req.body.postId as string
  const report = req.body.report as string
  const userId = req.user!.sub // the reporter

  await Report.create({
    reporter: new mongoose.Types.ObjectId(userId),
    post: new mongoose.Types.ObjectId(postId),
    report,
  })

  const mailOptions = {
    from: EMAIL_FROM,
    to: REPORT_EMAIL,
    subject: "Pairloo | Post Report",
    text: `A post has been reported. Post ID: ${postId}, Report: ${report}`,
  }

  await resend.emails.send(mailOptions)

  return res.status(200).json({ message: "Post reported successfully" })
}

export async function reportUser(req: Request, res: Response) {
  const userIdToReport = req.body.userId as string
  const report = req.body.report as string
  const userId = req.user!.sub // the reporter

  await Report.create({
    reporter: new mongoose.Types.ObjectId(userId),
    user: new mongoose.Types.ObjectId(userIdToReport),
    report,
  })

  const mailOptions = {
    from: EMAIL_FROM,
    to: REPORT_EMAIL,
    subject: "Pairloo | User Report",
    text: `A user has been reported. User ID: ${userIdToReport}, Report: ${report}`,
  }

  await resend.emails.send(mailOptions)

  return res.status(200).json({ message: "Post reported successfully" })
}

import { s3Client } from "../server"
import {
  GetObjectCommand,
  PutObjectCommand,
  S3ServiceException,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3"
import { getSignedUrl } from "@aws-sdk/s3-request-presigner"
import crypto from "crypto"
import { S3_EXPIRES_IN_SECONDS, BUCKET_NAME } from "./constants"

const genHash = () => crypto.randomBytes(16).toString("hex")

export async function sendObject(
  folder: string,
  file: File | Buffer | Blob,
  mimeType: string,
  fileName?: string
) {
  if (!fileName) {
    fileName = genHash()
  }
  const extension = mimeType.split("/")[1] || "bin"
  const key = `${folder}/${fileName}.${extension}`
  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
    Body: file,
    ContentType: mimeType,
  })

  try {
    await s3Client.send(command)
    return key
  } catch (caught) {
    if (caught instanceof S3ServiceException && caught.name === "EntityTooLarge") {
      console.error(
        `Error from S3 while uploading object to ${BUCKET_NAME}. \
The object was too large. To upload objects larger than 5GB, use the S3 console (160GB max) \
or the multipart upload API (5TB max).`
      )
    } else if (caught instanceof S3ServiceException) {
      console.error(
        `Error from S3 while uploading object to ${BUCKET_NAME}.  ${caught.name}: ${caught.message}`
      )
    } else {
      throw caught
    }
  }
  return null
}

export async function deleteObject(key: string) {
  const command = new DeleteObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
  })
  await s3Client.send(command)
}

export async function getObject(key: string | null | undefined) {
  if (!key) return null
  // This object is not part of s3
  if (!key.startsWith("user-pictures") && !key.startsWith("chat") && !key.startsWith("posts")) {
    return null
  }

  // return `${CDN_BASE_URL}/${key}`
  const command = new GetObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
  })

  const roundTo = (S3_EXPIRES_IN_SECONDS - 300) * 1000 // 5 minutes less than expiry time

  const url = await getSignedUrl(s3Client, command, {
    signingDate: new Date(Math.floor(new Date().getTime() / roundTo) * roundTo),
    expiresIn: S3_EXPIRES_IN_SECONDS,
  })

  return url
}

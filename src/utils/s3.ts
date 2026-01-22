import { s3Client } from "../server"
import { GetObjectCommand, PutObjectCommand, S3ServiceException } from "@aws-sdk/client-s3"
import { getSignedUrl } from "@aws-sdk/s3-request-presigner"
import crypto from "crypto"

const bucketName = "pairalign"

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
    Bucket: bucketName,
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
        `Error from S3 while uploading object to ${bucketName}. \
The object was too large. To upload objects larger than 5GB, use the S3 console (160GB max) \
or the multipart upload API (5TB max).`
      )
    } else if (caught instanceof S3ServiceException) {
      console.error(
        `Error from S3 while uploading object to ${bucketName}.  ${caught.name}: ${caught.message}`
      )
    } else {
      throw caught
    }
  }
  return null
}

export async function getObject(key: string) {
  const command = new GetObjectCommand({
    Bucket: bucketName,
    Key: key,
  })
  const url = await getSignedUrl(s3Client, command, { expiresIn: 3600 })
  return url
}

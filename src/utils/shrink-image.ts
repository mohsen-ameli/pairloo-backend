import sharp from "sharp"

export async function shrinkImage(buffer: Buffer) {
  try {
    let size = Buffer.byteLength(buffer)
    const newBuffer = await sharp(buffer).resize({ width: 1000 }).toBuffer()
    size = Buffer.byteLength(newBuffer)
    return newBuffer
  } catch (error) {
    console.error("Error processing image:", error)
    return buffer
  }
}

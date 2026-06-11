import { Request, Response } from "express"
import { deleteObject, sendObject } from "../utils/s3"
import Post from "../models/post.model"
import { shrinkImage } from "../utils/shrink-image"
import { MAX_POST_FILE_SIZE } from "../utils/constants"

type EditPostType = {
  title: string
  description: string
  publicPost: boolean
  images: {
    key: string
    removed: boolean
    isExisting: boolean
    url?: string
    file?: Blob | undefined
    mimeType?: string
  }[]
}

export async function postUpdate(req: Request, res: Response) {
  const postId = req.params.id as string
  const userId = req.user!.sub
  const files = req.files

  if (files) {
    for (const file of files as Express.Multer.File[]) {
      if (file.size > MAX_POST_FILE_SIZE) {
        const shrunkBuffer = await shrinkImage(file.buffer)
        file.buffer = shrunkBuffer
      }
    }
  }

  let metadata: EditPostType

  try {
    metadata = JSON.parse(req.body.metadata)
  } catch (e) {
    return res.status(400).json({ message: "Invalid metadata format" })
  }

  const { title, description, publicPost, images } = metadata

  try {
    const post = await Post.findOne({ _id: postId, userId })

    if (!post) {
      return res.status(404).json({ message: "Post not found" })
    }

    const updatedImageKeys: string[] = []

    for (const img of images) {
      if (img.isExisting && !img.removed) {
        updatedImageKeys.push(img.key)
        continue
      }
      if (!img.isExisting && !img.removed) {
        for (const file of files as Express.Multer.File[]) {
          try {
            const imageKey = await sendObject("posts", file.buffer, file.mimetype)
            if (imageKey) {
              updatedImageKeys.push(imageKey)
            }
          } catch (uploadError) {
            console.error("Error uploading image:", uploadError)
          }
        }
      } else if (img.removed) {
        try {
          await deleteObject(img.key)
        } catch (deleteError) {
          console.error("Error deleting image:", deleteError)
        }
      }
    }

    const updatedPost = await Post.findByIdAndUpdate(
      postId,
      {
        title,
        description,
        publicPost,
        images: updatedImageKeys,
      },
      {
        returnDocument: "after",
      }
    )

    return res.status(200).json({ message: "Post updated successfully", post: updatedPost })
  } catch (error) {
    console.error("Error updating post:", error)
    return res.status(500).json({ message: "An error occurred while updating the post" })
  }
}

export async function myEditPostGet(req: Request, res: Response) {
  const postId = req.params.id as string
  const userId = req.user!.sub

  const post = await Post.findOne({ userId, _id: postId })
    .select("title description images publicPost")
    .lean()

  if (!post) {
    return res.status(404).json({ message: "Post not found or you do not have permission to edit" })
  }

  if (!post.images || post.images.length === 0) {
    return res.status(200).json(post)
  }

  const imageUrls = await Post.updatePostImages(post, false)
  if (!imageUrls) {
    return res.status(500).json({ message: "Error retrieving image URLs" })
  }

  const postData: EditPostType = {
    ...post,
    images: post.images.map((img, index) => ({
      key: img,
      url: imageUrls[index],
      removed: false,
      isExisting: true,
    })),
  }

  return res.status(200).json(postData)
}

import { DefaultEventsMap, Namespace } from "socket.io"
import { ImageType, QnaType } from "../session.types"
import { LocationType } from "../location.type"

// THIS FILE SHOULD BE KEPT IN SYNC WITH THE FRONTEND

interface ServerToClientEvents {
  error: (message: string) => void
  draftRestored: (qna: QnaType) => void
  question: (qna: QnaType) => void
  chatFinished: () => void
  draftSaved: () => void
  aiTitleGenerated: (title: string) => void
  success: (message: string) => void
  draftDiscarded: () => void
}

interface ClientToServerEvents {
  chat: (qna: QnaType) => void
  aiTitle: () => void
  submit: (newPost: {
    title: string
    description: string
    publicPost: boolean
    images: ImageType[] | undefined
    location: LocationType
    distance: number
  }) => void
  discardDraft: () => void
  updateDraftSettings: (
    title: string,
    description: string,
    images: ImageType[],
    publicPost: boolean
  ) => void
}

export type CreatePostSocket = Namespace<
  ClientToServerEvents,
  ServerToClientEvents,
  DefaultEventsMap,
  any
>

import mongoose from "mongoose";

export type ClosePost = {
  item: mongoose.Types.ObjectId;
  score: number;
};

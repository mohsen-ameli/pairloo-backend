use("test");

const userId = new ObjectId("6953259c89bfe6ca51b7e1d6");

db.conversations.find({
  members: userId,
});

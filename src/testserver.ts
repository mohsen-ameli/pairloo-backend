import express, { Request, Response } from "express";
import { WebSocketServer } from "ws";
import cors from "cors";

const app = express();
const port = 3000;
app.use(cors());

app.get("/users", (req: Request, res: Response) => {
  const users = [
    { id: 1, name: "Alice" },
    { id: 2, name: "Bob" },
    { id: 3, name: "Charlie" },
  ];
  res.send({ users });
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});

console.log("HEREEEEEEEEEEEE");

const wss = new WebSocketServer({ port: 3001 });

wss.on("connection", function connection(ws) {
  ws.on("error", console.error);

  ws.on("message", function message(data) {
    console.log("received: %s", data);
  });

  ws.send("something");
});

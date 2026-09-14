import express from "express";
import dotenv from "dotenv";
dotenv.config();

const app = express();
const port = process.env.PORT || 3000;
app.use(express.json());

app.get("/", (req, res) => {
  res.send({ message: "Hello World" });
});

app.get("/health", (req, res) => {
  res.send({ status: "ok" });
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});

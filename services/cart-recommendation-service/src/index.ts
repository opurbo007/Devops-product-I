import dotenv from "dotenv";
import { createApp } from "./server.js";

dotenv.config();

const port = Number(process.env.PORT ?? 3005);
const app = createApp();
app.listen(port, () => {
  console.log(`cart-service listening on port ${port}`);
});

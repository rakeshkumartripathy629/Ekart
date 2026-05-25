require("dotenv").config();
const app = require("./src/app");
const connectDB = require("./src/config/db");
const { startConsumers } = require("./src/events/consumers");

const PORT = process.env.PORT || 3001;

connectDB().then(async () => {
  await startConsumers();
  app.listen(PORT, () => {
    console.log(`\n🚀 Auth Service → http://localhost:${PORT}`);
    console.log(`🌍 Env: ${process.env.NODE_ENV}\n`);
  });
});

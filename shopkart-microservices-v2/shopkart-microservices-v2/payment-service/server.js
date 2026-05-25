require('dotenv').config();
const app = require('./src/app');
const connectDB = require('./src/config/db');
const { startConsumers } = require('./src/events/consumers');
const PORT = process.env.PORT || 3005;
connectDB().then(async () => {
  await startConsumers();
  app.listen(PORT, () => console.log(`Payment Service → http://localhost:${PORT}`));
});

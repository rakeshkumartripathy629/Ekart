require('dotenv').config();
const app = require('./src/app');
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`\n🚀 API Gateway → http://localhost:${PORT}`);
  console.log(`📖 Health: http://localhost:${PORT}/health\n`);
});

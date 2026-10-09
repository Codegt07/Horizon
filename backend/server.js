require("dotenv").config();

const { env } = require("./src/config/env");
const { connectDB } = require("./src/config/db");
const app = require("./src/app");

async function start() {
  await connectDB();

  app.listen(env.PORT, () => {
    console.log(
      `🚀 Server running on http://localhost:${env.PORT} [${env.NODE_ENV}]`
    );
  });
}

// Catch any unhandled promise rejection that escapes start() or later async work
process.on("unhandledRejection", (reason) => {
  console.error("Unhandled rejection:", reason);
  process.exit(1);
});

start();

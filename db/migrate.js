import fs from "node:fs/promises";
import path from "node:path";
import mysql from "mysql2/promise";
import { fileURLToPath } from "node:url";
import { appConfig } from "../server/config.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  const schemaPath = path.join(__dirname, "schema.mysql.sql");
  const sql = await fs.readFile(schemaPath, "utf8");
  const connection = await mysql.createConnection({
    host: appConfig.mysql.host,
    port: appConfig.mysql.port,
    user: appConfig.mysql.user,
    password: appConfig.mysql.password,
    multipleStatements: true,
    charset: "utf8mb4"
  });

  try {
    await connection.query(sql);
    console.log(`Schema applied to ${appConfig.mysql.host}:${appConfig.mysql.port}/${appConfig.mysql.database}`);
  } finally {
    await connection.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
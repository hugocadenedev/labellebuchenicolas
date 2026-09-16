import mysql from "mysql2/promise";
import { appConfig } from "./config.js";

let pool;

export function getDbPool() {
  if (!pool) {
    pool = mysql.createPool({
      ...appConfig.mysql,
      waitForConnections: true,
      namedPlaceholders: true,
      multipleStatements: true,
      decimalNumbers: true,
      charset: "utf8mb4"
    });
  }

  return pool;
}

export async function withTransaction(callback) {
  const connection = await getDbPool().getConnection();
  try {
    await connection.beginTransaction();
    const result = await callback(connection);
    await connection.commit();
    return result;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}
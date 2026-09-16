import { isMysqlBackendEnabled } from "./config.js";

const mysqlBackendEnabled = isMysqlBackendEnabled();

const backendPromise = mysqlBackendEnabled
  ? import("./sqlStore.js")
  : import("./store.js");

let fallbackBackendPromise = null;

function isLocalMysqlUnavailable(error) {
  return mysqlBackendEnabled
    && process.env.NODE_ENV !== "production"
    && (error?.code === "ECONNREFUSED" || error?.code === "ENOTFOUND" || error?.code === "ETIMEDOUT");
}

function getFallbackBackend() {
  if (!fallbackBackendPromise) {
    fallbackBackendPromise = import("./store.js");
  }

  return fallbackBackendPromise;
}

function bindBackendMethod(methodName) {
  return async (...args) => {
    const backend = await backendPromise;

    try {
      return await backend[methodName](...args);
    } catch (error) {
      if (!isLocalMysqlUnavailable(error)) {
        throw error;
      }

      console.warn(`[dataStore] MySQL indisponible en local, bascule sur le store JSON pour ${methodName}.`);
      const fallbackBackend = await getFallbackBackend();
      return fallbackBackend[methodName](...args);
    }
  };
}

export const authenticateCustomer = bindBackendMethod("authenticateCustomer");
export const authenticateAdmin = bindBackendMethod("authenticateAdmin");
export const createCategory = bindBackendMethod("createCategory");
export const createCustomerAccount = bindBackendMethod("createCustomerAccount");
export const createOrder = bindBackendMethod("createOrder");
export const createProduct = bindBackendMethod("createProduct");
export const deleteProduct = bindBackendMethod("deleteProduct");
export const getBootstrap = bindBackendMethod("getBootstrap");
export const getCustomerAccount = bindBackendMethod("getCustomerAccount");
export const getSiteBootstrap = bindBackendMethod("getSiteBootstrap");
export const listCategories = bindBackendMethod("listCategories");
export const listCustomers = bindBackendMethod("listCustomers");
export const listOrders = bindBackendMethod("listOrders");
export const listProducts = bindBackendMethod("listProducts");
export const updateCategory = bindBackendMethod("updateCategory");
export const updateOrder = bindBackendMethod("updateOrder");
export const updateProduct = bindBackendMethod("updateProduct");
export const updateProductStock = bindBackendMethod("updateProductStock");
export const updateSettings = bindBackendMethod("updateSettings");
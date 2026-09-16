import { isMysqlBackendEnabled } from "./config.js";

const backendPromise = isMysqlBackendEnabled()
  ? import("./sqlStore.js")
  : import("./store.js");

function bindBackendMethod(methodName) {
  return async (...args) => {
    const backend = await backendPromise;
    return backend[methodName](...args);
  };
}

export const authenticateCustomer = bindBackendMethod("authenticateCustomer");
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
import { isMysqlBackendEnabled } from "./config.js";

const backend = isMysqlBackendEnabled()
  ? await import("./sqlStore.js")
  : await import("./store.js");

export const authenticateCustomer = backend.authenticateCustomer;
export const createCategory = backend.createCategory;
export const createCustomerAccount = backend.createCustomerAccount;
export const createOrder = backend.createOrder;
export const createProduct = backend.createProduct;
export const deleteProduct = backend.deleteProduct;
export const getBootstrap = backend.getBootstrap;
export const getCustomerAccount = backend.getCustomerAccount;
export const getSiteBootstrap = backend.getSiteBootstrap;
export const listCategories = backend.listCategories;
export const listCustomers = backend.listCustomers;
export const listOrders = backend.listOrders;
export const listProducts = backend.listProducts;
export const updateCategory = backend.updateCategory;
export const updateOrder = backend.updateOrder;
export const updateProduct = backend.updateProduct;
export const updateProductStock = backend.updateProductStock;
export const updateSettings = backend.updateSettings;
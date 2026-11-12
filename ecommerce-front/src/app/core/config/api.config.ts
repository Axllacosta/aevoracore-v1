import { environment } from '../../../environments/environment';

export const API_CONFIG = {
  baseUrl: environment.apiUrl,

  endpoints: {
    products: '/products',
    publicCatalog: '/products/catalog',
    publicCategories: '/products/catalog/categories',
    categories: '/categories',
  },
} as const;

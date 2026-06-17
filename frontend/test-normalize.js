import { normalizeData } from './src/utils/dataTransformers.js';

const mockApiResponse = {
  success: true,
  message: "Company subscriptions retrieved successfully",
  data: {
    data: [
      {
        id: "7426b8b0-3b84-46e2-b135-71cfd8a38cca",
        companyId: "28b71bfe-06ef-443b-a73c-8690fca3ac70",
        planId: 3,
        status: "Active"
      }
    ],
    pagination: { total: 11, page: 1, limit: 50, totalPages: 1 }
  }
};

const normalized = normalizeData(mockApiResponse);
console.log(JSON.stringify(normalized, null, 2));

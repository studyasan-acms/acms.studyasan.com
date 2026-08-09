export interface PaginationParams {
  page: number;
  limit: number;
  skip: number;
}

export const getPaginationParams = (page?: string, limit?: string): PaginationParams => {
  const pageNum = parseInt(page || '1', 10);
  const limitNum = parseInt(limit || '10', 10);
  
  const validPage = pageNum > 0 ? pageNum : 1;
  // Allow up to 1000 for dropdown/select use-cases; default 10
  const validLimit = limitNum > 0 && limitNum <= 1000 ? limitNum : 10;
  
  return {
    page: validPage,
    limit: validLimit,
    skip: (validPage - 1) * validLimit,
  };
};

export const createPaginatedResponse = <T>(
  data: T[],
  total: number,
  page: number,
  limit: number
) => {
  return {
    data,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
};
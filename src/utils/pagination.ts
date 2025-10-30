import { ParsedQs } from 'qs'

/**
 * Extracts pagination parameters from query.
 * Defaults: page = 1, limit = 10
 */
export const getPaginationParams = (query: ParsedQs) => {
  const page = Math.max(Number(query.page) || 1, 1)
  const limit = Math.max(Number(query.limit) || 10, 1)
  const skip = (page - 1) * limit

  return { page, limit, skip }
}

/**
 * Builds pagination metadata for consistent API responses.
 */
export const buildMetaPagination = ({
  page,
  limit,
  total,
}: {
  page: number
  limit: number
  total: number
}) => {
  const totalPages = Math.ceil(total / limit) || 1
  return {
    page,
    limit,
    total,
    totalPages,
  }
}

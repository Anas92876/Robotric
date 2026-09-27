/**
 * Represents a generic API response structure
 */
export interface ApiResponse<T> {
  data: T;
  message?: string;
  success: boolean;
  timestamp: string;
}

/**
 * Represents pagination information
 */
export interface Pagination {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}

/**
 * Represents a paginated API response
 */
export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: Pagination;
}

/**
 * Represents a generic key-value pair
 */
export interface KeyValuePair<T = string> {
  key: string;
  value: T;
  label?: string;
}

/**
 * Represents a select option
 */
export interface SelectOption {
  value: string | number;
  label: string;
  disabled?: boolean;
}

/**
 * Represents a breadcrumb item
 */
export interface BreadcrumbItem {
  label: string;
  path: string;
  active?: boolean;
}

/**
 * Represents a navigation menu item
 */
export interface NavItem {
  id: string;
  title: string;
  path: string;
  icon?: React.ReactNode;
  roles?: string[];
  requiresWro?: boolean;
  children?: NavItem[];
  divider?: boolean;
  external?: boolean;
  disabled?: boolean;
}


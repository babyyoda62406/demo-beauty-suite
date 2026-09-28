import { PaginationDto } from '../../../common/pagination.dto';

/**
 * Query for listing suppliers. Inherits pagination + free-text `search`
 * (matched against name / contact / email) from {@link PaginationDto}.
 */
export class QuerySuppliersDto extends PaginationDto {}

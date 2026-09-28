/**
 * Barrel de la capa compartida de componentes (FGD Beauty Suite).
 * Importa desde `@/components/common` en todas las páginas/features.
 */

// Layout de página
export { PageHeader, type PageHeaderProps, type BreadcrumbItem } from './PageHeader';
export { Toolbar, type ToolbarProps } from './Toolbar';

// Estados
export { EmptyState, type EmptyStateProps } from './EmptyState';
export { ErrorState, getErrorMessage, type ErrorStateProps } from './ErrorState';

// KPIs
export { StatCard, type StatCardProps, type StatDelta } from './StatCard';
export { StatGrid, type StatGridProps } from './StatGrid';

// Gráficas
export { ChartCard, type ChartCardProps } from './ChartCard';
export {
  LineChartCard,
  BarChartCard,
  DonutChartCard,
  CHART_COLORS,
  type ChartSeries,
  type BarChartCardProps,
  type DonutChartCardProps,
  type DonutDatum,
  type ValueFormatter,
} from './charts';

// Tabla
export { DataTable, type DataTableProps, type DataTablePagination } from './DataTable';
export { SearchInput, type SearchInputProps } from './SearchInput';
export { Pagination, type PaginationProps } from './Pagination';
export { MoneyCell, DateCell, StatusCell, type MoneyCellProps, type DateCellProps, type StatusCellProps } from './cells';

// Badges y texto
export { StatusBadge, STATUS_MAP, type StatusBadgeProps, type StatusConfig } from './StatusBadge';
export { MoneyText, type MoneyTextProps } from './MoneyText';

// Formularios
export { FormDialog, type FormDialogProps } from './FormDialog';
export { ConfirmDialog, type ConfirmDialogProps } from './ConfirmDialog';
export {
  FieldText,
  FieldNumber,
  FieldTextarea,
  FieldSelect,
  type FieldTextProps,
  type FieldNumberProps,
  type FieldTextareaProps,
  type FieldSelectProps,
  type SelectOption,
} from './fields';

// Overlays
export { Drawer, type DrawerProps } from './Drawer';

// Subida de imágenes (CMS)
export { ImageUpload, type ImageUploadProps } from './ImageUpload';

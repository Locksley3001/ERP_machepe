type Column<T> = {
  key: keyof T | string;
  header: string;
  render?: (row: T) => React.ReactNode;
};

type DataTableProps<T> = {
  columns: Column<T>[];
  rows: T[];
  emptyLabel?: string;
};

export function DataTable<T extends object>({
  columns,
  rows,
  emptyLabel = "No hay registros"
}: DataTableProps<T>) {
  return (
    <div className="table-shell">
      <table>
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={String(column.key)}>{column.header}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => {
            const record = row as Record<string, unknown>;
            const rowKey = record.id ?? record.code ?? record.name ?? index;

            return (
            <tr key={String(rowKey)}>
              {columns.map((column) => (
                <td key={String(column.key)}>
                  {column.render ? column.render(row) : String(record[String(column.key)] ?? "")}
                </td>
              ))}
            </tr>
            );
          })}
          {!rows.length ? (
            <tr>
              <td colSpan={columns.length}>{emptyLabel}</td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </div>
  );
}

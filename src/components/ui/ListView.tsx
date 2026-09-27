import React from "react";

interface ListViewProps<T> {
  items: T[];
  renderItem: (item: T) => React.ReactNode;
  className?: string;
  itemClassName?: string;
  headers?: React.ReactNode;
}

export function ListView<T>({
  items,
  renderItem,
  className = "min-w-full",
  itemClassName = "",
  headers,
}: ListViewProps<T>) {
  return (
    <table className={`${className} table-auto border-collapse`}>
      {headers && <thead className="bg-gray-50">{headers}</thead>}
      <tbody className="bg-white divide-y divide-gray-200">
        {items.map((item, index) => (
          <tr key={index} className={itemClassName}>
            {renderItem(item)}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

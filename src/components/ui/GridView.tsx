import React from "react";

interface GridViewProps<T> {
  items: T[];
  renderItem: (item: T) => React.ReactNode;
  className?: string;
  columnClassName?: string;
}

export function GridView<T>({
  items,
  renderItem,
  className = "grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4",
  columnClassName = "",
}: GridViewProps<T>) {
  return (
    <div className={className}>
      {items.map((item, index) => (
        <div key={index} className={columnClassName}>
          {renderItem(item)}
        </div>
      ))}
    </div>
  );
}

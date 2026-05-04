import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { getFromUserStorage, setInUserStorage } from "../utils/storageUtils";

type DataSource = "shopify" | "square";

interface DataSourceContextType {
  dataSource: DataSource;
  setDataSource: (source: DataSource) => void;
}

const DataSourceContext = createContext<DataSourceContextType | undefined>(undefined);

export function DataSourceProvider({ children }: { children: ReactNode }) {
  const [dataSource, setDataSourceState] = useState<DataSource>(() => {
    // Load from localStorage on first mount
    const saved = getFromUserStorage<DataSource>("selectedDataSource");
    return saved || "shopify";
  });

  // Save to localStorage whenever it changes
  useEffect(() => {
    setInUserStorage("selectedDataSource", dataSource);
    console.log("🔄 Global data source changed to:", dataSource);
  }, [dataSource]);

  const setDataSource = (source: DataSource) => {
    setDataSourceState(source);
  };

  return (
    <DataSourceContext.Provider value={{ dataSource, setDataSource }}>
      {children}
    </DataSourceContext.Provider>
  );
}

export function useDataSource() {
  const context = useContext(DataSourceContext);
  if (!context) {
    throw new Error("useDataSource must be used within DataSourceProvider");
  }
  return context;
}

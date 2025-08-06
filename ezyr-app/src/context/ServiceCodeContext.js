import { createContext, useState, useContext, useEffect } from "react";
export const ServiceCodeContext = createContext();
import data from "../config.json";

export function ServiceCodeProvider({ children }) {
  const [serviceCode, setServiceCode] = useState(null);
  const [config, setConfig] = useState(null); // Store matched config

  useEffect(() => {
    const servicecode = localStorage.getItem("servicecode");
    if (servicecode) {
      setServiceCode(servicecode); // Save service code in context
      const matchedConfig = data.find(
        (entry) => entry.servicecode === servicecode
      );
      if (matchedConfig) {
        setConfig(matchedConfig);
      }
    }
  }, []);

  return (
    <ServiceCodeContext.Provider
      value={{ serviceCode, setServiceCode, config, setConfig }}
    >
      {children}
    </ServiceCodeContext.Provider>
  );
}

// Custom hook for easier usage
export function useServiceCode() {
  return useContext(ServiceCodeContext);
}

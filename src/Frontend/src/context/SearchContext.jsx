// src/context/SearchContext.jsx
import React, { createContext, useContext, useState } from "react";

// Create Context
const SearchContext = createContext();

//Provider component that wraps App
export function SearchProvider({ children }) {
  const [searchQuery, setSearchQuery] = useState("");

  return (
    <SearchContext.Provider value={{ searchQuery, setSearchQuery }}>
      {children}
    </SearchContext.Provider>
  );
}

//Custom hook for easy usage
export function useSearch() {
  return useContext(SearchContext);
}

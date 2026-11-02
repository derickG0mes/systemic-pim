import { createContext } from "react";
import type { RestaurantContextValue } from "@/contexts/RestaurantContext";

export const RestaurantContext =
  createContext<RestaurantContextValue | null>(null);

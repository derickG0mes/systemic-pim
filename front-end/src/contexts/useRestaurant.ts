import { useContext } from "react";
import { RestaurantContext } from "@/contexts/restaurant-context";

export const useRestaurant = () => {
  const ctx = useContext(RestaurantContext);
  if (!ctx)
    throw new Error("useRestaurant must be used within RestaurantProvider");
  return ctx;
};

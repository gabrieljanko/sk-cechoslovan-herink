import { Switch, Route, useLocation } from "wouter";
import { useEffect } from "react";
import Games from "./games";
import Players from "./players";
import Stats from "./stats";

export default function Home() {
  const [_, setLocation] = useLocation();
  
  // Redirect to the games tab as the default landing page
  useEffect(() => {
    setLocation("/");
  }, [setLocation]);

  return <Games />;
}

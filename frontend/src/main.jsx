import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import "./lib/i18n";
import "./styles.css";
import Home from "./components/Home";
import MapRequest from "./components/MapRequest";
import Room from "./components/Room";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/room/:code" element={<Room />} />
        <Route path="/request-map" element={<MapRequest />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);

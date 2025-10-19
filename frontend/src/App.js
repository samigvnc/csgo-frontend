// src/App.js
import React from "react";
import "./App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Layout from "./components/Layout";
import Auth from "./pages/Auth";
import Home from "./pages/Home";
import Cases from "./pages/Cases";
import CaseOpening from "./pages/CaseOpening";
import Inventory from "./pages/Inventory";
import Profile from "./pages/Profile";
import Battles from "./pages/Battles";
import Contracts from "./pages/Contracts";
import { Toaster } from "./components/ui/toaster";
import Admin from "./Admin";

// Protected Route Component
const ProtectedRoute = ({ children }) => {
  const token = localStorage.getItem("hellcase_token");
  if (!token) {
    return <Navigate to="/auth" replace />;
  }
  return children;
};

// Public Route Component (redirect if logged in)
const PublicRoute = ({ children }) => {
  const token = localStorage.getItem("hellcase_token");
  if (token) {
    return <Navigate to="/" replace />;
  }
  return children;
};

function App() {
  return (
    <div className="App">
      <BrowserRouter>
        <Routes>
          {/* Auth Route */}
          <Route
            path="/auth"
            element={
              <PublicRoute>
                <Auth />
              </PublicRoute>
            }
          />

          {/* Admin Route (ayrı giriş ekrani içerir, Layout kullanmıyoruz) */}
          <Route path="/admin" element={<Admin />} />

          {/* Protected Routes with Layout */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Layout>
                  <Home />
                </Layout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/cases"
            element={
              <ProtectedRoute>
                <Layout>
                  <Cases />
                </Layout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/case/:id"
            element={
              <ProtectedRoute>
                <Layout>
                  <CaseOpening />
                </Layout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/inventory"
            element={
              <ProtectedRoute>
                <Layout>
                  <Inventory />
                </Layout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <Layout>
                  <Profile />
                </Layout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/battles"
            element={
              <ProtectedRoute>
                <Layout>
                  <Battles />
                </Layout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/contracts"
            element={
              <ProtectedRoute>
                <Layout>
                  <Contracts />
                </Layout>
              </ProtectedRoute>
            }
          />

          {/* Placeholder routes */}
          <Route
            path="/pickem"
            element={
              <ProtectedRoute>
                <Layout>
                  <div className="min-h-screen flex items-center justify-center">
                    <h1 className="text-4xl text-white">Pick&apos;em - Yakında</h1>
                  </div>
                </Layout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/activities"
            element={
              <ProtectedRoute>
                <Layout>
                  <div className="min-h-screen flex items-center justify-center">
                    <h1 className="text-4xl text-white">Etkinlikler - Yakında</h1>
                  </div>
                </Layout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/contests"
            element={
              <ProtectedRoute>
                <Layout>
                  <div className="min-h-screen flex items-center justify-center">
                    <h1 className="text-4xl text-white">Çekilişler - Yakında</h1>
                  </div>
                </Layout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/levels"
            element={
              <ProtectedRoute>
                <Layout>
                  <div className="min-h-screen flex items-center justify-center">
                    <h1 className="text-4xl text-white">LVL Ödülleri - Yakında</h1>
                  </div>
                </Layout>
              </ProtectedRoute>
            }
          />
        </Routes>
      </BrowserRouter>
      <Toaster />
    </div>
  );
}

export default App;

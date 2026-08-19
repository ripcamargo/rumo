import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ToastProvider } from './contexts/ToastContext';
import { QuickRegisterProvider } from './contexts/QuickRegisterContext';
import { SelectedDateProvider } from './contexts/SelectedDateContext';
import { ProtectedRoute } from './routes/ProtectedRoute';
import { PublicOnlyRoute } from './routes/PublicOnlyRoute';
import { AppLayout } from './components/layout/AppLayout';
import Login from './pages/Login';
import RegisterAccount from './pages/RegisterAccount';
import ForgotPassword from './pages/ForgotPassword';
import Dashboard from './pages/Dashboard';
import History from './pages/History';
import Measurements from './pages/Measurements';
import Exercises from './pages/Exercises';
import Foods from './pages/Foods';
import FoodCategories from './pages/FoodCategories';
import Settings from './pages/Settings';

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <SelectedDateProvider>
          <QuickRegisterProvider>
            <BrowserRouter>
              <Routes>
                <Route
                  path="/login"
                  element={
                    <PublicOnlyRoute>
                      <Login />
                    </PublicOnlyRoute>
                  }
                />
                <Route
                  path="/cadastro"
                  element={
                    <PublicOnlyRoute>
                      <RegisterAccount />
                    </PublicOnlyRoute>
                  }
                />
                <Route
                  path="/recuperar-senha"
                  element={
                    <PublicOnlyRoute>
                      <ForgotPassword />
                    </PublicOnlyRoute>
                  }
                />

                <Route
                  element={
                    <ProtectedRoute>
                      <AppLayout />
                    </ProtectedRoute>
                  }
                >
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/historico" element={<History />} />
                  <Route path="/medidas" element={<Measurements />} />
                  <Route path="/exercicios" element={<Exercises />} />
                  <Route path="/alimentos" element={<Foods />} />
                  <Route path="/categorias-alimentos" element={<FoodCategories />} />
                  <Route path="/configuracoes" element={<Settings />} />
                </Route>
              </Routes>
            </BrowserRouter>
          </QuickRegisterProvider>
        </SelectedDateProvider>
      </ToastProvider>
    </AuthProvider>
  );
}

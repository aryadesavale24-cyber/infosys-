import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import SessionTimeoutModal from './components/SessionTimeoutModal';
import { useSessionTimeout } from './hooks/useSessionTimeout';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import Dashboard from './pages/Dashboard';
import AdminUsers from './pages/AdminUsers';
import Unauthorized from './pages/Unauthorized';
import Products from './pages/Products';
import AddProduct from './pages/AddProduct';
import StockOut from './pages/StockOut';
import StockIn from './pages/StockIn';
import SupplierRegistration from './pages/SupplierRegistration';
import PendingSuppliers from './pages/PendingSuppliers';
import AssignStaffCategory from './pages/AssignStaffCategory';
import StaffStockOut from './pages/StaffStockOut';
import AssignManagerCategory from './pages/AssignManagerCategory';
import ManagerDashboard from './pages/ManagerDashboard';
import StaffProducts from './pages/StaffProducts';
import Reports from './pages/Reports';
import ManagerApprovals from './pages/ManagerApprovals';
import StaffApprovalRequests from './pages/StaffApprovalRequests';
import StaffTransactions from './pages/StaffTransactions';
import SupplierHistory from './pages/SupplierHistory';
import StaffReturnRequests from './pages/StaffReturnRequests';
import ManagerReturnApprovals from './pages/ManagerReturnApprovals';
import AdminReturnHistory from './pages/AdminReturnHistory';
import StockAlerts from './pages/StockAlerts';
import LowStockProducts from './pages/LowStockProducts';
import AnalyticsDashboard from './pages/AnalyticsDashboard';
import LandingPage from './pages/LandingPage';
import { Role } from './types';

const AppContent: React.FC = () => {
    const { showWarning, remainingTime, extendSession, handleLogout } = useSessionTimeout({
        timeoutMinutes: 30,    // Total inactivity timeout (1 minute for testing)
        warningMinutes: 1,  // Warning before logout (30 seconds for testing)
    });

    return (
        <>
            <Routes>
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route path="/forgot-password" element={<ForgotPassword />} />
                <Route path="/reset-password" element={<ResetPassword />} />
                <Route path="/unauthorized" element={<Unauthorized />} />

                {/* Public Supplier Registration */}
                <Route path="/supplier/register" element={<SupplierRegistration />} />

                <Route
                    path="/dashboard"
                    element={
                        <ProtectedRoute>
                            <Dashboard />
                        </ProtectedRoute>
                    }
                />

                <Route
                    path="/admin/users"
                    element={
                        <ProtectedRoute allowedRoles={[Role.ADMIN]}>
                            <AdminUsers />
                        </ProtectedRoute>
                    }
                />

                {/* Admin: Pending Suppliers */}
                <Route
                    path="/admin/suppliers/pending"
                    element={
                        <ProtectedRoute allowedRoles={[Role.ADMIN]}>
                            <PendingSuppliers />
                        </ProtectedRoute>
                    }
                />

                {/* Admin: Supplier History */}
                <Route
                    path="/admin/suppliers/history"
                    element={
                        <ProtectedRoute allowedRoles={[Role.ADMIN]}>
                            <SupplierHistory />
                        </ProtectedRoute>
                    }
                />

                <Route
                    path="/products"
                    element={
                        <ProtectedRoute>
                            <Products />
                        </ProtectedRoute>
                    }
                />

                <Route
                    path="/products/add"
                    element={
                        <ProtectedRoute allowedRoles={[Role.ADMIN, Role.MANAGER]}>
                            <AddProduct />
                        </ProtectedRoute>
                    }
                />

                {/* Manager/Admin: Stock In */}
                <Route
                    path="/stock/in"
                    element={
                        <ProtectedRoute allowedRoles={[Role.ADMIN, Role.MANAGER]}>
                            <StockIn />
                        </ProtectedRoute>
                    }
                />

                {/* All Roles: Stock Out */}
                <Route
                    path="/stock/out"
                    element={
                        <ProtectedRoute>
                            <StockOut />
                        </ProtectedRoute>
                    }
                />

                {/* Manager/Admin: Assign categories to staff */}
                <Route
                    path="/manager/assign-staff"
                    element={
                        <ProtectedRoute allowedRoles={[Role.ADMIN, Role.MANAGER]}>
                            <AssignStaffCategory />
                        </ProtectedRoute>
                    }
                />

                {/* Staff: Stock out only from assigned categories */}
                <Route
                    path="/staff/stock-out"
                    element={
                        <ProtectedRoute allowedRoles={[Role.STAFF]}>
                            <StaffStockOut />
                        </ProtectedRoute>
                    }
                />

                {/* Staff: scoped product view (only their manager-assigned categories) */}
                <Route
                    path="/staff/my-products"
                    element={
                        <ProtectedRoute allowedRoles={[Role.STAFF]}>
                            <StaffProducts />
                        </ProtectedRoute>
                    }
                />

                {/* Manager: scoped product view + co-manager panel */}
                <Route
                    path="/manager/my-products"
                    element={
                        <ProtectedRoute allowedRoles={[Role.MANAGER]}>
                            <ManagerDashboard />
                        </ProtectedRoute>
                    }
                />

                {/* Admin ONLY: Assign categories to managers (max 3) */}
                <Route
                    path="/admin/assign-manager"
                    element={
                        <ProtectedRoute allowedRoles={[Role.ADMIN]}>
                            <AssignManagerCategory />
                        </ProtectedRoute>
                    }
                />

                <Route path="/reports"
                    element={
                        <ProtectedRoute allowedRoles={[Role.ADMIN, Role.MANAGER]}>
                            <Reports />
                        </ProtectedRoute>
                    }
                />

                <Route path="/manager/approvals"
                    element={
                        <ProtectedRoute allowedRoles={[Role.MANAGER, Role.ADMIN]}>
                            <ManagerApprovals />
                        </ProtectedRoute>
                    }
                />

                <Route path="/staff/my-requests"
                    element={
                        <ProtectedRoute allowedRoles={[Role.STAFF]}>
                            <StaffApprovalRequests />
                        </ProtectedRoute>
                    }
                />

                <Route path="/staff/my-transactions"
                    element={
                        <ProtectedRoute allowedRoles={[Role.STAFF]}>
                            <StaffTransactions />
                        </ProtectedRoute>
                    }
                />

                {/* Staff: raise & track customer return requests */}
                <Route path="/staff/returns"
                    element={
                        <ProtectedRoute allowedRoles={[Role.STAFF]}>
                            <StaffReturnRequests />
                        </ProtectedRoute>
                    }
                />

                {/* Manager / Admin: review & decide on return requests */}
                <Route path="/manager/returns"
                    element={
                        <ProtectedRoute allowedRoles={[Role.MANAGER, Role.ADMIN]}>
                            <ManagerReturnApprovals />
                        </ProtectedRoute>
                    }
                />

                {/* Admin: full system-wide return history */}
                <Route path="/admin/returns"
                    element={
                        <ProtectedRoute allowedRoles={[Role.ADMIN]}>
                            <AdminReturnHistory />
                        </ProtectedRoute>
                    }
                />

                {/* All roles: stock alerts management */}
                <Route path="/alerts"
                    element={
                        <ProtectedRoute>
                            <StockAlerts />
                        </ProtectedRoute>
                    }
                />

                {/* Admin/Manager: Full analytics dashboard */}
                <Route path="/analytics"
                    element={
                        <ProtectedRoute allowedRoles={[Role.ADMIN, Role.MANAGER]}>
                            <AnalyticsDashboard />
                        </ProtectedRoute>
                    }
                />

                {/* All roles: low stock products + inline stock-in */}
                <Route path="/low-stock"
                    element={
                        <ProtectedRoute>
                            <LowStockProducts />
                        </ProtectedRoute>
                    }
                />

                <Route path="/" element={<LandingPage />} />
                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>

            {/* Session Timeout Warning Modal */}
            <SessionTimeoutModal
                isOpen={showWarning}
                remainingTime={remainingTime}
                onExtend={extendSession}
                onLogout={handleLogout}
            />
        </>
    );
};

const App: React.FC = () => {
    return (
        <BrowserRouter>
            <AuthProvider>
                <AppContent />
            </AuthProvider>
        </BrowserRouter>
    );
};

export default App;

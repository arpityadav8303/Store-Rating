import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import AdminMainDashboard from './AdminMainDashboard';
import AdminUsers from './AdminUsers';
import AdminStores from './AdminStores';

const AdminDashboard = () => {
  return (
    <Routes>
      <Route path="/dashboard" element={<AdminMainDashboard />} />
      <Route path="/users" element={<AdminUsers />} />
      <Route path="/stores" element={<AdminStores />} />
      <Route path="/" element={<Navigate to="/admin/dashboard" replace />} />
    </Routes>
  );
};

export default AdminDashboard;






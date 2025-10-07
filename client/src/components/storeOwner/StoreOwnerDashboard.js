import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import StoreOwnerMainDashboard from './StoreOwnerMainDashboard';
import StoreOwnerRatings from './StoreOwnerRatings';
import StoreOwnerUsers from './StoreOwnerUsers';

const StoreOwnerDashboard = () => {
  return (
    <Routes>
      <Route path="/dashboard" element={<StoreOwnerMainDashboard />} />
      <Route path="/ratings" element={<StoreOwnerRatings />} />
      <Route path="/users" element={<StoreOwnerUsers />} />
      <Route path="/" element={<Navigate to="/store-owner/dashboard" replace />} />
    </Routes>
  );
};

export default StoreOwnerDashboard;


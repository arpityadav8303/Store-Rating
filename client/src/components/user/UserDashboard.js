import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import UserStores from './UserStores';
import UserRatings from './UserRatings';

const UserDashboard = () => {
  return (
    <Routes>
      <Route path="/stores" element={<UserStores />} />
      <Route path="/ratings" element={<UserRatings />} />
      <Route path="/" element={<Navigate to="/user/stores" replace />} />
    </Routes>
  );
};

export default UserDashboard;


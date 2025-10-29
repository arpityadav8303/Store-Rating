import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import LoadingSpinner from '../common/LoadingSpinner';

const PrivateRoute = function(props) {
  const children = props.children;
  const allowedRoles = props.allowedRoles;
  
  const authContext = useAuth();
  const user = authContext.user;
  const loading = authContext.loading;
  
  const location = useLocation();

  // Show loading spinner while checking auth
  if (loading) {
    return <LoadingSpinner message="Checking authentication..." />;
  }

  // Check if user is logged in
  if (!user) {
    // Redirect to login page
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Check if user role is allowed
  let hasAllowedRoles = false;
  if (allowedRoles && allowedRoles.length > 0) {
    hasAllowedRoles = true;
  }
  
  if (hasAllowedRoles) {
    let userRole = user.role;
    let isRoleAllowed = false;
    
    for (let i = 0; i < allowedRoles.length; i++) {
      if (allowedRoles[i] === userRole) {
        isRoleAllowed = true;
        break;
      }
    }
    
    if (!isRoleAllowed) {
      // Redirect to appropriate dashboard
      let dashboardPath = '/user';
      
      if (userRole === 'admin') {
        dashboardPath = '/admin';
      } else if (userRole === 'store_owner') {
        dashboardPath = '/store-owner';
      }
      
      return <Navigate to={dashboardPath} replace />;
    }
  }

  return children;
};

export default PrivateRoute;


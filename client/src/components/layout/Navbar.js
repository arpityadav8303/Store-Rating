import React, { useState } from 'react';
import { Navbar as BSNavbar, Nav, Container, Dropdown, Button } from 'react-bootstrap';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'react-toastify';

const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [showPasswordModal, setShowPasswordModal] = useState(false);

  const handleLogout = async () => {
    try {
      await logout();
      toast.success('Logged out successfully');
      navigate('/login');
    } catch (error) {
      toast.error('Logout failed');
    }
  };

  const handlePasswordUpdate = () => {
    setShowPasswordModal(true);
  };

  const getDashboardTitle = () => {
    if (!user) return 'Store Rating System';
    
    switch (user.role) {
      case 'admin':
        return 'Admin Dashboard';
      case 'store_owner':
        return 'Store Owner Dashboard';
      case 'user':
        return 'User Dashboard';
      default:
        return 'Store Rating System';
    }
  };

  return (
    <>
      <BSNavbar bg="dark" variant="dark" expand="lg" className="shadow">
        <Container fluid>
          <BSNavbar.Brand 
            className="fw-bold"
            style={{ cursor: 'pointer' }}
            onClick={() => navigate('/')}
          >
            {getDashboardTitle()}
          </BSNavbar.Brand>
          
          <BSNavbar.Toggle aria-controls="basic-navbar-nav" />
          
          <BSNavbar.Collapse id="basic-navbar-nav">
            <Nav className="me-auto">
              {user && (
                <>
                  {user.role === 'admin' && (
                    <>
                      <Nav.Link onClick={() => navigate('/admin/dashboard')}>
                        Dashboard
                      </Nav.Link>
                      <Nav.Link onClick={() => navigate('/admin/users')}>
                        Users
                      </Nav.Link>
                      <Nav.Link onClick={() => navigate('/admin/stores')}>
                        Stores
                      </Nav.Link>
                    </>
                  )}
                  
                  {user.role === 'user' && (
                    <>
                      <Nav.Link onClick={() => navigate('/user/stores')}>
                        Browse Stores
                      </Nav.Link>
                      <Nav.Link onClick={() => navigate('/user/ratings')}>
                        My Ratings
                      </Nav.Link>
                    </>
                  )}
                  
                  {user.role === 'store_owner' && (
                    <>
                      <Nav.Link onClick={() => navigate('/store-owner/dashboard')}>
                        Dashboard
                      </Nav.Link>
                      <Nav.Link onClick={() => navigate('/store-owner/ratings')}>
                        Ratings
                      </Nav.Link>
                      <Nav.Link onClick={() => navigate('/store-owner/users')}>
                        Users
                      </Nav.Link>
                    </>
                  )}
                </>
              )}
            </Nav>
            
            <Nav>
              {user ? (
                <Dropdown align="end">
                  <Dropdown.Toggle variant="outline-light" id="dropdown-basic">
                    <i className="bi bi-person-circle me-1"></i>
                    {user.name}
                  </Dropdown.Toggle>
                  
                  <Dropdown.Menu>
                    <Dropdown.Header>
                      <div className="text-muted small">
                        {user.email}
                      </div>
                      <div className="badge bg-primary">
                        {user.role.replace('_', ' ').toUpperCase()}
                      </div>
                    </Dropdown.Header>
                    <Dropdown.Divider />
                    <Dropdown.Item onClick={handlePasswordUpdate}>
                      <i className="bi bi-key me-2"></i>
                      Change Password
                    </Dropdown.Item>
                    <Dropdown.Divider />
                    <Dropdown.Item onClick={handleLogout} className="text-danger">
                      <i className="bi bi-box-arrow-right me-2"></i>
                      Logout
                    </Dropdown.Item>
                  </Dropdown.Menu>
                </Dropdown>
              ) : (
                <div className="d-flex gap-2">
                  <Button 
                    variant="outline-light" 
                    onClick={() => navigate('/login')}
                    size="sm"
                  >
                    Login
                  </Button>
                  <Button 
                    variant="primary" 
                    onClick={() => navigate('/register')}
                    size="sm"
                  >
                    Register
                  </Button>
                </div>
              )}
            </Nav>
          </BSNavbar.Collapse>
        </Container>
      </BSNavbar>
      
      {/* Password Update Modal */}
      {showPasswordModal && (
        <PasswordUpdateModal 
          show={showPasswordModal}
          onHide={() => setShowPasswordModal(false)}
        />
      )}
    </>
  );
};

// Password Update Modal Component
const PasswordUpdateModal = ({ show, onHide }) => {
  const [formData, setFormData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [loading, setLoading] = useState(false);
  const { updatePassword } = useAuth();
  const { toast } = require('react-toastify');

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (formData.newPassword !== formData.confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }

    setLoading(true);
    try {
      const result = await updatePassword(formData.currentPassword, formData.newPassword);
      if (result.success) {
        toast.success('Password updated successfully');
        onHide();
        setFormData({
          currentPassword: '',
          newPassword: '',
          confirmPassword: ''
        });
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      toast.error('Password update failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`modal fade ${show ? 'show' : ''}`} style={{ display: show ? 'block' : 'none' }}>
      <div className="modal-dialog">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">Change Password</h5>
            <button 
              type="button" 
              className="btn-close" 
              onClick={onHide}
            ></button>
          </div>
          
          <form onSubmit={handleSubmit}>
            <div className="modal-body">
              <div className="mb-3">
                <label className="form-label">Current Password</label>
                <input
                  type="password"
                  className="form-control"
                  name="currentPassword"
                  value={formData.currentPassword}
                  onChange={handleChange}
                  required
                />
              </div>
              
              <div className="mb-3">
                <label className="form-label">New Password</label>
                <input
                  type="password"
                  className="form-control"
                  name="newPassword"
                  value={formData.newPassword}
                  onChange={handleChange}
                  required
                  minLength={8}
                  maxLength={16}
                />
                <div className="form-text">
                  Password must be 8-16 characters with at least one uppercase letter and one special character.
                </div>
              </div>
              
              <div className="mb-3">
                <label className="form-label">Confirm New Password</label>
                <input
                  type="password"
                  className="form-control"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>
            
            <div className="modal-footer">
              <button 
                type="button" 
                className="btn btn-secondary" 
                onClick={onHide}
                disabled={loading}
              >
                Cancel
              </button>
              <button 
                type="submit" 
                className="btn btn-primary"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                    Updating...
                  </>
                ) : (
                  'Update Password'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Navbar;






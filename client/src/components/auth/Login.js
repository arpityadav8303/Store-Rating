import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Form, Button, Alert } from 'react-bootstrap';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'react-toastify';
import LoadingSpinner from '../common/LoadingSpinner';

const Login = function() {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const authContext = useAuth();
  const login = authContext.login;
  const user = authContext.user;
  
  const navigate = useNavigate();
  const location = useLocation();

  // Check if user is already logged in
  useEffect(function() {
    if (user) {
      let dashboardPath = getDashboardPath();
      let from = location.state;
      
      if (from && from.from && from.from.pathname) {
        dashboardPath = from.from.pathname;
      }
      
      navigate(dashboardPath, { replace: true });
    }
  }, [user, navigate, location]);

  const getDashboardPath = function() {
    let userRole = '';
    if (user) {
      userRole = user.role;
    }
    
    let path = '/login';
    
    if (userRole === 'admin') {
      path = '/admin/dashboard';
    } else if (userRole === 'store_owner') {
      path = '/store-owner/dashboard';
    } else if (userRole === 'user') {
      path = '/user/stores';
    }
    
    return path;
  };

  const handleChange = function(e) {
    const fieldName = e.target.name;
    const fieldValue = e.target.value;
    
    const newFormData = {...formData};
    newFormData[fieldName] = fieldValue;
    setFormData(newFormData);
    
    // Clear error when user types
    if (errors[fieldName]) {
      const newErrors = {...errors};
      newErrors[fieldName] = '';
      setErrors(newErrors);
    }
  };

  const validateForm = function() {
    const newErrors = {};

    // Check email
    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else {
      const emailPattern = /\S+@\S+\.\S+/;
      const isValidEmail = emailPattern.test(formData.email);
      if (!isValidEmail) {
        newErrors.email = 'Please enter a valid email address';
      }
    }

    // Check password
    if (!formData.password) {
      newErrors.password = 'Password is required';
    }

    setErrors(newErrors);
    
    const errorKeys = Object.keys(newErrors);
    if (errorKeys.length === 0) {
      return true;
    } else {
      return false;
    }
  };

  const handleSubmit = async function(e) {
    e.preventDefault();

    const isValid = validateForm();
    if (!isValid) {
      return;
    }

    setLoading(true);
    
    try {
      const email = formData.email;
      const password = formData.password;
      const result = await login(email, password);
      
      if (result.success) {
        toast.success('Login successful!');
        const dashboardPath = getDashboardPath();
        navigate(dashboardPath, { replace: true });
      } else {
        let errorMessage = 'Login failed';
        if (result.message) {
          errorMessage = result.message;
        }
        toast.error(errorMessage);
      }
    } catch (error) {
      toast.error('An error occurred during login');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container className="py-5">
      <Row className="justify-content-center">
        <Col md={6} lg={5} xl={4}>
          <Card className="shadow">
            <Card.Header className="text-center bg-primary text-white">
              <h4 className="mb-0">Login</h4>
            </Card.Header>
            <Card.Body className="p-4">
              <Form onSubmit={handleSubmit}>
                <Form.Group className="mb-3">
                  <Form.Label>Email Address</Form.Label>
                  <Form.Control
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    isInvalid={!!errors.email}
                    placeholder="Enter your email"
                    disabled={loading}
                  />
                  <Form.Control.Feedback type="invalid">
                    {errors.email}
                  </Form.Control.Feedback>
                </Form.Group>

                <Form.Group className="mb-3">
                  <Form.Label>Password</Form.Label>
                  <Form.Control
                    type="password"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    isInvalid={!!errors.password}
                    placeholder="Enter your password"
                    disabled={loading}
                  />
                  <Form.Control.Feedback type="invalid">
                    {errors.password}
                  </Form.Control.Feedback>
                </Form.Group>

                <Button
                  variant="primary"
                  type="submit"
                  className="w-100 mb-3"
                  disabled={loading}
                  size="lg"
                >
                  {loading ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                      Logging in...
                    </>
                  ) : (
                    'Login'
                  )}
                </Button>
              </Form>

            </Card.Body>
          </Card>

          <div className="text-center mt-4">
            <p className="text-muted">
              Don't have an account?{' '}
              <Link to="/register" className="text-decoration-none fw-bold">
                Register here
              </Link>
            </p>
            <small className="text-muted">
              You can register as a Normal User, Store Owner, or Admin
            </small>
          </div>
        </Col>
      </Row>
    </Container>
  );
};

export default Login;
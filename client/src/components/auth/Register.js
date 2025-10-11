import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Form, Button, Alert } from 'react-bootstrap';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'react-toastify';
import LoadingSpinner from '../common/LoadingSpinner';

const Register = function() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    address: '',
    password: '',
    confirmPassword: '',
    role: 'user'
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const authContext = useAuth();
  const register = authContext.register;
  const user = authContext.user;
  
  const navigate = useNavigate();

  // Check if user is already logged in
  useEffect(function() {
    if (user) {
      let dashboardPath = '/user/stores';
      
      if (user.role === 'admin') {
        dashboardPath = '/admin/dashboard';
      } else if (user.role === 'store_owner') {
        dashboardPath = '/store-owner/dashboard';
      }
      
      navigate(dashboardPath, { replace: true });
    }
  }, [user, navigate]);

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

    // Check name
    if (!formData.name) {
      newErrors.name = 'Name is required';
    } else if (formData.name.length < 3) {
      newErrors.name = 'Name must be at least 3 characters';
    } else if (formData.name.length > 60) {
      newErrors.name = 'Name cannot exceed 60 characters';
    }

    // Check email
    const emailPattern = /\S+@\S+\.\S+/;
    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!emailPattern.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    // Check address
    if (!formData.address) {
      newErrors.address = 'Address is required';
    } else if (formData.address.length > 400) {
      newErrors.address = 'Address cannot exceed 400 characters';
    }

    // Check password
    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
    } else if (formData.password.length > 16) {
      newErrors.password = 'Password cannot exceed 16 characters';
    } else {
      const passwordPattern = /(?=.*[A-Z])(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?])/;
      if (!passwordPattern.test(formData.password)) {
        newErrors.password = 'Password must contain at least one uppercase letter and one special character';
      }
    }

    // Check confirm password
    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
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
      const registrationData = {
        name: formData.name,
        email: formData.email,
        address: formData.address,
        password: formData.password,
        role: formData.role
      };
      
      const result = await register(registrationData);
      
      if (result.success) {
        toast.success('Registration successful!');
        
        let dashboardPath = '/user/stores';
        if (formData.role === 'admin') {
          dashboardPath = '/admin/dashboard';
        } else if (formData.role === 'store_owner') {
          dashboardPath = '/store-owner/dashboard';
        }
        
        navigate(dashboardPath, { replace: true });
      } else {
        if (result.errors && result.errors.length > 0) {
          const fieldErrors = {};
          const errorArray = result.errors;
          
          for (let i = 0; i < errorArray.length; i++) {
            const error = errorArray[i];
            const fieldName = error.path;
            const errorMsg = error.msg;
            fieldErrors[fieldName] = errorMsg;
          }
          
          setErrors(fieldErrors);
        }
        
        let errorMessage = 'Registration failed';
        if (result.message) {
          errorMessage = result.message;
        }
        toast.error(errorMessage);
      }
    } catch (error) {
      toast.error('An error occurred during registration');
    } finally {
      setLoading(false);
    }
  };

  const getPasswordStrength = function() {
    const password = formData.password;
    let strength = 0;
    let feedback = [];

    // Check length minimum
    if (password.length >= 8) {
      strength = strength + 1;
    } else {
      feedback.push('At least 8 characters');
    }

    // Check length maximum
    if (password.length <= 16) {
      strength = strength + 1;
    } else {
      feedback.push('Maximum 16 characters');
    }

    // Check uppercase
    const hasUppercase = /[A-Z]/.test(password);
    if (hasUppercase) {
      strength = strength + 1;
    } else {
      feedback.push('One uppercase letter');
    }

    // Check special character
    const hasSpecial = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);
    if (hasSpecial) {
      strength = strength + 1;
    } else {
      feedback.push('One special character');
    }

    return { strength: strength, feedback: feedback };
  };

  const passwordStrength = getPasswordStrength();

  return (
    <Container className="py-5">
      <Row className="justify-content-center">
        <Col md={8} lg={6}>
          <Card className="shadow">
            <Card.Header className="text-center bg-primary text-white">
              <h4 className="mb-0">Create Account</h4>
            </Card.Header>
            <Card.Body className="p-4">
              <Form onSubmit={handleSubmit}>
                <Row>
                  <Col md={12}>
                    <Form.Group className="mb-3">
                      <Form.Label>Full Name</Form.Label>
                      <Form.Control
                        type="text"
                        name="name"
                        value={formData.name}
                        onChange={handleChange}
                        isInvalid={!!errors.name}
                        placeholder="Enter your full name (3-60 characters)"
                        disabled={loading}
                      />
                      <Form.Control.Feedback type="invalid">
                        {errors.name}
                      </Form.Control.Feedback>
                      <Form.Text className="text-muted">
                        {formData.name.length}/60 characters
                      </Form.Text>
                    </Form.Group>
                  </Col>
                </Row>

                <Row>
                  <Col md={6}>
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
                  </Col>
                  <Col md={6}>
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
                      {formData.password && (
                        <div className="mt-2">
                          <div className="progress" style={{ height: '5px' }}>
                            <div 
                              className={
                                'progress-bar ' + 
                                (passwordStrength.strength <= 1 ? 'bg-danger' :
                                passwordStrength.strength <= 2 ? 'bg-warning' :
                                passwordStrength.strength <= 3 ? 'bg-info' : 'bg-success')
                              }
                              style={{ width: (passwordStrength.strength / 4) * 100 + '%' }}
                            ></div>
                          </div>
                          <small className="text-muted">
                            {passwordStrength.feedback.length > 0 && 
                              'Missing: ' + passwordStrength.feedback.join(', ')
                            }
                          </small>
                        </div>
                      )}
                    </Form.Group>
                  </Col>
                </Row>

                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Confirm Password</Form.Label>
                      <Form.Control
                        type="password"
                        name="confirmPassword"
                        value={formData.confirmPassword}
                        onChange={handleChange}
                        isInvalid={!!errors.confirmPassword}
                        placeholder="Confirm your password"
                        disabled={loading}
                      />
                      <Form.Control.Feedback type="invalid">
                        {errors.confirmPassword}
                      </Form.Control.Feedback>
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Address</Form.Label>
                      <Form.Control
                        type="text"
                        name="address"
                        value={formData.address}
                        onChange={handleChange}
                        isInvalid={!!errors.address}
                        placeholder="Enter your address"
                        disabled={loading}
                      />
                      <Form.Control.Feedback type="invalid">
                        {errors.address}
                      </Form.Control.Feedback>
                      <Form.Text className="text-muted">
                        {formData.address.length}/400 characters
                      </Form.Text>
                    </Form.Group>
                  </Col>
                </Row>

                <Row>
                  <Col md={12}>
                    <Form.Group className="mb-3">
                      <Form.Label>Account Type</Form.Label>
                      <Form.Select
                        name="role"
                        value={formData.role}
                        onChange={handleChange}
                        disabled={loading}
                        className="mb-2"
                      >
                        <option value="user">Normal User - Browse and rate stores</option>
                        <option value="store_owner">Store Owner - Manage store ratings</option>
                        <option value="admin">Admin - Manage users and stores</option>
                      </Form.Select>
                      <Form.Text className="text-muted">
                        <strong>Normal User:</strong> Browse stores and submit ratings<br/>
                        <strong>Store Owner:</strong> View ratings and analytics for your store<br/>
                        <strong>Admin:</strong> Manage all users and stores on the platform
                      </Form.Text>
                    </Form.Group>
                  </Col>
                </Row>

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
                      Creating Account...
                    </>
                  ) : (
                    'Create Account'
                  )}
                </Button>
              </Form>

              <div className="text-center">
                <p className="mb-0">
                  Already have an account?{' '}
                  <Link to="/login" className="text-decoration-none">
                    Login here
                  </Link>
                </p>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default Register;
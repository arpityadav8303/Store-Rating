import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Table, Form, Button, Spinner, Alert, Badge, Modal } from 'react-bootstrap';
import axios from 'axios';
import { toast } from 'react-toastify';

const AdminUsers = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('desc');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [userStoreInfo, setUserStoreInfo] = useState(null);
  const [pagination, setPagination] = useState({});
  const [currentPage, setCurrentPage] = useState(1);
  
  const [createForm, setCreateForm] = useState({
    name: '',
    email: '',
    password: '',
    address: '',
    role: 'user'
  });

  const [formErrors, setFormErrors] = useState({});

  useEffect(() => {
    fetchUsers();
  }, [searchTerm, roleFilter, sortBy, sortOrder, currentPage]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        search: searchTerm,
        role: roleFilter,
        sortBy,
        sortOrder,
        page: currentPage,
        limit: '10'
      });
      
      const response = await axios.get(`/api/admin/users?${params}`);
      setUsers(response.data.data.users);
      setPagination(response.data.data.pagination);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error(error.response?.data?.message || 'Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const fetchUserDetails = async (userId) => {
    try {
      const response = await axios.get(`/api/admin/users/${userId}`);
      setSelectedUser(response.data.data);
      
      // If user is store owner, fetch their store info
      if (response.data.data.role === 'store_owner') {
        try {
          const storeResponse = await axios.get(`/api/admin/stores?limit=100`);
          const userStore = storeResponse.data.data.stores.find(
            store => store.owner && store.owner._id === userId
          );
          setUserStoreInfo(userStore || null);
        } catch (err) {
          console.error('Error fetching store info:', err);
          setUserStoreInfo(null);
        }
      } else {
        setUserStoreInfo(null);
      }
      
      setShowDetailsModal(true);
    } catch (error) {
      console.error('Error fetching user details:', error);
      toast.error('Failed to load user details');
    }
  };

  const validateForm = () => {
    const errors = {};
    
    // Name validation
    if (!createForm.name || createForm.name.trim().length < 20) {
      errors.name = 'Name must be at least 20 characters';
    } else if (createForm.name.length > 60) {
      errors.name = 'Name cannot exceed 60 characters';
    }
    
    // Email validation
    if (!createForm.email || !/\S+@\S+\.\S+/.test(createForm.email)) {
      errors.email = 'Please provide a valid email address';
    }
    
    // Password validation
    if (!createForm.password || createForm.password.length < 8) {
      errors.password = 'Password must be at least 8 characters';
    } else if (createForm.password.length > 16) {
      errors.password = 'Password cannot exceed 16 characters';
    } else if (!/^(?=.*[A-Z])(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).+$/.test(createForm.password)) {
      errors.password = 'Password must contain at least one uppercase letter and one special character';
    }
    
    // Address validation
    if (!createForm.address || createForm.address.trim().length === 0) {
      errors.address = 'Address is required';
    } else if (createForm.address.length > 400) {
      errors.address = 'Address cannot exceed 400 characters';
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    try {
      await axios.post('/api/admin/users', createForm);
      toast.success('User created successfully!');
      setShowCreateModal(false);
      setCreateForm({
        name: '',
        email: '',
        password: '',
        address: '',
        role: 'user'
      });
      setFormErrors({});
      fetchUsers();
    } catch (error) {
      console.error('Error creating user:', error);
      if (error.response?.data?.errors) {
        const backendErrors = {};
        error.response.data.errors.forEach(err => {
          backendErrors[err.path || err.param] = err.msg;
        });
        setFormErrors(backendErrors);
      }
      toast.error(error.response?.data?.message || 'Failed to create user');
    }
  };

  const toggleUserStatus = async (userId, currentStatus) => {
    if (!window.confirm(`Are you sure you want to ${currentStatus ? 'deactivate' : 'activate'} this user?`)) {
      return;
    }
    
    try {
      await axios.put(`/api/admin/users/${userId}`, {
        isActive: !currentStatus
      });
      toast.success(`User ${!currentStatus ? 'activated' : 'deactivated'} successfully!`);
      fetchUsers();
    } catch (error) {
      console.error('Error updating user:', error);
      toast.error('Failed to update user');
    }
  };

  const getRoleBadge = (role) => {
    const variants = {
      admin: 'danger',
      store_owner: 'warning',
      user: 'primary'
    };
    const labels = {
      admin: 'ADMIN',
      store_owner: 'STORE OWNER',
      user: 'USER'
    };
    return (
      <Badge bg={variants[role]}>
        {labels[role]}
      </Badge>
    );
  };

  const renderStars = (rating) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;
    
    for (let i = 0; i < 5; i++) {
      if (i < fullStars) {
        stars.push(<span key={i} className="text-warning">★</span>);
      } else if (i === fullStars && hasHalfStar) {
        stars.push(<span key={i} className="text-warning">⯨</span>);
      } else {
        stars.push(<span key={i} className="text-muted">☆</span>);
      }
    }
    return stars;
  };

  const clearFilters = () => {
    setSearchTerm('');
    setRoleFilter('');
    setSortBy('createdAt');
    setSortOrder('desc');
    setCurrentPage(1);
  };

  if (loading && users.length === 0) {
    return (
      <Container className="py-4">
        <div className="text-center">
          <Spinner animation="border" variant="primary" />
          <p className="mt-2">Loading users...</p>
        </div>
      </Container>
    );
  }

  return (
    <Container fluid className="py-4">
      <Row>
        <Col>
          <div className="d-flex justify-content-between align-items-center mb-4">
            <div>
              <h2 className="mb-0">User Management</h2>
              <p className="text-muted mb-0">Manage all users on the platform</p>
            </div>
            <Button variant="primary" onClick={() => setShowCreateModal(true)}>
              <i className="bi bi-plus-circle me-2"></i>
              Add New User
            </Button>
          </div>
        </Col>
      </Row>

      {/* Filters */}
      <Row className="mb-4">
        <Col>
          <Card className="border-0 shadow-sm">
            <Card.Body>
              <Row className="align-items-end">
                <Col md={3}>
                  <Form.Group>
                    <Form.Label className="small fw-bold">Search</Form.Label>
                    <Form.Control
                      type="text"
                      placeholder="Search by name, email, or address..."
                      value={searchTerm}
                      onChange={(e) => {
                        setSearchTerm(e.target.value);
                        setCurrentPage(1);
                      }}
                    />
                  </Form.Group>
                </Col>
                <Col md={2}>
                  <Form.Group>
                    <Form.Label className="small fw-bold">Role</Form.Label>
                    <Form.Select
                      value={roleFilter}
                      onChange={(e) => {
                        setRoleFilter(e.target.value);
                        setCurrentPage(1);
                      }}
                    >
                      <option value="">All Roles</option>
                      <option value="admin">Admin</option>
                      <option value="user">User</option>
                      <option value="store_owner">Store Owner</option>
                    </Form.Select>
                  </Form.Group>
                </Col>
                <Col md={2}>
                  <Form.Group>
                    <Form.Label className="small fw-bold">Sort By</Form.Label>
                    <Form.Select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value)}
                    >
                      <option value="createdAt">Date Created</option>
                      <option value="name">Name</option>
                      <option value="email">Email</option>
                      <option value="role">Role</option>
                    </Form.Select>
                  </Form.Group>
                </Col>
                <Col md={2}>
                  <Form.Group>
                    <Form.Label className="small fw-bold">Order</Form.Label>
                    <Form.Select
                      value={sortOrder}
                      onChange={(e) => setSortOrder(e.target.value)}
                    >
                      <option value="desc">Descending</option>
                      <option value="asc">Ascending</option>
                    </Form.Select>
                  </Form.Group>
                </Col>
                <Col md={3}>
                  <div className="d-flex gap-2">
                    <Button variant="outline-secondary" onClick={fetchUsers} disabled={loading}>
                      <i className="bi bi-arrow-clockwise"></i>
                    </Button>
                    <Button variant="outline-danger" onClick={clearFilters} className="flex-grow-1">
                      Clear Filters
                    </Button>
                  </div>
                </Col>
              </Row>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Users Table */}
      <Row>
        <Col>
          <Card
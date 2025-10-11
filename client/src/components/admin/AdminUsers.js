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

  useEffect(function() {
    fetchUsers();
  }, [searchTerm, roleFilter, sortBy, sortOrder, currentPage]);

  const fetchUsers = async function() {
    try {
      setLoading(true);
      
      // Build query parameters
      let queryString = '?';
      queryString = queryString + 'search=' + searchTerm;
      queryString = queryString + '&role=' + roleFilter;
      queryString = queryString + '&sortBy=' + sortBy;
      queryString = queryString + '&sortOrder=' + sortOrder;
      queryString = queryString + '&page=' + currentPage;
      queryString = queryString + '&limit=10';
      
      const response = await axios.get('/api/admin/users' + queryString);
      const data = response.data.data;
      setUsers(data.users);
      setPagination(data.pagination);
    } catch (error) {
      console.error('Error fetching users:', error);
      let errorMessage = 'Failed to load users';
      if (error.response && error.response.data && error.response.data.message) {
        errorMessage = error.response.data.message;
      }
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const fetchUserDetails = async function(userId) {
    try {
      const response = await axios.get('/api/admin/users/' + userId);
      const userData = response.data.data;
      setSelectedUser(userData);
      
      // Check if user is store owner
      if (userData.role === 'store_owner') {
        try {
          const storeResponse = await axios.get('/api/admin/stores?limit=100');
          const allStores = storeResponse.data.data.stores;
          
          // Find store for this user
          let foundStore = null;
          for (let i = 0; i < allStores.length; i++) {
            const store = allStores[i];
            if (store.owner && store.owner._id === userId) {
              foundStore = store;
              break;
            }
          }
          
          setUserStoreInfo(foundStore);
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

  const validateForm = function() {
    const errors = {};
    
    // Check name
    const trimmedName = createForm.name.trim();
    if (!createForm.name || trimmedName.length < 3) {
      errors.name = 'Name must be at least 3 characters';
    } else if (createForm.name.length > 60) {
      errors.name = 'Name cannot exceed 60 characters';
    }
    
    // Check email
    const emailPattern = /\S+@\S+\.\S+/;
    if (!createForm.email || !emailPattern.test(createForm.email)) {
      errors.email = 'Please provide a valid email address';
    }
    
    // Check password
    if (!createForm.password || createForm.password.length < 8) {
      errors.password = 'Password must be at least 8 characters';
    } else if (createForm.password.length > 16) {
      errors.password = 'Password cannot exceed 16 characters';
    } else {
      const passwordPattern = /^(?=.*[A-Z])(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).+$/;
      if (!passwordPattern.test(createForm.password)) {
        errors.password = 'Password must contain at least one uppercase letter and one special character';
      }
    }
    
    // Check address
    const trimmedAddress = createForm.address.trim();
    if (!createForm.address || trimmedAddress.length === 0) {
      errors.address = 'Address is required';
    } else if (createForm.address.length > 400) {
      errors.address = 'Address cannot exceed 400 characters';
    }
    
    setFormErrors(errors);
    
    // Return true if no errors
    const errorKeys = Object.keys(errors);
    if (errorKeys.length === 0) {
      return true;
    } else {
      return false;
    }
  };

  const handleCreateUser = async function(e) {
    e.preventDefault();
    
    const isValid = validateForm();
    if (!isValid) {
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
      
      if (error.response && error.response.data && error.response.data.errors) {
        const backendErrors = {};
        const errorArray = error.response.data.errors;
        
        for (let i = 0; i < errorArray.length; i++) {
          const err = errorArray[i];
          const fieldName = err.path || err.param;
          const errorMsg = err.msg;
          backendErrors[fieldName] = errorMsg;
        }
        
        setFormErrors(backendErrors);
      }
      
      let errorMessage = 'Failed to create user';
      if (error.response && error.response.data && error.response.data.message) {
        errorMessage = error.response.data.message;
      }
      toast.error(errorMessage);
    }
  };

  const toggleUserStatus = async function(userId, currentStatus) {
    let confirmMessage = 'Are you sure you want to deactivate this user?';
    if (!currentStatus) {
      confirmMessage = 'Are you sure you want to activate this user?';
    }
    
    const confirmed = window.confirm(confirmMessage);
    if (!confirmed) {
      return;
    }
    
    try {
      const newStatus = !currentStatus;
      
      await axios.put('/api/admin/users/' + userId, {
        isActive: newStatus
      });
      
      let successMessage = 'User deactivated successfully!';
      if (newStatus) {
        successMessage = 'User activated successfully!';
      }
      
      toast.success(successMessage);
      fetchUsers();
    } catch (error) {
      console.error('Error updating user:', error);
      toast.error('Failed to update user');
    }
  };

  const getRoleBadge = function(role) {
    let variant = 'primary';
    let label = 'USER';
    
    if (role === 'admin') {
      variant = 'danger';
      label = 'ADMIN';
    } else if (role === 'store_owner') {
      variant = 'warning';
      label = 'STORE OWNER';
    }
    
    return (
      <Badge bg={variant}>
        {label}
      </Badge>
    );
  };

  const renderStars = function(rating) {
    const stars = [];
    const fullStars = Math.floor(rating);
    const remainder = rating % 1;
    const hasHalfStar = remainder >= 0.5;
    
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

  const clearFilters = function() {
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
            <Button variant="primary" onClick={function() {
              setShowCreateModal(true);
            }}>
              Add New User
            </Button>
          </div>
        </Col>
      </Row>

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
                      onChange={function(e) {
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
                      onChange={function(e) {
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
                      onChange={function(e) {
                        setSortBy(e.target.value);
                      }}
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
                      onChange={function(e) {
                        setSortOrder(e.target.value);
                      }}
                    >
                      <option value="desc">Descending</option>
                      <option value="asc">Ascending</option>
                    </Form.Select>
                  </Form.Group>
                </Col>
                <Col md={3}>
                  <div className="d-flex gap-2">
                    <Button variant="outline-secondary" onClick={fetchUsers} disabled={loading}>
                      Refresh
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

      <Row>
        <Col>
          <Card className="border-0 shadow-sm">
            <Card.Header className="bg-primary text-white">
              <div className="d-flex justify-content-between align-items-center">
                <h5 className="mb-0">
                  Users ({pagination.totalUsers || 0})
                </h5>
                {loading && <Spinner animation="border" size="sm" />}
              </div>
            </Card.Header>
            <Card.Body className="p-0">
              {users.length === 0 ? (
                <Alert variant="info" className="m-4 text-center">
                  No users found matching your criteria
                </Alert>
              ) : (
                <div className="table-responsive">
                  <Table hover className="mb-0">
                    <thead className="table-light">
                      <tr>
                        <th style={{ width: '25%' }}>Name</th>
                        <th style={{ width: '20%' }}>Email</th>
                        <th style={{ width: '25%' }}>Address</th>
                        <th style={{ width: '12%' }}>Role</th>
                        <th style={{ width: '10%' }}>Status</th>
                        <th style={{ width: '8%' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map(function(user) {
                        return (
                          <tr key={user._id}>
                            <td>
                              <div className="fw-bold">{user.name}</div>
                              <small className="text-muted">
                                Created: {new Date(user.createdAt).toLocaleDateString()}
                              </small>
                            </td>
                            <td>{user.email}</td>
                            <td>
                              <div className="text-truncate" style={{ maxWidth: '300px' }} title={user.address}>
                                {user.address}
                              </div>
                            </td>
                            <td>{getRoleBadge(user.role)}</td>
                            <td>
                              <Badge bg={user.isActive ? 'success' : 'danger'}>
                                {user.isActive ? 'Active' : 'Inactive'}
                              </Badge>
                            </td>
                            <td>
                              <div className="d-flex gap-1">
                                <Button
                                  variant="outline-info"
                                  size="sm"
                                  onClick={function() {
                                    fetchUserDetails(user._id);
                                  }}
                                  title="View Details"
                                >
                                  View
                                </Button>
                                <Button
                                  variant={user.isActive ? 'outline-danger' : 'outline-success'}
                                  size="sm"
                                  onClick={function() {
                                    toggleUserStatus(user._id, user.isActive);
                                  }}
                                  title={user.isActive ? 'Deactivate' : 'Activate'}
                                >
                                  {user.isActive ? 'Off' : 'On'}
                                </Button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </Table>
                </div>
              )}
            </Card.Body>
            
            {pagination.totalPages > 1 && (
              <Card.Footer className="bg-light">
                <div className="d-flex justify-content-between align-items-center">
                  <div className="text-muted small">
                    Showing page {pagination.currentPage} of {pagination.totalPages}
                  </div>
                  <div className="d-flex gap-2">
                    <Button
                      variant="outline-primary"
                      size="sm"
                      disabled={!pagination.hasPrevPage}
                      onClick={function() {
                        setCurrentPage(currentPage - 1);
                      }}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline-primary"
                      size="sm"
                      disabled={!pagination.hasNextPage}
                      onClick={function() {
                        setCurrentPage(currentPage + 1);
                      }}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              </Card.Footer>
            )}
          </Card>
        </Col>
      </Row>

      <Modal show={showCreateModal} onHide={function() {
        setShowCreateModal(false);
        setFormErrors({});
      }} size="lg">
        <Modal.Header closeButton className="bg-primary text-white">
          <Modal.Title>
            Create New User
          </Modal.Title>
        </Modal.Header>
        <form onSubmit={handleCreateUser}>
          <Modal.Body>
            <Row>
              <Col md={12}>
                <Form.Group className="mb-3">
                  <Form.Label>Full Name <span className="text-danger">*</span></Form.Label>
                  <Form.Control
                    type="text"
                    value={createForm.name}
                    onChange={function(e) {
                      const newForm = {...createForm};
                      newForm.name = e.target.value;
                      setCreateForm(newForm);
                      
                      if (formErrors.name) {
                        const newErrors = {...formErrors};
                        newErrors.name = undefined;
                        setFormErrors(newErrors);
                      }
                    }}
                    placeholder="Enter full name (3-60 characters)"
                    isInvalid={!!formErrors.name}
                    minLength={3}
                    maxLength={60}
                  />
                  <Form.Control.Feedback type="invalid">
                    {formErrors.name}
                  </Form.Control.Feedback>
                  <Form.Text className="text-muted">
                    {createForm.name.length}/60 characters (minimum 3 required)
                  </Form.Text>
                </Form.Group>
              </Col>
            </Row>
            
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Email <span className="text-danger">*</span></Form.Label>
                  <Form.Control
                    type="email"
                    value={createForm.email}
                    onChange={function(e) {
                      const newForm = {...createForm};
                      newForm.email = e.target.value;
                      setCreateForm(newForm);
                      
                      if (formErrors.email) {
                        const newErrors = {...formErrors};
                        newErrors.email = undefined;
                        setFormErrors(newErrors);
                      }
                    }}
                    placeholder="Enter email address"
                    isInvalid={!!formErrors.email}
                  />
                  <Form.Control.Feedback type="invalid">
                    {formErrors.email}
                  </Form.Control.Feedback>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Role <span className="text-danger">*</span></Form.Label>
                  <Form.Select
                    value={createForm.role}
                    onChange={function(e) {
                      const newForm = {...createForm};
                      newForm.role = e.target.value;
                      setCreateForm(newForm);
                    }}
                  >
                    <option value="user">Normal User</option>
                    <option value="store_owner">Store Owner</option>
                    <option value="admin">Admin</option>
                  </Form.Select>
                  <Form.Text className="text-muted">
                    {createForm.role === 'user' && 'Can browse and rate stores'}
                    {createForm.role === 'store_owner' && 'Can manage store ratings'}
                    {createForm.role === 'admin' && 'Full system access'}
                  </Form.Text>
                </Form.Group>
              </Col>
            </Row>
            
            <Row>
              <Col md={12}>
                <Form.Group className="mb-3">
                  <Form.Label>Password <span className="text-danger">*</span></Form.Label>
                  <Form.Control
                    type="password"
                    value={createForm.password}
                    onChange={function(e) {
                      const newForm = {...createForm};
                      newForm.password = e.target.value;
                      setCreateForm(newForm);
                      
                      if (formErrors.password) {
                        const newErrors = {...formErrors};
                        newErrors.password = undefined;
                        setFormErrors(newErrors);
                      }
                    }}
                    placeholder="Enter password (8-16 characters)"
                    isInvalid={!!formErrors.password}
                    minLength={8}
                    maxLength={16}
                  />
                  <Form.Control.Feedback type="invalid">
                    {formErrors.password}
                  </Form.Control.Feedback>
                  <Form.Text className="text-muted">
                    Must be 8-16 characters with at least one uppercase letter and one special character
                  </Form.Text>
                </Form.Group>
              </Col>
            </Row>
            
            <Row>
              <Col>
                <Form.Group className="mb-3">
                  <Form.Label>Address <span className="text-danger">*</span></Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={2}
                    value={createForm.address}
                    onChange={function(e) {
                      const newForm = {...createForm};
                      newForm.address = e.target.value;
                      setCreateForm(newForm);
                      
                      if (formErrors.address) {
                        const newErrors = {...formErrors};
                        newErrors.address = undefined;
                        setFormErrors(newErrors);
                      }
                    }}
                    placeholder="Enter address (max 400 characters)"
                    isInvalid={!!formErrors.address}
                    maxLength={400}
                  />
                  <Form.Control.Feedback type="invalid">
                    {formErrors.address}
                  </Form.Control.Feedback>
                  <Form.Text className="text-muted">
                    {createForm.address.length}/400 characters
                  </Form.Text>
                </Form.Group>
              </Col>
            </Row>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={function() {
              setShowCreateModal(false);
              setFormErrors({});
            }}>
              Cancel
            </Button>
            <Button variant="primary" type="submit">
              Create User
            </Button>
          </Modal.Footer>
        </form>
      </Modal>

      <Modal show={showDetailsModal} onHide={function() {
        setShowDetailsModal(false);
      }} size="lg">
        <Modal.Header closeButton className="bg-info text-white">
          <Modal.Title>
            User Details
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedUser && (
            <div>
              <Row>
                <Col md={8}>
                  <h4 className="mb-3">{selectedUser.name}</h4>
                </Col>
                <Col md={4} className="text-end">
                  {getRoleBadge(selectedUser.role)}
                  <Badge bg={selectedUser.isActive ? 'success' : 'danger'} className="ms-2">
                    {selectedUser.isActive ? 'Active' : 'Inactive'}
                  </Badge>
                </Col>
              </Row>

              <hr />

              <Row className="mb-3">
                <Col md={6}>
                  <h6 className="text-muted mb-2">Email</h6>
                  <p className="mb-0">{selectedUser.email}</p>
                </Col>
                <Col md={6}>
                  <h6 className="text-muted mb-2">Role</h6>
                  <p className="mb-0">
                    {selectedUser.role === 'admin' && 'System Administrator'}
                    {selectedUser.role === 'user' && 'Normal User'}
                    {selectedUser.role === 'store_owner' && 'Store Owner'}
                  </p>
                </Col>
              </Row>

              <Row className="mb-3">
                <Col md={12}>
                  <h6 className="text-muted mb-2">Address</h6>
                  <p className="mb-0">{selectedUser.address}</p>
                </Col>
              </Row>

              <Row className="mb-3">
                <Col md={6}>
                  <h6 className="text-muted mb-2">Account Created</h6>
                  <p className="mb-0">{new Date(selectedUser.createdAt).toLocaleString()}</p>
                </Col>
                <Col md={6}>
                  <h6 className="text-muted mb-2">Last Updated</h6>
                  <p className="mb-0">{new Date(selectedUser.updatedAt).toLocaleString()}</p>
                </Col>
              </Row>

              {selectedUser.role === 'store_owner' && (
                <>
                  <hr />
                  <h5 className="mb-3">
                    Store Information
                  </h5>
                  {userStoreInfo ? (
                    <Card className="bg-light">
                      <Card.Body>
                        <Row>
                          <Col md={8}>
                            <h6 className="mb-1">{userStoreInfo.name}</h6>
                            <p className="text-muted small mb-2">{userStoreInfo.email}</p>
                            <p className="text-muted small mb-0">
                              {userStoreInfo.address}
                            </p>
                          </Col>
                          <Col md={4} className="text-end">
                            <div className="mb-2">
                              <div className="h4 mb-0">
                                {renderStars(userStoreInfo.averageRating || 0)}
                              </div>
                              <div className="text-muted small">
                                {(userStoreInfo.averageRating || 0).toFixed(1)} / 5.0
                              </div>
                            </div>
                            <Badge bg="primary">
                              {userStoreInfo.totalRatings || 0} ratings
                            </Badge>
                          </Col>
                        </Row>
                      </Card.Body>
                    </Card>
                  ) : (
                    <Alert variant="warning">
                      No store assigned to this store owner yet.
                    </Alert>
                  )}
                </>
              )}
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={function() {
            setShowDetailsModal(false);
          }}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

export default AdminUsers;
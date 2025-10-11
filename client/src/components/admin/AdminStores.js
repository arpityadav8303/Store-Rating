import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Table, Form, Button, Spinner, Alert, Badge, Modal } from 'react-bootstrap';
import axios from 'axios';
import { toast } from 'react-toastify';

const AdminStores = () => {
  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('desc');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState({
    name: '',
    email: '',
    address: '',
    ownerName: '' 
  });
  const [validationErrors, setValidationErrors] = useState({});
  
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState(''); 

  // Wait before searching
  useEffect(() => {
    const handler = setTimeout(function() {
      setDebouncedSearchTerm(searchTerm);
    }, 500);
    
    return function() {
      clearTimeout(handler);
    };
  }, [searchTerm]);

  // Load stores when search or sort changes
  useEffect(() => {
    fetchStores();
  }, [debouncedSearchTerm, sortBy, sortOrder]);

  const fetchStores = async () => {
    try {
      setLoading(true);
      
      const params = {
        search: debouncedSearchTerm,
        sortBy: sortBy,
        sortOrder: sortOrder,
        limit: '50'
      };
      
      const response = await axios.get('/api/admin/stores', { params: params });
      const storesData = response.data.data.stores;
      setStores(storesData);
    } catch (error) {
      console.error('Error fetching stores:', error.message);
      toast.error('Failed to load stores');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateStore = async (e) => {
    e.preventDefault();
    setValidationErrors({});

    try {
      const payload = {
          name: createForm.name,
          email: createForm.email,
          address: createForm.address,
          ownerName: createForm.ownerName
      };

      await axios.post('/api/admin/stores', payload);
      toast.success('Store created successfully!');
      setShowCreateModal(false);
      setCreateForm({
        name: '', 
        email: '', 
        address: '', 
        ownerName: ''
      });
      fetchStores();
    } catch (error) {
      console.error('Error creating store:', error);
      
      // Check for validation errors
      if (error.response) {
        const status = error.response.status;
        const data = error.response.data;
        
        if (status === 400 && data.errors) {
          // Handle validation errors from backend
          const newErrors = {};
          const errorArray = data.errors;
          
          for (let i = 0; i < errorArray.length; i++) {
            const err = errorArray[i];
            const fieldName = err.path;
            const errorMessage = err.msg;
            newErrors[fieldName] = errorMessage;
          }
          
          setValidationErrors(newErrors);
          toast.error('Validation failed. Please check the form fields.');
          
        } else if (status === 400 && data.message.includes('Store already exists')) {
          // Store email already exists
          toast.error(data.message);
          
        } else if (status === 404) {
          // Owner not found
          toast.error(data.message);
        } else {
          // Other errors
          let errorMsg = 'Failed to create store due to a server error.';
          if (data && data.message) {
            errorMsg = data.message;
          }
          toast.error(errorMsg);
        }
      } else {
        toast.error('Failed to create store due to a server error.');
      }
    }
  };

  const toggleStoreStatus = async (storeId, currentStatus) => {
    try {
      const newStatus = !currentStatus;
      
      await axios.put('/api/admin/stores/' + storeId, {
        isActive: newStatus
      });
      
      let message = '';
      if (newStatus) {
        message = 'Store activated successfully!';
      } else {
        message = 'Store deactivated successfully!';
      }
      
      toast.success(message);
      fetchStores();
    } catch (error) {
      console.error('Error updating store:', error);
      toast.error('Failed to update store');
    }
  };

  const renderStars = function(rating) {
    let stars = [];
    
    for (let i = 0; i < 5; i++) {
      let color = '#e4e5e9';
      if (i < rating) {
        color = '#ffc107';
      }
      
      stars.push(
        <span key={i} style={{ color: color }}>
          ★
        </span>
      );
    }
    
    return stars;
  };

  if (loading) {
    return (
      <Container className="py-4">
        <div className="text-center">
          <Spinner animation="border" variant="primary" />
          <p className="mt-2">Loading stores...</p>
        </div>
      </Container>
    );
  }

  return (
    <Container fluid className="py-4">
      <Row>
        <Col>
          <div className="d-flex justify-content-between align-items-center mb-4">
            <h2 className="mb-0">Store Management</h2>
            <Button variant="primary" onClick={function() {
              setValidationErrors({});
              setShowCreateModal(true);
            }}>
              Add New Store
            </Button>
          </div>
        </Col>
      </Row>

      <Row className="mb-4">
        <Col md={4}>
          <Form.Control
            type="text"
            placeholder="Search stores..."
            value={searchTerm}
            onChange={function(e) {
              setSearchTerm(e.target.value);
            }}
          />
        </Col>
        <Col md={2}>
          <Form.Select
            value={sortBy}
            onChange={function(e) {
              setSortBy(e.target.value);
            }}
          >
            <option value="createdAt">Sort by Date</option>
            <option value="name">Sort by Name</option>
            <option value="email">Sort by Email</option>
          </Form.Select>
        </Col>
        <Col md={2}>
          <Form.Select
            value={sortOrder}
            onChange={function(e) {
              setSortOrder(e.target.value);
            }}
          >
            <option value="desc">Descending</option>
            <option value="asc">Ascending</option>
          </Form.Select>
        </Col>
        <Col md={2}>
          <Button variant="outline-secondary" onClick={fetchStores}>
            Refresh
          </Button>
        </Col>
      </Row>

      <Row>
        <Col>
          <Card className="border-0 shadow-sm">
            <Card.Header className="bg-success text-white">
              <h5 className="mb-0">Stores ({stores.length})</h5>
            </Card.Header>
            <Card.Body className="p-0">
              <div className="table-responsive">
                <Table className="mb-0" hover>
                  <thead className="table-light">
                    <tr>
                      <th>Store Name</th>
                      <th>Email</th>
                      <th>Address</th>
                      <th>Owner</th>
                      <th>Rating</th>
                      <th>Status</th>
                      <th>Created</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stores.length === 0 ? (
                      <tr>
                        <td colSpan="8" className="text-center py-4">
                          No stores found
                        </td>
                      </tr>
                    ) : (
                      stores.map(function(store) {
                        return (
                          <tr key={store._id}>
                            <td>{store.name}</td>
                            <td>{store.email}</td>
                            <td className="text-truncate" style={{ maxWidth: '200px' }}>
                              {store.address}
                            </td>
                            <td>
                              {store.owner ? (
                                <div>
                                  <div>{store.owner.name}</div>
                                  <small className="text-muted">{store.owner.email}</small>
                                </div>
                              ) : (
                                <span className="text-muted">No owner</span>
                              )}
                            </td>
                            <td>
                              <div className="d-flex align-items-center">
                                <span className="rating-stars me-2">
                                  {renderStars(Math.round(store.averageRating || 0))}
                                </span>
                                <span className="fw-bold">
                                  {(store.averageRating || 0).toFixed(1)}
                                </span>
                                <small className="text-muted ms-1">
                                  ({store.totalRatings || 0})
                                </small>
                              </div>
                            </td>
                            <td>
                              <Badge bg={store.isActive ? 'success' : 'danger'}>
                                {store.isActive ? 'Active' : 'Inactive'}
                              </Badge>
                            </td>
                            <td>{new Date(store.createdAt).toLocaleDateString()}</td>
                            <td>
                              <Button
                                variant={store.isActive ? 'outline-danger' : 'outline-success'}
                                size="sm"
                                onClick={function() {
                                  toggleStoreStatus(store._id, store.isActive);
                                }}
                              >
                                {store.isActive ? 'Deactivate' : 'Activate'}
                              </Button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </Table>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <Modal show={showCreateModal} onHide={function() {
        setShowCreateModal(false);
      }} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Create New Store</Modal.Title>
        </Modal.Header>
        <form onSubmit={handleCreateStore}>
          <Modal.Body>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Store Name</Form.Label>
                  <Form.Control
                    type="text"
                    value={createForm.name}
                    onChange={function(e) {
                      const newForm = {...createForm};
                      newForm.name = e.target.value;
                      setCreateForm(newForm);
                    }}
                    placeholder="Enter store name"
                    required
                    isInvalid={!!validationErrors.name} 
                    minLength={3}
                    maxLength={100}
                  />
                  <Form.Control.Feedback type="invalid">
                    {validationErrors.name}
                  </Form.Control.Feedback>
                  <Form.Text className="text-muted">
                    3-100 characters
                  </Form.Text>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Email</Form.Label>
                  <Form.Control
                    type="email"
                    value={createForm.email}
                    onChange={function(e) {
                      const newForm = {...createForm};
                      newForm.email = e.target.value;
                      setCreateForm(newForm);
                    }}
                    placeholder="Enter store email"
                    required
                    isInvalid={!!validationErrors.email} 
                  />
                  <Form.Control.Feedback type="invalid">
                    {validationErrors.email}
                  </Form.Control.Feedback>
                </Form.Group>
              </Col>
            </Row>
            <Row>
              <Col md={12}>
                <Form.Group className="mb-3">
                  <Form.Label>Owner Name</Form.Label>
                  <Form.Control
                    type="text"
                    value={createForm.ownerName}
                    onChange={function(e) {
                      const newForm = {...createForm};
                      newForm.ownerName = e.target.value;
                      setCreateForm(newForm);
                    }}
                    placeholder="Type the full name of the store owner"
                    required
                    isInvalid={!!validationErrors.ownerName} 
                    minLength={3}
                  />
                  <Form.Control.Feedback type="invalid">
                    {validationErrors.ownerName}
                  </Form.Control.Feedback>
                  <Form.Text className="text-muted">
                    The name must match an existing user with the store owner role.
                  </Form.Text>
                </Form.Group>
              </Col>
            </Row>
            <Row>
              <Col md={12}>
                <Form.Group className="mb-3">
                  <Form.Label>Address</Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={3}
                    value={createForm.address}
                    onChange={function(e) {
                      const newForm = {...createForm};
                      newForm.address = e.target.value;
                      setCreateForm(newForm);
                    }}
                    placeholder="Enter store address"
                    required
                    isInvalid={!!validationErrors.address} 
                    maxLength={400}
                  />
                  <Form.Control.Feedback type="invalid">
                    {validationErrors.address}
                  </Form.Control.Feedback>
                  <Form.Text className="text-muted">
                    Maximum 400 characters
                  </Form.Text>
                </Form.Group>
              </Col>
            </Row>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={function() {
              setShowCreateModal(false);
            }}>
              Cancel
            </Button>
            <Button variant="primary" type="submit">
              Create Store
            </Button>
          </Modal.Footer>
        </form>
      </Modal>

      <style>{`
        .rating-stars {
          font-size: 1.2rem;
          letter-spacing: 2px;
        }
      `}</style>
    </Container>
  );
};

export default AdminStores;
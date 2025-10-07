import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Table, Form, Button, Spinner, Alert, Badge, Modal } from 'react-bootstrap';
import axios from 'axios';
import { toast } from 'react-toastify';

const AdminStores = () => {
  const [stores, setStores] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('desc');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState({
    name: '',
    email: '',
    address: '',
    ownerId: ''
  });

  useEffect(() => {
    fetchStores();
    fetchUsers();
  }, [searchTerm, sortBy, sortOrder]);

  const fetchStores = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        search: searchTerm,
        sortBy,
        sortOrder,
        limit: '50'
      });
      
      const response = await axios.get(`/api/admin/stores?${params}`);
      setStores(response.data.data.stores);
    } catch (error) {
      console.error('Error fetching stores:', error);
      toast.error('Failed to load stores');
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await axios.get('/api/admin/users?role=store_owner&limit=100');
      setUsers(response.data.data.users);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const handleCreateStore = async (e) => {
    e.preventDefault();
    try {
      await axios.post('/api/admin/stores', createForm);
      toast.success('Store created successfully!');
      setShowCreateModal(false);
      setCreateForm({
        name: '',
        email: '',
        address: '',
        ownerId: ''
      });
      fetchStores();
    } catch (error) {
      console.error('Error creating store:', error);
      toast.error('Failed to create store');
    }
  };

  const toggleStoreStatus = async (storeId, currentStatus) => {
    try {
      await axios.put(`/api/admin/stores/${storeId}`, {
        isActive: !currentStatus
      });
      toast.success(`Store ${!currentStatus ? 'activated' : 'deactivated'} successfully!`);
      fetchStores();
    } catch (error) {
      console.error('Error updating store:', error);
      toast.error('Failed to update store');
    }
  };

  const renderStars = (rating) => {
    return Array.from({ length: 5 }, (_, index) => (
      <span
        key={index}
        className={index < rating ? 'star-filled' : 'star-empty'}
      >
        ★
      </span>
    ));
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
            <Button variant="primary" onClick={() => setShowCreateModal(true)}>
              <i className="bi bi-plus-circle me-1"></i>
              Add New Store
            </Button>
          </div>
        </Col>
      </Row>

      {/* Filters */}
      <Row className="mb-4">
        <Col md={4}>
          <Form.Control
            type="text"
            placeholder="Search stores..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </Col>
        <Col md={2}>
          <Form.Select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
          >
            <option value="createdAt">Sort by Date</option>
            <option value="name">Sort by Name</option>
            <option value="email">Sort by Email</option>
          </Form.Select>
        </Col>
        <Col md={2}>
          <Form.Select
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value)}
          >
            <option value="desc">Descending</option>
            <option value="asc">Ascending</option>
          </Form.Select>
        </Col>
        <Col md={2}>
          <Button variant="outline-secondary" onClick={fetchStores}>
            <i className="bi bi-arrow-clockwise"></i>
          </Button>
        </Col>
      </Row>

      {/* Stores Table */}
      <Row>
        <Col>
          <Card className="border-0 shadow-sm">
            <Card.Header className="bg-success text-white">
              <h5 className="mb-0">Stores ({stores.length})</h5>
            </Card.Header>
            <Card.Body className="p-0">
              <div className="table-responsive">
                <Table className="mb-0">
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
                    {stores.map((store) => (
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
                            onClick={() => toggleStoreStatus(store._id, store.isActive)}
                          >
                            {store.isActive ? 'Deactivate' : 'Activate'}
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Create Store Modal */}
      <Modal show={showCreateModal} onHide={() => setShowCreateModal(false)} size="lg">
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
                    onChange={(e) => setCreateForm({...createForm, name: e.target.value})}
                    placeholder="Enter store name"
                    required
                    maxLength={100}
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Email</Form.Label>
                  <Form.Control
                    type="email"
                    value={createForm.email}
                    onChange={(e) => setCreateForm({...createForm, email: e.target.value})}
                    placeholder="Enter store email"
                    required
                  />
                </Form.Group>
              </Col>
            </Row>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Owner</Form.Label>
                  <Form.Select
                    value={createForm.ownerId}
                    onChange={(e) => setCreateForm({...createForm, ownerId: e.target.value})}
                    required
                  >
                    <option value="">Select Store Owner</option>
                    {users.map((user) => (
                      <option key={user._id} value={user._id}>
                        {user.name} ({user.email})
                      </option>
                    ))}
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Address</Form.Label>
                  <Form.Control
                    type="text"
                    value={createForm.address}
                    onChange={(e) => setCreateForm({...createForm, address: e.target.value})}
                    placeholder="Enter store address"
                    required
                    maxLength={400}
                  />
                </Form.Group>
              </Col>
            </Row>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowCreateModal(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit">
              Create Store
            </Button>
          </Modal.Footer>
        </form>
      </Modal>
    </Container>
  );
};

export default AdminStores;


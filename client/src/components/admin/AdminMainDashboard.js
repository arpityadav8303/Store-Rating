import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Spinner, Alert } from 'react-bootstrap';
import axios from 'axios';
import { toast } from 'react-toastify';

const AdminMainDashboard = () => {
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalStores: 0,
    totalRatings: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  const fetchDashboardStats = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/admin/dashboard');
      setStats(response.data.data);
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
      setError('Failed to load dashboard statistics');
      toast.error('Failed to load dashboard statistics');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Container className="py-4">
        <div className="text-center">
          <Spinner animation="border" variant="primary" />
          <p className="mt-2">Loading dashboard...</p>
        </div>
      </Container>
    );
  }

  if (error) {
    return (
      <Container className="py-4">
        <Alert variant="danger">
          {error}
        </Alert>
      </Container>
    );
  }

  return (
    <Container fluid className="py-4">
      <Row>
        <Col>
          <div className="d-flex justify-content-between align-items-center mb-4">
            <h2 className="mb-0">Admin Dashboard</h2>
            <div className="text-muted">
              Welcome back, Admin!
            </div>
          </div>
        </Col>
      </Row>

      <Row className="g-4 mb-4">
        <Col md={4}>
          <Card className="stat-card h-100 border-0 shadow-sm">
            <Card.Body className="text-center">
              <h3 className="text-primary mb-2">
                {stats.totalUsers}
              </h3>
              <h5 className="card-title">Total Users</h5>
              <p className="card-text text-muted small">
                Registered users on the platform
              </p>
            </Card.Body>
          </Card>
        </Col>

        <Col md={4}>
          <Card className="stat-card h-100 border-0 shadow-sm">
            <Card.Body className="text-center">
              <h3 className="text-success mb-2">
                {stats.totalStores}
              </h3>
              <h5 className="card-title">Total Stores</h5>
              <p className="card-text text-muted small">
                Stores registered on the platform
              </p>
            </Card.Body>
          </Card>
        </Col>

        <Col md={4}>
          <Card className="stat-card h-100 border-0 shadow-sm">
            <Card.Body className="text-center">
              <h3 className="text-warning mb-2">
                {stats.totalRatings}
              </h3>
              <h5 className="card-title">Total Ratings</h5>
              <p className="card-text text-muted small">
                Ratings submitted by users
              </p>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <Row>
        <Col>
          <Card className="border-0 shadow-sm">
            <Card.Header className="bg-primary text-white">
              <h5 className="mb-0">Quick Actions</h5>
            </Card.Header>
            <Card.Body>
              <Row className="g-3">
                <Col md={4}>
                  <Card className="h-100 border-0 bg-light">
                    <Card.Body className="text-center">
                      <h6>Manage Users</h6>
                      <p className="small text-muted mb-3">
                        View, add, edit, and manage all users
                      </p>
                      <a href="/admin/users" className="btn btn-outline-primary btn-sm">
                        Go to Users
                      </a>
                    </Card.Body>
                  </Card>
                </Col>
                <Col md={4}>
                  <Card className="h-100 border-0 bg-light">
                    <Card.Body className="text-center">
                      <h6>Manage Stores</h6>
                      <p className="small text-muted mb-3">
                        View, add, edit, and manage all stores
                      </p>
                      <a href="/admin/stores" className="btn btn-outline-success btn-sm">
                        Go to Stores
                      </a>
                    </Card.Body>
                  </Card>
                </Col>
                <Col md={4}>
                  <Card className="h-100 border-0 bg-light">
                    <Card.Body className="text-center">
                      <h6>Analytics</h6>
                      <p className="small text-muted mb-3">
                        View platform statistics and reports
                      </p>
                      <button className="btn btn-outline-warning btn-sm" disabled>
                        Coming Soon
                      </button>
                    </Card.Body>
                  </Card>
                </Col>
              </Row>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <Row className="mt-4">
        <Col>
          <Card className="border-0 shadow-sm">
            <Card.Header className="bg-info text-white">
              <h5 className="mb-0">System Information</h5>
            </Card.Header>
            <Card.Body>
              <Row>
                <Col md={6}>
                  <h6>Platform Statistics</h6>
                  <ul className="list-unstyled">
                    <li className="mb-2">
                      <strong>Users:</strong> {stats.totalUsers} registered users
                    </li>
                    <li className="mb-2">
                      <strong>Stores:</strong> {stats.totalStores} active stores
                    </li>
                    <li className="mb-2">
                      <strong>Ratings:</strong> {stats.totalRatings} submitted ratings
                    </li>
                  </ul>
                </Col>
                <Col md={6}>
                  <h6>Recent Activity</h6>
                  <div className="text-muted">
                    <p className="small mb-1">
                      Dashboard last updated: {new Date().toLocaleString()}
                    </p>
                    <p className="small mb-1">
                      System status: <span className="text-success">Online</span>
                    </p>
                    <p className="small mb-0">
                      Security: <span className="text-success">Protected</span>
                    </p>
                  </div>
                </Col>
              </Row>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default AdminMainDashboard;
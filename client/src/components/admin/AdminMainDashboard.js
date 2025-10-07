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

  const statCards = [
    {
      title: 'Total Users',
      value: stats.totalUsers,
      icon: '👥',
      color: 'primary',
      description: 'Registered users on the platform'
    },
    {
      title: 'Total Stores',
      value: stats.totalStores,
      icon: '🏪',
      color: 'success',
      description: 'Stores registered on the platform'
    },
    {
      title: 'Total Ratings',
      value: stats.totalRatings,
      icon: '⭐',
      color: 'warning',
      description: 'Ratings submitted by users'
    }
  ];

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
        {statCards.map((stat, index) => (
          <Col key={index} md={4}>
            <Card className="stat-card h-100 border-0 shadow-sm">
              <Card.Body className="text-center">
                <div className="mb-3">
                  <span style={{ fontSize: '3rem' }}>{stat.icon}</span>
                </div>
                <h3 className={`text-${stat.color} mb-2`}>
                  {stat.value.toLocaleString()}
                </h3>
                <h5 className="card-title">{stat.title}</h5>
                <p className="card-text text-muted small">
                  {stat.description}
                </p>
              </Card.Body>
            </Card>
          </Col>
        ))}
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
                      <div className="mb-3">
                        <i className="bi bi-people" style={{ fontSize: '2rem', color: '#0d6efd' }}></i>
                      </div>
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
                      <div className="mb-3">
                        <i className="bi bi-shop" style={{ fontSize: '2rem', color: '#198754' }}></i>
                      </div>
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
                      <div className="mb-3">
                        <i className="bi bi-graph-up" style={{ fontSize: '2rem', color: '#fd7e14' }}></i>
                      </div>
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
                      <i className="bi bi-clock me-1"></i>
                      Dashboard last updated: {new Date().toLocaleString()}
                    </p>
                    <p className="small mb-1">
                      <i className="bi bi-activity me-1"></i>
                      System status: <span className="text-success">Online</span>
                    </p>
                    <p className="small mb-0">
                      <i className="bi bi-shield-check me-1"></i>
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


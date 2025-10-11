import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Spinner, Alert } from 'react-bootstrap';
import axios from 'axios';
import { toast } from 'react-toastify';

const StoreOwnerMainDashboard = () => {
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/store-owner/dashboard');
      setDashboardData(response.data.data);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
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
          <p className="mt-2">Loading dashboard...</p>
        </div>
      </Container>
    );
  }

  if (!dashboardData) {
    return (
      <Container className="py-4">
        <Alert variant="danger">
          <h5>No Store Found</h5>
          <p>You don't have a store associated with your account. Please contact an administrator.</p>
        </Alert>
      </Container>
    );
  }

  return (
    <Container fluid className="py-4">
      <Row>
        <Col>
          <div className="d-flex justify-content-between align-items-center mb-4">
            <h2 className="mb-0">Store Owner Dashboard</h2>
            <div className="text-muted">
              Welcome back, {dashboardData.store.name}!
            </div>
          </div>
        </Col>
      </Row>

      {/* Store Info Card */}
      <Row className="mb-4">
        <Col>
          <Card className="border-0 shadow-sm">
            <Card.Header className="bg-primary text-white">
              <h5 className="mb-0">Store Information</h5>
            </Card.Header>
            <Card.Body>
              <Row>
                <Col md={6}>
                  <h6>Store Details</h6>
                  <ul className="list-unstyled">
                    <li className="mb-2">
                      <strong>Name:</strong> {dashboardData.store.name}
                    </li>
                    <li className="mb-2">
                      <strong>Email:</strong> {dashboardData.store.email}
                    </li>
                    <li className="mb-2">
                      <strong>Address:</strong> {dashboardData.store.address}
                    </li>
                  </ul>
                </Col>
                <Col md={6}>
                  <h6>Performance Metrics</h6>
                  <ul className="list-unstyled">
                    <li className="mb-2">
                      <strong>Average Rating:</strong>
                      <span className="ms-2">
                        <span className="rating-stars me-2">
                          {renderStars(Math.round(dashboardData.averageRating))}
                        </span>
                        <span className="fw-bold">
                          {dashboardData.averageRating.toFixed(1)}/5
                        </span>
                      </span>
                    </li>
                    <li className="mb-2">
                      <strong>Total Ratings:</strong> {dashboardData.totalRatings}
                    </li>
                  </ul>
                </Col>
              </Row>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Statistics Cards */}
      <Row className="g-4 mb-4">
        <Col md={4}>
          <Card className="stat-card h-100 border-0 shadow-sm">
            <Card.Body className="text-center">
              <div className="mb-3">
                <i className="bi bi-star-fill" style={{ fontSize: '3rem', color: '#ffc107' }}></i>
              </div>
              <h3 className="text-warning mb-2">
                {dashboardData.averageRating.toFixed(1)}
              </h3>
              <h5 className="card-title">Average Rating</h5>
              <p className="card-text text-muted small">
                Overall customer satisfaction
              </p>
            </Card.Body>
          </Card>
        </Col>
        <Col md={4}>
          <Card className="stat-card h-100 border-0 shadow-sm">
            <Card.Body className="text-center">
              <div className="mb-3">
                <i className="bi bi-people-fill" style={{ fontSize: '3rem', color: '#198754' }}></i>
              </div>
              <h3 className="text-success mb-2">
                {dashboardData.totalRatings}
              </h3>
              <h5 className="card-title">Total Ratings</h5>
              <p className="card-text text-muted small">
                Customer reviews received
              </p>
            </Card.Body>
          </Card>
        </Col>
        <Col md={4}>
          <Card className="stat-card h-100 border-0 shadow-sm">
            <Card.Body className="text-center">
              <div className="mb-3">
                <i className="bi bi-clock-fill" style={{ fontSize: '3rem', color: '#0d6efd' }}></i>
              </div>
              <h3 className="text-primary mb-2">
                {dashboardData.recentRatings.length}
              </h3>
              <h5 className="card-title">Recent Ratings</h5>
              <p className="card-text text-muted small">
                Latest customer feedback
              </p>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Recent Ratings */}
      {dashboardData.recentRatings.length > 0 && (
        <Row>
          <Col>
            <Card className="border-0 shadow-sm">
              <Card.Header className="bg-info text-white">
                <h5 className="mb-0">Recent Ratings</h5>
              </Card.Header>
              <Card.Body>
                <Row>
                  {dashboardData.recentRatings.map((rating, index) => (
                    <Col key={index} md={6} lg={4}>
                      <div className="border rounded p-3 mb-3">
                        <div className="d-flex justify-content-between align-items-start mb-2">
                          <span className="rating-stars">
                            {renderStars(rating.rating)}
                          </span>
                          <small className="text-muted">
                            {new Date(rating.createdAt).toLocaleDateString()}
                          </small>
                        </div>
                        {rating.review && (
                          <p className="small text-muted mb-0">
                            "{rating.review}"
                          </p>
                        )}
                      </div>
                    </Col>
                  ))}
                </Row>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      )}

      {/* Quick Actions */}
      <Row className="mt-4">
        <Col>
          <Card className="border-0 shadow-sm">
            <Card.Header className="bg-secondary text-white">
              <h5 className="mb-0">Quick Actions</h5>
            </Card.Header>
            <Card.Body>
              <Row className="g-3">
                <Col md={4}>
                  <Card className="h-100 border-0 bg-light">
                    <Card.Body className="text-center">
                      <div className="mb-3">
                        <i className="bi bi-star" style={{ fontSize: '2rem', color: '#ffc107' }}></i>
                      </div>
                      <h6>View All Ratings</h6>
                      <p className="small text-muted mb-3">
                        See detailed ratings and reviews
                      </p>
                      <a href="/store-owner/ratings" className="btn btn-outline-warning btn-sm">
                        View Ratings
                      </a>
                    </Card.Body>
                  </Card>
                </Col>
                <Col md={4}>
                  <Card className="h-100 border-0 bg-light">
                    <Card.Body className="text-center">
                      <div className="mb-3">
                        <i className="bi bi-people" style={{ fontSize: '2rem', color: '#198754' }}></i>
                      </div>
                      <h6>View Customers</h6>
                      <p className="small text-muted mb-3">
                        See customers who rated your store
                      </p>
                      <a href="/store-owner/users" className="btn btn-outline-success btn-sm">
                        View Customers
                      </a>
                    </Card.Body>
                  </Card>
                </Col>
                <Col md={4}>
                  <Card className="h-100 border-0 bg-light">
                    <Card.Body className="text-center">
                      <div className="mb-3">
                        <i className="bi bi-graph-up" style={{ fontSize: '2rem', color: '#0d6efd' }}></i>
                      </div>
                      <h6>Analytics</h6>
                      <p className="small text-muted mb-3">
                        Detailed performance metrics
                      </p>
                      <button className="btn btn-outline-primary btn-sm" disabled>
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
    </Container>
  );
};

export default StoreOwnerMainDashboard;




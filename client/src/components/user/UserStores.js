import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Form, Button, Spinner, Alert, Badge, Modal } from 'react-bootstrap';
import axios from 'axios';
import { toast } from 'react-toastify';

const UserStores = () => {
  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('desc');
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [selectedStore, setSelectedStore] = useState(null);
  const [rating, setRating] = useState(5);
  const [review, setReview] = useState('');

  useEffect(() => {
    fetchStores();
  }, [searchTerm, sortBy, sortOrder]);

  const fetchStores = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        search: searchTerm,
        sortBy,
        sortOrder,
        limit: '20'
      });
      
      const response = await axios.get(`/api/user/stores?${params}`);
      setStores(response.data.data.stores);
    } catch (error) {
      console.error('Error fetching stores:', error);
      toast.error('Failed to load stores');
    } finally {
      setLoading(false);
    }
  };

  const handleRateStore = (store) => {
    setSelectedStore(store);
    setRating(store.userRating?.rating || 5);
    setReview(store.userRating?.review || '');
    setShowRatingModal(true);
  };

  const submitRating = async () => {
    try {
      await axios.post(`/api/user/stores/${selectedStore._id}/rate`, {
        rating,
        review
      });
      
      toast.success('Rating submitted successfully!');
      setShowRatingModal(false);
      fetchStores(); // Refresh stores to show updated rating
    } catch (error) {
      console.error('Error submitting rating:', error);
      toast.error('Failed to submit rating');
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
            <h2 className="mb-0">Browse Stores</h2>
            <div className="text-muted">
              {stores.length} stores found
            </div>
          </div>
        </Col>
      </Row>

      {/* Search and Filter */}
      <Row className="mb-4">
        <Col md={6}>
          <Form.Group>
            <Form.Control
              type="text"
              placeholder="Search stores by name or address..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </Form.Group>
        </Col>
        <Col md={3}>
          <Form.Select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
          >
            <option value="createdAt">Sort by Date</option>
            <option value="name">Sort by Name</option>
            <option value="averageRating">Sort by Rating</option>
          </Form.Select>
        </Col>
        <Col md={3}>
          <Form.Select
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value)}
          >
            <option value="desc">Descending</option>
            <option value="asc">Ascending</option>
          </Form.Select>
        </Col>
      </Row>

      {/* Stores Grid */}
      <Row className="g-4">
        {stores.map((store) => (
          <Col key={store._id} md={6} lg={4}>
            <Card className="h-100 border-0 shadow-sm">
              <Card.Body>
                <div className="d-flex justify-content-between align-items-start mb-3">
                  <h5 className="card-title mb-0">{store.name}</h5>
                  <Badge bg="primary">
                    {store.totalRatings} ratings
                  </Badge>
                </div>
                
                <p className="text-muted small mb-3">
                  <i className="bi bi-geo-alt me-1"></i>
                  {store.address}
                </p>

                <div className="mb-3">
                  <div className="d-flex align-items-center mb-1">
                    <span className="me-2">Average Rating:</span>
                    <span className="rating-stars me-2">
                      {renderStars(Math.round(store.averageRating))}
                    </span>
                    <span className="fw-bold">
                      {store.averageRating.toFixed(1)}
                    </span>
                  </div>
                  
                  {store.userRating && (
                    <div className="d-flex align-items-center">
                      <span className="me-2">Your Rating:</span>
                      <span className="rating-stars me-2">
                        {renderStars(store.userRating.rating)}
                      </span>
                      <span className="fw-bold text-primary">
                        {store.userRating.rating}
                      </span>
                    </div>
                  )}
                </div>

                <Button
                  variant={store.userRating ? "outline-primary" : "primary"}
                  onClick={() => handleRateStore(store)}
                  className="w-100"
                >
                  {store.userRating ? 'Update Rating' : 'Rate Store'}
                </Button>
              </Card.Body>
            </Card>
          </Col>
        ))}
      </Row>

      {stores.length === 0 && (
        <Row>
          <Col>
            <Alert variant="info" className="text-center">
              <h5>No stores found</h5>
              <p>Try adjusting your search criteria or check back later.</p>
            </Alert>
          </Col>
        </Row>
      )}

      {/* Rating Modal */}
      <Modal show={showRatingModal} onHide={() => setShowRatingModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>
            Rate {selectedStore?.name}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedStore && (
            <div>
              <div className="mb-3">
                <label className="form-label">Your Rating</label>
                <div className="d-flex align-items-center">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      className="btn btn-link p-0 me-1"
                      onClick={() => setRating(star)}
                    >
                      <span
                        style={{ fontSize: '2rem' }}
                        className={star <= rating ? 'star-filled' : 'star-empty'}
                      >
                        ★
                      </span>
                    </button>
                  ))}
                  <span className="ms-2 fw-bold">{rating}/5</span>
                </div>
              </div>
              
              <div className="mb-3">
                <label className="form-label">Review (Optional)</label>
                <textarea
                  className="form-control"
                  rows="3"
                  value={review}
                  onChange={(e) => setReview(e.target.value)}
                  placeholder="Share your experience..."
                  maxLength="500"
                />
                <div className="form-text">
                  {review.length}/500 characters
                </div>
              </div>
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowRatingModal(false)}>
            Cancel
          </Button>
          <Button variant="primary" onClick={submitRating}>
            Submit Rating
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

export default UserStores;


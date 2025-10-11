import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Form, Button, Spinner, Alert, Badge, Modal } from 'react-bootstrap';
import axios from 'axios';
import { toast } from 'react-toastify';

const UserStores = () => {
  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState(''); 
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('desc');
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [selectedStore, setSelectedStore] = useState(null);
  const [rating, setRating] = useState(5);
  const [review, setReview] = useState('');

  
  useEffect(() => {
    fetchStores();
  }, [debouncedSearchTerm, sortBy, sortOrder]);

  
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 500);

    return () => {
      clearTimeout(handler);
    };
  }, [searchTerm]);

  const fetchStores = async () => {
    try {
      setLoading(true);
      
      
      const response = await axios.get('/api/user/stores', { 
        params: {
          search: debouncedSearchTerm, 
          sortBy,
          sortOrder,
          limit: '50'
        }
      });
      
      const fetchedStores = response.data?.data?.stores || [];
      
      console.log('Fetched stores:', fetchedStores.length);
      
      if (fetchedStores.length === 0) {
        console.warn('No stores returned. Check if stores exist in database with isActive: true');
      }

      setStores(fetchedStores); 

    } catch (error) {
      const status = error.response?.status;
      let errorMsg = error.response?.data?.message || error.message;

      if (status === 401 || status === 403) {
          errorMsg = `Authentication Error (${status}): Please log in again. ${errorMsg}`;
          console.error(errorMsg);
      } else if (status === 404) {
          errorMsg = `Route Error (${status}): The API endpoint was not found on the server.`;
          console.error(errorMsg);
      } else {
          console.error('Error fetching stores:', error.response?.data || error.message);
      }
      
      toast.error('Failed to load stores: ' + errorMsg);
      setStores([]);
      
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
      if (!selectedStore?._id) {
          toast.error("Cannot rate: Store ID is missing.");
          return;
      }
      
      // FIXED: Use absolute path
      await axios.post(`/api/user/stores/${selectedStore._id}/rate`, {
        rating,
        review
      });
      
      toast.success('Rating submitted successfully!');
      setShowRatingModal(false);
      fetchStores();
    } catch (error) {
      console.error('Error submitting rating:', error.response?.data || error.message);
      const errorMsg = error.response?.data?.message || 'Failed to submit rating.';
      toast.error(errorMsg);
    }
  };

  const renderStars = (rating) => {
    const roundedRating = Math.round(rating || 0);
    return Array.from({ length: 5 }, (_, index) => (
      <span
        key={index}
        className={index < roundedRating ? 'star-filled' : 'star-empty'}
        style={{ 
          color: index < roundedRating ? '#ffc107' : '#e4e5e9',
          fontSize: '1.5rem'
        }}
      >
        ★
      </span>
    ));
  };

  const renderInteractiveStars = (currentRating, onRatingChange) => {
    return [1, 2, 3, 4, 5].map((star) => (
      <button
        key={star}
        type="button"
        className="btn btn-link p-0 me-1"
        onClick={() => onRatingChange(star)}
        style={{ textDecoration: 'none' }}
      >
        <span
          style={{ 
            fontSize: '2rem',
            color: star <= currentRating ? '#ffc107' : '#e4e5e9'
          }}
        >
          ★
        </span>
      </button>
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
            <div>
              <h2 className="mb-0">Browse Stores</h2>
              <p className="text-muted mb-0">{stores.length} stores available</p>
            </div>
            <Button variant="outline-primary" onClick={fetchStores}>
              <i className="bi bi-arrow-clockwise me-2"></i>
              Refresh
            </Button>
          </div>
        </Col>
      </Row>

      {/* Search and Filter */}
      <Row className="mb-4">
        <Col>
          <Card className="border-0 shadow-sm">
            <Card.Body>
              <Row className="align-items-end">
                <Col md={6}>
                  <Form.Group>
                    <Form.Label className="small fw-bold">Search</Form.Label>
                    <Form.Control
                      type="text"
                      placeholder="Search stores by name or address..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </Form.Group>
                </Col>
                <Col md={3}>
                  <Form.Group>
                    <Form.Label className="small fw-bold">Sort By</Form.Label>
                    <Form.Select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value)}
                    >
                      <option value="createdAt">Date Added</option>
                      <option value="name">Store Name</option>
                      <option value="averageRating">Average Rating</option>
                    </Form.Select>
                  </Form.Group>
                </Col>
                <Col md={3}>
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
              </Row>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Stores Grid */}
      <Row className="g-4">
        {stores.length > 0 ? (
          stores.map((store) => (
            <Col key={store._id} md={6} lg={4}>
              <Card className="h-100 border-0 shadow-sm hover-card">
                <Card.Body>
                  <div className="d-flex justify-content-between align-items-start mb-3">
                    <h5 className="card-title mb-0 fw-bold">{store.name}</h5>
                    <Badge bg="primary" pill>
                      {store.totalRatings || 0} {store.totalRatings === 1 ? 'rating' : 'ratings'}
                    </Badge>
                  </div>
                  
                  <p className="text-muted small mb-3">
                    <i className="bi bi-geo-alt-fill me-1"></i>
                    {store.address}
                  </p>

                  {store.owner && (
                    <p className="text-muted small mb-3">
                      <i className="bi bi-person-fill me-1"></i>
                      Owner: {store.owner.name}
                    </p>
                  )}

                  <div className="mb-3">
                    <div className="d-flex align-items-center mb-2">
                      <span className="me-2 small fw-bold">Overall Rating:</span>
                      <span className="me-2">
                        {renderStars(store.averageRating)}
                      </span>
                      <span className="fw-bold text-primary">
                        {(store.averageRating || 0).toFixed(1)}/5
                      </span>
                    </div>
                    
                    {store.userRating && (
                      <div className="d-flex align-items-center p-2 bg-light rounded">
                        <span className="me-2 small fw-bold">Your Rating:</span>
                        <span className="me-2">
                          {renderStars(store.userRating.rating)}
                        </span>
                        <span className="fw-bold text-success">
                          {store.userRating.rating}/5
                        </span>
                      </div>
                    )}
                  </div>

                  <Button
                    variant={store.userRating ? "outline-primary" : "primary"}
                    onClick={() => handleRateStore(store)}
                    className="w-100"
                  >
                    <i className={`bi bi-star${store.userRating ? '-fill' : ''} me-2`}></i>
                    {store.userRating ? 'Update Your Rating' : 'Rate This Store'}
                  </Button>
                </Card.Body>
              </Card>
            </Col>
          ))
        ) : (
          <Col xs={12}>
            <Alert variant="info" className="text-center shadow-sm">
              <i className="bi bi-info-circle me-2" style={{ fontSize: '1.5rem' }}></i>
              <h5 className="mt-2">No stores found</h5>
              <p className="mb-0">
                {searchTerm 
                  ? 'Try adjusting your search criteria or clearing the search box.' 
                  : 'No stores are currently available. Please check back later or contact support.'}
              </p>
            </Alert>
          </Col>
        )}
      </Row>

      {/* Rating Modal */}
      <Modal show={showRatingModal} onHide={() => setShowRatingModal(false)} centered>
        <Modal.Header closeButton className="bg-primary text-white">
          <Modal.Title>
            <i className="bi bi-star-fill me-2"></i>
            Rate {selectedStore?.name}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedStore && (
            <div>
              <div className="mb-4">
                <label className="form-label fw-bold">Select Your Rating</label>
                <div className="d-flex align-items-center justify-content-center py-3">
                  {renderInteractiveStars(rating, setRating)}
                  <span className="ms-3 h4 mb-0 text-primary">{rating}/5</span>
                </div>
              </div>
              
              <div className="mb-3">
                <label className="form-label fw-bold">
                  Write a Review <span className="text-muted fw-normal">(Optional)</span>
                </label>
                <textarea
                  className="form-control"
                  rows="4"
                  value={review}
                  onChange={(e) => setReview(e.target.value)}
                  placeholder="Share your experience with this store..."
                  maxLength="500"
                />
                <div className="form-text">
                  {review.length}/500 characters
                </div>
              </div>

              <Alert variant="info" className="mb-0">
                <i className="bi bi-info-circle me-2"></i>
                <small>Your rating will be visible to the store owner and other users.</small>
              </Alert>
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowRatingModal(false)}>
            <i className="bi bi-x-circle me-2"></i>
            Cancel
          </Button>
          <Button variant="primary" onClick={submitRating}>
            <i className="bi bi-check-circle me-2"></i>
            Submit Rating
          </Button>
        </Modal.Footer>
      </Modal>

      <style>{`
        .hover-card {
          transition: transform 0.2s, box-shadow 0.2s;
        }
        .hover-card:hover {
          transform: translateY(-5px);
          box-shadow: 0 0.5rem 1rem rgba(0, 0, 0, 0.15) !important;
        }
        .star-filled { 
          color: #ffc107; 
        }
        .star-empty { 
          color: #e4e5e9; 
        }
      `}</style>
    </Container>
  );
};

export default UserStores;
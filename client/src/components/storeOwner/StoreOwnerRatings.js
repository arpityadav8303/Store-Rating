import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Button, Spinner, Alert, Badge } from 'react-bootstrap';
import axios from 'axios';
import { toast } from 'react-toastify';

const StoreOwnerRatings = () => {
  const [ratingsData, setRatingsData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRatings();
  }, []);

  const fetchRatings = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/store-owner/ratings');
      setRatingsData(response.data.data);
    } catch (error) {
      console.error('Error fetching ratings:', error);
      toast.error('Failed to load ratings');
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
          <p className="mt-2">Loading ratings...</p>
        </div>
      </Container>
    );
  }

  if (!ratingsData) {
    return (
      <Container className="py-4">
        <Alert variant="danger">
          <h5>No Store Found</h5>
          <p>You don't have a store associated with your account.</p>
        </Alert>
      </Container>
    );
  }

  return (
    <Container fluid className="py-4">
      <Row>
        <Col>
          <div className="d-flex justify-content-between align-items-center mb-4">
            <h2 className="mb-0">Store Ratings</h2>
            <div className="text-muted">
              {ratingsData.ratings.length} ratings for {ratingsData.store.name}
            </div>
          </div>
        </Col>
      </Row>

      {ratingsData.ratings.length === 0 ? (
        <Row>
          <Col>
            <Alert variant="info" className="text-center">
              <h5>No ratings yet</h5>
              <p>Your store hasn't received any ratings yet. Encourage customers to rate your store!</p>
            </Alert>
          </Col>
        </Row>
      ) : (
        <Row className="g-4">
          {ratingsData.ratings.map((rating) => (
            <Col key={rating._id} md={6} lg={4}>
              <Card className="h-100 border-0 shadow-sm">
                <Card.Body>
                  <div className="d-flex justify-content-between align-items-start mb-3">
                    <div>
                      <h6 className="mb-1">{rating.user.name}</h6>
                      <small className="text-muted">{rating.user.email}</small>
                    </div>
                    <span className="rating-stars">
                      {renderStars(rating.rating)}
                    </span>
                  </div>
                  
                  {rating.review && (
                    <div className="mb-3">
                      <p className="mb-0">
                        <strong>Review:</strong>
                      </p>
                      <p className="text-muted small">
                        "{rating.review}"
                      </p>
                    </div>
                  )}

                  <div className="d-flex justify-content-between align-items-center">
                    <small className="text-muted">
                      {new Date(rating.createdAt).toLocaleDateString()}
                    </small>
                    <Badge bg={rating.rating >= 4 ? 'success' : rating.rating >= 3 ? 'warning' : 'danger'}>
                      {rating.rating}/5
                    </Badge>
                  </div>
                </Card.Body>
              </Card>
            </Col>
          ))}
        </Row>
      )}
    </Container>
  );
};

export default StoreOwnerRatings;

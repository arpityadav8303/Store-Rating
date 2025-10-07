import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Button, Spinner, Alert } from 'react-bootstrap';
import axios from 'axios';
import { toast } from 'react-toastify';

const UserRatings = () => {
  const [ratings, setRatings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRatings();
  }, []);

  const fetchRatings = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/user/ratings');
      setRatings(response.data.data.ratings);
    } catch (error) {
      console.error('Error fetching ratings:', error);
      toast.error('Failed to load ratings');
    } finally {
      setLoading(false);
    }
  };

  const deleteRating = async (ratingId) => {
    try {
      await axios.delete(`/api/user/ratings/${ratingId}`);
      toast.success('Rating deleted successfully!');
      fetchRatings(); // Refresh ratings
    } catch (error) {
      console.error('Error deleting rating:', error);
      toast.error('Failed to delete rating');
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
          <p className="mt-2">Loading your ratings...</p>
        </div>
      </Container>
    );
  }

  return (
    <Container fluid className="py-4">
      <Row>
        <Col>
          <div className="d-flex justify-content-between align-items-center mb-4">
            <h2 className="mb-0">My Ratings</h2>
            <div className="text-muted">
              {ratings.length} ratings submitted
            </div>
          </div>
        </Col>
      </Row>

      {ratings.length === 0 ? (
        <Row>
          <Col>
            <Alert variant="info" className="text-center">
              <h5>No ratings yet</h5>
              <p>Start rating stores to see them here!</p>
            </Alert>
          </Col>
        </Row>
      ) : (
        <Row className="g-4">
          {ratings.map((rating) => (
            <Col key={rating._id} md={6} lg={4}>
              <Card className="h-100 border-0 shadow-sm">
                <Card.Body>
                  <div className="d-flex justify-content-between align-items-start mb-3">
                    <h5 className="card-title mb-0">{rating.store.name}</h5>
                    <span className="rating-stars">
                      {renderStars(rating.rating)}
                    </span>
                  </div>
                  
                  <p className="text-muted small mb-3">
                    <i className="bi bi-geo-alt me-1"></i>
                    {rating.store.address}
                  </p>

                  {rating.review && (
                    <div className="mb-3">
                      <p className="mb-0">
                        <strong>Your Review:</strong>
                      </p>
                      <p className="text-muted small">
                        "{rating.review}"
                      </p>
                    </div>
                  )}

                  <div className="d-flex justify-content-between align-items-center">
                    <small className="text-muted">
                      Rated on {new Date(rating.createdAt).toLocaleDateString()}
                    </small>
                    <Button
                      variant="outline-danger"
                      size="sm"
                      onClick={() => deleteRating(rating._id)}
                    >
                      Delete
                    </Button>
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

export default UserRatings;


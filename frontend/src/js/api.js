const BASE_URL = '/api';

const handleResponse = async (response) => {
  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    const errorMsg = errData.error || `HTTP error! status: ${response.status}`;
    throw new Error(errorMsg);
  }
  return response.json();
};

const API = {
  
  login: async (email, password) => {
    const res = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await handleResponse(res);
    
    if (data.token) localStorage.setItem('token', data.token);
    return data;
  },

  signup: async (email, password, full_name, role) => {
    const res = await fetch(`${BASE_URL}/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, full_name, role })
    });
    return handleResponse(res);
  },

  logout: async () => {
    localStorage.removeItem('token');
    const res = await fetch(`${BASE_URL}/auth/logout`, { method: 'POST' });
    return handleResponse(res);
  },

  getProfile: async () => {
    const res = await fetch(`${BASE_URL}/auth/profile`, {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    });
    return handleResponse(res);
  },

  uploadId: async (formData) => {
    const res = await fetch(`${BASE_URL}/auth/verify-id`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
      body: formData 
    });
    return handleResponse(res);
  },

  getListings: async (search = '', category = '', location = '') => {
    const queryParams = new URLSearchParams();
    if (search) queryParams.append('search', search);
    if (category) queryParams.append('category', category);
    if (location) queryParams.append('location', location);

    const res = await fetch(`${BASE_URL}/listings?${queryParams.toString()}`);
    return handleResponse(res);
  },

  getListing: async (id) => {
    const res = await fetch(`${BASE_URL}/listings/${id}`);
    return handleResponse(res);
  },

  createListing: async (formData) => {
    const res = await fetch(`${BASE_URL}/listings`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
      body: formData
    });
    return handleResponse(res);
  },

  deleteListing: async (id) => {
    const res = await fetch(`${BASE_URL}/listings/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    });
    return handleResponse(res);
  },

  createBooking: async (listing_id, start_date, end_date) => {
    const res = await fetch(`${BASE_URL}/bookings`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify({ listing_id, start_date, end_date })
    });
    return handleResponse(res);
  },

  getBookings: async () => {
    const res = await fetch(`${BASE_URL}/bookings`, {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    });
    return handleResponse(res);
  },

  updateBookingStatus: async (id, status) => {
    const res = await fetch(`${BASE_URL}/bookings/${id}/status`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify({ status })
    });
    return handleResponse(res);
  },

  getChatHistory: async (bookingId) => {
    const res = await fetch(`${BASE_URL}/chat/booking/${bookingId}`, {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    });
    return handleResponse(res);
  },

  getSmartPriceSuggestion: async (title, description, category, location) => {
    const res = await fetch(`${BASE_URL}/ai/suggest-price`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify({ title, description, category, location })
    });
    return handleResponse(res);
  },

  uploadDamageInspection: async (formData) => {
    const res = await fetch(`${BASE_URL}/ai/damage-check`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
      body: formData
    });
    return handleResponse(res);
  },

  submitReview: async (booking_id, rating, comment) => {
    const res = await fetch(`${BASE_URL}/reviews`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify({ booking_id, rating, comment })
    });
    return handleResponse(res);
  },

  getUserReviews: async (userId) => {
    const res = await fetch(`${BASE_URL}/reviews/user/${userId}`);
    return handleResponse(res);
  }
};

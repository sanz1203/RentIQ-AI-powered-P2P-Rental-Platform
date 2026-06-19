let currentUser = null;
let currentScreen = 'browse';
let socket = null;
let activeChatBookingId = null;

let currentStarRating = 0;

document.addEventListener('DOMContentLoaded', async () => {
  setupNavigation();
  setupAuthForms();
  setupSearch();
  setupBookingForm();
  setupListingModal();
  setupReviewModal();
  setupDamageModal();
  setupIdVerification();
  
  try {
    const token = localStorage.getItem('token');
    if (token) {
      currentUser = await API.getProfile();
      updateAuthUI();
    }
  } catch (err) {
    localStorage.removeItem('token');
  }

  showScreen('browse');
});

function showScreen(screenId, params = {}) {
  console.log(`Routing to: ${screenId}`, params);
  currentScreen = screenId;
  
  document.querySelectorAll('.app-screen').forEach(s => s.classList.add('hidden'));
  
  const target = document.getElementById(`screen-${screenId}`);
  if (target) target.classList.remove('hidden');

  document.querySelectorAll('.nav-link').forEach(link => {
    if (link.getAttribute('data-screen') === screenId) {
      link.classList.add('active');
    } else {
      link.classList.remove('active');
    }
  });

  if (screenId === 'browse') {
    loadBrowseListings();
  } else if (screenId === 'listing-detail') {
    loadListingDetails(params.id);
  } else if (screenId === 'dashboard') {
    loadDashboard();
  } else if (screenId === 'profile') {
    loadProfile();
  } else if (screenId === 'chat') {
    loadChatRoom(params.bookingId);
  }
}

function showAlert(message, type = 'info') {
  const banner = document.getElementById('alert-banner');
  const msgText = document.getElementById('alert-message');
  msgText.textContent = message;
  
  banner.className = 'alert';
  if (type === 'error') {
    banner.classList.add('badge-warning'); 
  } else {
    banner.classList.add('badge-approved'); 
  }
  
  banner.classList.remove('hidden');
  setTimeout(() => banner.classList.add('hidden'), 5000);
}

function updateAuthUI() {
  const authLinks = document.getElementById('nav-auth-links');
  const guestLinks = document.getElementById('nav-guest-links');
  
  if (currentUser) {
    authLinks.classList.remove('hidden');
    guestLinks.classList.add('hidden');
  } else {
    authLinks.classList.add('hidden');
    guestLinks.classList.remove('hidden');
  }
}

function setupNavigation() {
  document.querySelectorAll('[data-screen]').forEach(element => {
    element.addEventListener('click', (e) => {
      e.preventDefault();
      const targetScreen = element.getAttribute('data-screen');
      
      if (!currentUser && (targetScreen === 'dashboard' || targetScreen === 'profile')) {
        showScreen('auth');
      } else {
        showScreen(targetScreen);
      }
    });
  });

  document.getElementById('nav-logo').addEventListener('click', (e) => {
    e.preventDefault();
    showScreen('browse');
  });

  document.getElementById('btn-logout').addEventListener('click', async () => {
    try {
      await API.logout();
      currentUser = null;
      updateAuthUI();
      showAlert('Logged out successfully.');
      showScreen('browse');
    } catch (err) {
      showAlert(err.message, 'error');
    }
  });

  const toggle = document.getElementById('nav-toggle');
  const menu = document.getElementById('nav-menu');
  toggle.addEventListener('click', () => {
    menu.classList.toggle('hidden');
  });
}

function setupSearch() {
  const keywordInput = document.getElementById('search-keyword');
  const locationInput = document.getElementById('search-location');
  const categorySelect = document.getElementById('search-category');
  const searchBtn = document.getElementById('btn-search');

  const executeSearch = () => {
    loadBrowseListings(
      keywordInput.value.trim(),
      categorySelect.value,
      locationInput.value.trim()
    );
  };

  searchBtn.addEventListener('click', executeSearch);
  keywordInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') executeSearch(); });
  locationInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') executeSearch(); });
}

function setupAuthForms() {
  const showRegister = document.getElementById('link-show-register');
  const showLogin = document.getElementById('link-show-login');
  const loginCard = document.getElementById('login-card');
  const registerCard = document.getElementById('register-card');

  showRegister.addEventListener('click', (e) => {
    e.preventDefault();
    loginCard.classList.add('hidden');
    registerCard.classList.remove('hidden');
  });

  showLogin.addEventListener('click', (e) => {
    e.preventDefault();
    registerCard.classList.add('hidden');
    loginCard.classList.remove('hidden');
  });

  document.getElementById('form-login').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;

    try {
      const data = await API.login(email, password);
      currentUser = data.user;
      updateAuthUI();
      showAlert('Welcome back to RentIQ!');
      showScreen('browse');
      document.getElementById('form-login').reset();
    } catch (err) {
      showAlert(err.message, 'error');
    }
  });

  document.getElementById('form-register').addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('reg-name').value.trim();
    const email = document.getElementById('reg-email').value.trim();
    const password = document.getElementById('reg-password').value;
    const role = document.getElementById('reg-role').value;

    try {
      await API.signup(email, password, name, role);
      showAlert('Registration successful! Please log in.');
      loginCard.classList.remove('hidden');
      registerCard.classList.add('hidden');
      document.getElementById('form-register').reset();
    } catch (err) {
      showAlert(err.message, 'error');
    }
  });
}

async function loadBrowseListings(search = '', category = '', location = '') {
  const grid = document.getElementById('listings-grid');
  grid.innerHTML = '<div class="text-center w-full py-12 text-secondary"><i class="fa-solid fa-spinner fa-spin fa-2x"></i></div>';
  
  try {
    const listings = await API.getListings(search, category, location);
    
    if (listings.length === 0) {
      grid.innerHTML = '<div class="text-center w-full py-12 text-secondary">No items match your search filters.</div>';
      return;
    }

    grid.innerHTML = '';
    listings.forEach(item => {
      const card = document.createElement('div');
      card.className = 'listing-card';
      card.addEventListener('click', () => showScreen('listing-detail', { id: item.id }));

      let imageSrc = '<div class="listing-no-img"><i class="fa-solid fa-image"></i></div>';
      if (item.image_urls) {
        const firstImg = item.image_urls.split(',')[0];
        imageSrc = `<img src="${firstImg}" class="listing-thumbnail" alt="${item.title}">`;
      }

      card.innerHTML = `
        ${imageSrc}
        <div class="listing-body">
          <div class="listing-cat">${item.category}</div>
          <h4 class="listing-title-text">${item.title}</h4>
          <div class="listing-loc"><i class="fa-solid fa-location-dot"></i> ${item.location}</div>
          <div class="listing-footer">
            <div class="listing-price">₹${parseFloat(item.price_per_day).toFixed(2)}<span>/ day</span></div>
          </div>
        </div>
      `;
      grid.appendChild(card);
    });
  } catch (err) {
    grid.innerHTML = `<div class="text-center w-full py-12 text-danger">Error: ${err.message}</div>`;
  }
}

async function loadListingDetails(id) {
  const backBtn = document.getElementById('btn-back-to-browse');
  backBtn.onclick = () => showScreen('browse');

  try {
    const item = await API.getListing(id);
    
    const gallery = document.getElementById('detail-images');
    if (item.image_urls) {
      const urls = item.image_urls.split(',');
      gallery.innerHTML = urls.map(url => `<img src="${url}" alt="${item.title}">`).join('');
    } else {
      gallery.innerHTML = '<div class="listing-no-img w-full" style="height: 300px;"><i class="fa-solid fa-image fa-2x"></i></div>';
    }

    document.getElementById('detail-category').textContent = item.category;
    document.getElementById('detail-title').textContent = item.title;
    document.getElementById('detail-location-text').textContent = item.location;
    document.getElementById('detail-description').textContent = item.description;
    document.getElementById('detail-price-text').textContent = `₹${parseFloat(item.price_per_day).toFixed(2)}`;
    
    document.getElementById('detail-owner-name').textContent = item.owner_name;
    
    const verifiedBadge = document.getElementById('detail-owner-verified');
    if (item.owner_verified) {
      verifiedBadge.classList.remove('hidden');
    } else {
      verifiedBadge.classList.add('hidden');
    }

    document.getElementById('form-create-booking').reset();
    document.getElementById('booking-price-breakdown').classList.add('hidden');
    
    document.getElementById('form-create-booking').dataset.listingId = item.id;
    document.getElementById('form-create-booking').dataset.price = item.price_per_day;

  } catch (err) {
    showAlert(err.message, 'error');
    showScreen('browse');
  }
}

function setupBookingForm() {
  const startInput = document.getElementById('book-start-date');
  const endInput = document.getElementById('book-end-date');
  const form = document.getElementById('form-create-booking');
  const breakdown = document.getElementById('booking-price-breakdown');

  const today = new Date().toISOString().split('T')[0];
  startInput.min = today;
  endInput.min = today;

  const calculateTotal = () => {
    const startVal = startInput.value;
    const endVal = endInput.value;
    const pricePerDay = parseFloat(form.dataset.price);

    if (startVal && endVal && pricePerDay) {
      const start = new Date(startVal);
      const end = new Date(endVal);

      if (end >= start) {
        const diffTime = Math.abs(end - start);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

        const rentalCost = diffDays * pricePerDay;
        const depositCost = Math.round(rentalCost * 0.3 * 100) / 100;
        const totalCost = rentalCost + depositCost;

        document.getElementById('breakdown-days').textContent = diffDays;
        document.getElementById('breakdown-rental-cost').textContent = `₹${rentalCost.toFixed(2)}`;
        document.getElementById('breakdown-deposit-cost').textContent = `₹${depositCost.toFixed(2)}`;
        document.getElementById('breakdown-total-cost').textContent = `₹${totalCost.toFixed(2)}`;
        
        breakdown.classList.remove('hidden');
      } else {
        breakdown.classList.add('hidden');
      }
    }
  };

  startInput.addEventListener('change', () => {
    endInput.min = startInput.value;
    calculateTotal();
  });
  endInput.addEventListener('change', calculateTotal);

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!currentUser) {
      showAlert('Please login to rent this item.', 'error');
      showScreen('auth');
      return;
    }

    const listingId = form.dataset.listingId;
    const start = startInput.value;
    const end = endInput.value;

    try {
      await API.createBooking(listingId, start, end);
      showAlert('Booking request sent to owner! Update status in dashboard.', 'success');
      showScreen('dashboard');
    } catch (err) {
      showAlert(err.message, 'error');
    }
  });
}

function switchDashboardTab(tabName) {
  
  document.getElementById('tab-rentals').classList.toggle('active', tabName === 'rentals');
  document.getElementById('tab-listings').classList.toggle('active', tabName === 'listings');

  document.getElementById('tab-content-rentals').classList.toggle('hidden', tabName !== 'rentals');
  document.getElementById('tab-content-listings').classList.toggle('hidden', tabName !== 'listings');
}

async function loadDashboard() {
  try {
    const { rentals, listings_rented } = await API.getBookings();

    const rentalsBody = document.getElementById('table-rentals-body');
    if (rentals.length === 0) {
      rentalsBody.innerHTML = '<tr><td colspan="5" class="text-center text-secondary">You haven\'t booked any items yet.</td></tr>';
    } else {
      rentalsBody.innerHTML = rentals.map(b => {
        const start = new Date(b.start_date).toLocaleDateString();
        const end = new Date(b.end_date).toLocaleDateString();
        
        let actionBtn = '';
        if (b.status === 'approved') {
          
          actionBtn = `<button class="btn btn-outline btn-sm" onclick="openDamageModal('${b.id}', 'pre_rental')"><i class="fa-solid fa-camera"></i> Check In</button>`;
        } else if (b.status === 'active') {
          
          actionBtn = `<button class="btn btn-outline btn-sm" onclick="openDamageModal('${b.id}', 'post_rental')"><i class="fa-solid fa-flag-checkered"></i> Return/Check Out</button>`;
        } else if (b.status === 'completed') {
          
          actionBtn = `<button class="btn btn-primary btn-sm" onclick="openReviewModal('${b.id}')"><i class="fa-solid fa-star"></i> Review</button>`;
        }

        const chatBtn = `<button class="btn btn-outline btn-sm mr-2" onclick="showScreen('chat', { bookingId: '${b.id}' })"><i class="fa-solid fa-comment-dots"></i> Chat</button>`;

        return `
          <tr>
            <td class="font-semibold">${b.listing_title}</td>
            <td class="text-secondary">${start} - ${end}</td>
            <td>₹${parseFloat(b.total_price).toFixed(2)}</td>
            <td><span class="badge badge-${b.status}">${b.status}</span></td>
            <td>
              <div style="display:flex; gap:6px;">
                ${b.status !== 'pending' && b.status !== 'cancelled' && b.status !== 'rejected' ? chatBtn : ''}
                ${actionBtn}
              </div>
            </td>
          </tr>
        `;
      }).join('');
    }

    const ownerListingsGrid = document.getElementById('owner-listings-grid');
    const myItems = await API.getListings('', '', '');
    const myOwnedItems = myItems.filter(item => item.owner_id === currentUser.id);

    if (myOwnedItems.length === 0) {
      ownerListingsGrid.innerHTML = '<div class="text-center w-full py-6 text-secondary">You haven\'t listed any items for rent yet.</div>';
    } else {
      ownerListingsGrid.innerHTML = myOwnedItems.map(item => {
        let imageSrc = '<div class="listing-no-img" style="height:120px;"><i class="fa-solid fa-image"></i></div>';
        if (item.image_urls) {
          const firstImg = item.image_urls.split(',')[0];
          imageSrc = `<img src="${firstImg}" style="width:100%; height:120px; object-fit:cover;" alt="${item.title}">`;
        }
        return `
          <div class="listing-card" style="border-radius:8px;">
            ${imageSrc}
            <div style="padding:10px;">
              <h5 class="font-semibold text-truncate">${item.title}</h5>
              <div style="display:flex; justify-content:space-between; margin-top:6px; align-items:center;">
                <span class="font-bold">₹${parseFloat(item.price_per_day).toFixed(2)}/d</span>
                <button class="btn btn-link btn-sm text-warning" onclick="deleteListingItem('${item.id}')"><i class="fa-solid fa-trash"></i> Delete</button>
              </div>
            </div>
          </div>
        `;
      }).join('');
    }

    const requestsBody = document.getElementById('table-owner-requests-body');
    if (listings_rented.length === 0) {
      requestsBody.innerHTML = '<tr><td colspan="6" class="text-center text-secondary">No rental requests received yet.</td></tr>';
    } else {
      requestsBody.innerHTML = listings_rented.map(b => {
        const start = new Date(b.start_date).toLocaleDateString();
        const end = new Date(b.end_date).toLocaleDateString();
        
        let actionBtn = '';
        if (b.status === 'pending') {
          actionBtn = `
            <button class="btn btn-primary btn-sm" onclick="handleBookingAction('${b.id}', 'approved')">Approve</button>
            <button class="btn btn-outline btn-sm" onclick="handleBookingAction('${b.id}', 'rejected')">Reject</button>
          `;
        } else if (b.status === 'approved') {
          actionBtn = `
            <button class="btn btn-outline btn-sm" onclick="handleBookingAction('${b.id}', 'active')"><i class="fa-solid fa-key"></i> Key Handover (Start)</button>
          `;
        } else if (b.status === 'active') {
          actionBtn = `<span class="text-secondary font-medium">Rental Active</span>`;
        } else if (b.status === 'completed') {
          actionBtn = `<button class="btn btn-primary btn-sm" onclick="openReviewModal('${b.id}')"><i class="fa-solid fa-star"></i> Review Renter</button>`;
        }

        const chatBtn = `<button class="btn btn-outline btn-sm mr-2" onclick="showScreen('chat', { bookingId: '${b.id}' })"><i class="fa-solid fa-comment-dots"></i> Chat</button>`;

        return `
          <tr>
            <td class="font-semibold">${b.renter_name}</td>
            <td>${b.listing_title}</td>
            <td class="text-secondary">${start} - ${end}</td>
            <td>₹${parseFloat(b.security_deposit).toFixed(2)}</td>
            <td>
              <span class="badge badge-${b.status}">${b.status}</span>
              ${b.payment_status === 'disputed' ? '<span class="badge badge-warning" style="margin-left:4px;">Disputed</span>' : ''}
            </td>
            <td>
              <div style="display:flex; gap:6px;">
                ${b.status !== 'pending' && b.status !== 'cancelled' && b.status !== 'rejected' ? chatBtn : ''}
                ${actionBtn}
              </div>
            </td>
          </tr>
        `;
      }).join('');
    }

  } catch (err) {
    showAlert(err.message, 'error');
  }
}

async function handleBookingAction(bookingId, status) {
  try {
    await API.updateBookingStatus(bookingId, status);
    showAlert(`Booking marked as ${status}.`, 'success');
    loadDashboard();
  } catch (err) {
    showAlert(err.message, 'error');
  }
}

async function deleteListingItem(listingId) {
  if (confirm("Are you sure you want to delete this listing?")) {
    try {
      await API.deleteListing(listingId);
      showAlert("Listing deleted successfully.", "success");
      loadDashboard();
    } catch (err) {
      showAlert(err.message, "error");
    }
  }
}

function setupListingModal() {
  const modal = document.getElementById('modal-create-listing');
  const openBtn = document.getElementById('btn-open-create-listing-modal');
  const closeBtn = document.getElementById('btn-close-create-listing-modal');
  const form = document.getElementById('form-create-listing');
  
  const aiSuggestBtn = document.getElementById('btn-ai-price');
  const aiSuggestBox = document.getElementById('ai-pricing-suggestion-box');
  const applyPriceBtn = document.getElementById('btn-apply-ai-price');

  let suggestedPriceVal = 0;

  openBtn.addEventListener('click', () => {
    modal.classList.remove('hidden');
    aiSuggestBox.classList.add('hidden');
    form.reset();
  });

  closeBtn.addEventListener('click', () => {
    modal.classList.add('hidden');
  });

  aiSuggestBtn.addEventListener('click', async () => {
    const title = document.getElementById('list-title').value.trim();
    const description = document.getElementById('list-description').value.trim();
    const category = document.getElementById('list-category').value;
    const location = document.getElementById('list-location').value.trim();

    if (!title || !category || !location) {
      showAlert('Please enter Title, Category, and Location first to run AI Pricing.', 'error');
      return;
    }

    aiSuggestBtn.disabled = true;
    aiSuggestBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Analyzing...';

    try {
      const data = await API.getSmartPriceSuggestion(title, description, category, location);
      
      suggestedPriceVal = data.recommended_price;
      document.getElementById('ai-rec-val').textContent = `₹${data.recommended_price.toFixed(2)}`;
      document.getElementById('ai-range-val').textContent = `₹${data.suggested_price_range.min.toFixed(2)} - ₹${data.suggested_price_range.max.toFixed(2)}`;
      document.getElementById('ai-price-reasoning').textContent = data.reasoning;
      
      aiSuggestBox.classList.remove('hidden');
    } catch (err) {
      showAlert('AI Pricing error: ' + err.message, 'error');
    } finally {
      aiSuggestBtn.disabled = false;
      aiSuggestBtn.innerHTML = '<i class="fa-solid fa-wand-magic-sparkles text-spark"></i> Smart Pricing (AI)';
    }
  });

  applyPriceBtn.addEventListener('click', () => {
    document.getElementById('list-price').value = suggestedPriceVal;
    aiSuggestBox.classList.add('hidden');
    showAlert('Recommended price applied!', 'success');
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(form);

    try {
      await API.createListing(formData);
      showAlert('New listing published successfully!', 'success');
      modal.classList.add('hidden');
      loadDashboard();
    } catch (err) {
      showAlert(err.message, 'error');
    }
  });
}

async function loadProfile() {
  try {
    const profile = await API.getProfile();
    
    document.getElementById('profile-name').textContent = profile.full_name;
    document.getElementById('profile-email').textContent = profile.email;
    document.getElementById('profile-role').textContent = profile.role;
    
    const statusBox = document.getElementById('profile-verification-status');
    if (profile.id_verified) {
      statusBox.innerHTML = '<span class="badge badge-approved" style="background-color:#dcfce7; color:#15803d;"><i class="fa-solid fa-circle-check"></i> Verified Profile</span>';
      document.getElementById('form-id-upload').classList.add('hidden');
    } else {
      statusBox.innerHTML = '<span class="badge badge-warning"><i class="fa-solid fa-clock"></i> Identity Unverified</span>';
      document.getElementById('form-id-upload').classList.remove('hidden');
    }

    const reviewsList = document.getElementById('profile-reviews-list');
    const reviews = await API.getUserReviews(profile.id);
    
    if (reviews.length === 0) {
      reviewsList.innerHTML = '<div class="text-center py-6 text-secondary">No reviews posted yet.</div>';
    } else {
      reviewsList.innerHTML = reviews.map(r => {
        let stars = '';
        for (let i = 1; i <= 5; i++) {
          stars += i <= r.rating ? '<i class="fa-solid fa-star"></i>' : '<i class="fa-regular fa-star"></i>';
        }

        let sentimentClass = 'sentiment-neutral';
        let sentimentText = 'Neutral';
        if (r.sentiment_score > 0.2) {
          sentimentClass = 'sentiment-positive';
          sentimentText = 'Positive';
        } else if (r.sentiment_score < -0.2) {
          sentimentClass = 'sentiment-negative';
          sentimentText = 'Critical';
        }

        return `
          <div class="review-item">
            <div class="review-header">
              <span class="font-semibold">${r.reviewer_name}</span>
              <span class="review-sentiment-badge ${sentimentClass}">${sentimentText}</span>
            </div>
            <div class="review-stars mb-4">${stars}</div>
            <p class="text-secondary leading-relaxed">${r.comment}</p>
          </div>
        `;
      }).join('');
    }

  } catch (err) {
    showAlert(err.message, 'error');
  }
}

function setupIdVerification() {
  const form = document.getElementById('form-id-upload');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(form);

    try {
      const data = await API.uploadId(formData);
      currentUser = { ...currentUser, id_verified: data.user.id_verified };
      showAlert('ID verification complete!', 'success');
      loadProfile();
    } catch (err) {
      showAlert(err.message, 'error');
    }
  });
}

function openReviewModal(bookingId) {
  document.getElementById('review-booking-id').value = bookingId;
  
  currentStarRating = 0;
  document.querySelectorAll('.star-btn').forEach(btn => {
    btn.className = 'fa-regular fa-star star-btn';
  });
  document.getElementById('review-rating-val').value = '';
  document.getElementById('review-comment').value = '';

  document.getElementById('modal-leave-review').classList.remove('hidden');
}

function setupReviewModal() {
  const modal = document.getElementById('modal-leave-review');
  const stars = document.querySelectorAll('.star-btn');
  const ratingInput = document.getElementById('review-rating-val');
  
  stars.forEach(btn => {
    btn.addEventListener('click', () => {
      const value = parseInt(btn.getAttribute('data-value'));
      currentStarRating = value;
      ratingInput.value = value;
      
      stars.forEach((s, idx) => {
        if (idx < value) {
          s.className = 'fa-solid fa-star star-btn active';
        } else {
          s.className = 'fa-regular fa-star star-btn';
        }
      });
    });
  });

  document.getElementById('form-leave-review').addEventListener('submit', async (e) => {
    e.preventDefault();
    const bookingId = document.getElementById('review-booking-id').value;
    const rating = ratingInput.value;
    const comment = document.getElementById('review-comment').value.trim();

    try {
      await API.submitReview(bookingId, rating, comment);
      showAlert('Review submitted successfully!', 'success');
      modal.classList.add('hidden');
      loadDashboard();
    } catch (err) {
      showAlert(err.message, 'error');
    }
  });
}

function openDamageModal(bookingId, photoType) {
  document.getElementById('damage-booking-id').value = bookingId;
  document.getElementById('damage-photo-type').value = photoType;
  
  const title = document.getElementById('damage-modal-title');
  const desc = document.getElementById('damage-modal-instructions');
  
  document.getElementById('damage-ai-result').classList.add('hidden');
  document.getElementById('form-damage-upload').reset();

  if (photoType === 'pre_rental') {
    title.textContent = 'Check-in Inspection';
    desc.textContent = 'Please upload photo(s) of the item condition before checking out or starting use. These serve as baseline conditions.';
  } else {
    title.textContent = 'Check-out Return Inspection';
    desc.textContent = 'Upload photos of the returned item. Gemini AI will cross-verify with check-in baseline records to ensure zero damage.';
  }

  document.getElementById('modal-damage-inspection').classList.remove('hidden');
}

function setupDamageModal() {
  const modal = document.getElementById('modal-damage-inspection');
  const form = document.getElementById('form-damage-upload');
  const loadingDiv = document.getElementById('damage-ai-loading');
  const resultDiv = document.getElementById('damage-ai-result');
  const submitBtn = document.getElementById('btn-submit-damage');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const photoType = document.getElementById('damage-photo-type').value;
    const formData = new FormData(form);

    submitBtn.disabled = true;
    
    if (photoType === 'post_rental') {
      loadingDiv.classList.remove('hidden');
    }

    try {
      const data = await API.uploadDamageInspection(formData);
      
      if (photoType === 'post_rental' && data.analysis) {
        const analysis = data.analysis;
        loadingDiv.classList.add('hidden');
        
        document.getElementById('damage-ai-details').textContent = analysis.damage_details;
        document.getElementById('damage-ai-severity').textContent = `Severity: ${analysis.severity.toUpperCase()}`;
        document.getElementById('damage-ai-severity').className = `badge badge-${analysis.severity === 'none' ? 'approved' : 'warning'}`;
        document.getElementById('damage-ai-deduction').textContent = `Deduction: ₹${analysis.suggested_deduction.toFixed(2)}`;
        
        resultDiv.classList.remove('hidden');
        submitBtn.textContent = 'Acknowledge & Close';
        submitBtn.disabled = false;
        
        const closeHandler = (ev) => {
          ev.preventDefault();
          modal.classList.add('hidden');
          loadDashboard();
          form.removeEventListener('submit', closeHandler);
          form.addEventListener('submit', arguments.callee); 
          submitBtn.textContent = 'Upload Photos';
        };
        form.removeEventListener('submit', arguments.callee);
        form.addEventListener('submit', closeHandler);
        
        await API.updateBookingStatus(data.report.booking_id, 'completed');
        showAlert('Checkout inspection done. Booking marked as completed!', 'success');
      } else {
        
        await API.updateBookingStatus(data.report.booking_id, 'active');
        showAlert('Check-in complete! Booking marked as active.', 'success');
        modal.classList.add('hidden');
        loadDashboard();
        submitBtn.disabled = false;
      }
    } catch (err) {
      loadingDiv.classList.add('hidden');
      submitBtn.disabled = false;
      showAlert(err.message, 'error');
    }
  });
}

async function loadChatRoom(bookingId) {
  activeChatBookingId = bookingId;
  const messageLog = document.getElementById('chat-message-log');
  messageLog.innerHTML = '<div class="text-center py-12 text-secondary"><i class="fa-solid fa-spinner fa-spin"></i> Loading chat log...</div>';

  try {
    const booking = await API.getBookings();
    const currentBk = [...booking.rentals, ...booking.listings_rented].find(b => b.id === bookingId);
    
    if (currentBk) {
      document.getElementById('chat-header-title').textContent = currentBk.listing_title;
      document.getElementById('chat-header-sub').textContent = `Rental Dates: ${new Date(currentBk.start_date).toLocaleDateString()} - ${new Date(currentBk.end_date).toLocaleDateString()}`;
    }

    const messages = await API.getChatHistory(bookingId);
    messageLog.innerHTML = '';
    
    messages.forEach(msg => appendMessageBubble(msg));
    scrollChatBottom();

    initializeSocket(bookingId);

  } catch (err) {
    showAlert(err.message, 'error');
    showScreen('dashboard');
  }
}

function initializeSocket(bookingId) {
  
  if (!socket) {
    socket = io();
    
    socket.on('receive_message', (msg) => {
      
      if (activeChatBookingId === msg.booking_id) {
        appendMessageBubble(msg);
        scrollChatBottom();
      } else {
        showAlert(`New message regarding ${msg.sender_name}! Check dashboard chat.`, 'success');
      }
    });
  }

  socket.emit('join_room', {
    booking_id: bookingId,
    user_name: currentUser.full_name
  });
}

function appendMessageBubble(msg) {
  const messageLog = document.getElementById('chat-message-log');
  const bubble = document.createElement('div');
  
  const isMine = msg.sender_id === currentUser.id;
  bubble.className = `msg-bubble ${isMine ? 'msg-outgoing' : 'msg-incoming'}`;
  
  const time = new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  
  bubble.innerHTML = `
    <div class="msg-meta">${isMine ? 'You' : msg.sender_name}</div>
    <div>${escapeHtml(msg.content)}</div>
    <span class="msg-time">${time}</span>
  `;
  messageLog.appendChild(bubble);
}

function scrollChatBottom() {
  const messageLog = document.getElementById('chat-message-log');
  messageLog.scrollTop = messageLog.scrollHeight;
}

document.getElementById('form-chat-send').addEventListener('submit', (e) => {
  e.preventDefault();
  const input = document.getElementById('chat-input-text');
  const content = input.value.trim();
  
  if (content && activeChatBookingId && socket && currentUser) {
    socket.emit('send_message', {
      booking_id: activeChatBookingId,
      sender_id: currentUser.id,
      sender_name: currentUser.full_name,
      content: content
    });
    input.value = '';
  }
});

function escapeHtml(unsafe) {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

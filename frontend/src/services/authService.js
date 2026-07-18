import api from '../utils/api';

const authService = {
  login: (email, password) =>
    api.post('/auth/login', { email, password }),

  verify: () =>
    api.get('/auth/verify'),

  logout: () =>
    api.post('/auth/logout'),

  checkEmail: (email) =>
    api.post('/auth/check-email', { email }),

  resetPassword: (email, password) =>
    api.post('/auth/reset-password-direct', { email, password }),
};

export default authService;
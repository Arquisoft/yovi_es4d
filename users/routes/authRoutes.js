const express = require('express');
const router = express.Router();
const {logoutUser, registerUser, loginUser, getUserProfile } = require('../controllers/authController');

router.post('/register', registerUser);
router.post('/login', loginUser);
router.post('/getUserProfile', getUserProfile);
router.post('/logout', logoutUser);

module.exports = router;

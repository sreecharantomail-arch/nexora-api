"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.logoutUser = exports.refreshToken = exports.loginUser = exports.registerUser = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const bcrypt_1 = __importDefault(require("bcrypt"));
const User_1 = require("../models/User");
const generateTokens = (id) => {
    const accessToken = jsonwebtoken_1.default.sign({ id }, process.env.JWT_SECRET, { expiresIn: '15m' });
    const refreshToken = jsonwebtoken_1.default.sign({ id }, process.env.JWT_REFRESH_SECRET, { expiresIn: '7d' });
    return { accessToken, refreshToken };
};
const registerUser = async (req, res) => {
    try {
        const { username, displayName, email, password } = req.body;
        const userExists = await User_1.User.findOne({ $or: [{ email }, { username }] });
        if (userExists) {
            res.status(400).json({ success: false, error: { code: 'USER_EXISTS', message: 'User already exists' } });
            return;
        }
        const salt = await bcrypt_1.default.genSalt(10);
        const passwordHash = await bcrypt_1.default.hash(password, salt);
        const user = await User_1.User.create({
            username,
            displayName,
            email,
            passwordHash,
        });
        if (user) {
            const { accessToken, refreshToken } = generateTokens(user._id);
            res.status(201).json({
                success: true,
                data: {
                    _id: user._id,
                    username: user.username,
                    displayName: user.displayName,
                    email: user.email,
                    accessToken,
                    refreshToken,
                },
            });
        }
        else {
            res.status(400).json({ success: false, error: { code: 'INVALID_USER_DATA', message: 'Invalid user data' } });
        }
    }
    catch (error) {
        res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: error.message } });
    }
};
exports.registerUser = registerUser;
const loginUser = async (req, res) => {
    try {
        const { emailOrUsername, password } = req.body;
        const user = await User_1.User.findOne({
            $or: [{ email: emailOrUsername }, { username: emailOrUsername }],
        });
        if (user && (await user.matchPassword(password))) {
            const { accessToken, refreshToken } = generateTokens(user._id);
            res.json({
                success: true,
                data: {
                    _id: user._id,
                    username: user.username,
                    displayName: user.displayName,
                    email: user.email,
                    profileImage: user.profileImage,
                    accessToken,
                    refreshToken,
                },
            });
        }
        else {
            res.status(401).json({ success: false, error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' } });
        }
    }
    catch (error) {
        res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: error.message } });
    }
};
exports.loginUser = loginUser;
const refreshToken = async (req, res) => {
    const { token } = req.body;
    if (!token) {
        res.status(401).json({ success: false, error: { code: 'NO_TOKEN', message: 'Not authorized, no refresh token' } });
        return;
    }
    try {
        const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_REFRESH_SECRET);
        const { accessToken, refreshToken: newRefreshToken } = generateTokens(decoded.id);
        res.json({ success: true, data: { accessToken, refreshToken: newRefreshToken } });
    }
    catch (error) {
        res.status(401).json({ success: false, error: { code: 'INVALID_TOKEN', message: 'Not authorized, invalid refresh token' } });
    }
};
exports.refreshToken = refreshToken;
const logoutUser = async (req, res) => {
    // In a real app, you might want to blacklist the token or remove it from the database if you store them.
    res.json({ success: true, data: { message: 'Logged out successfully' } });
};
exports.logoutUser = logoutUser;
//# sourceMappingURL=authController.js.map
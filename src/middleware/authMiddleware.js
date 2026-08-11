"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.protect = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const User_1 = require("../models/User");
const protect = async (req, res, next) => {
    let token;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            token = req.headers.authorization.split(' ')[1];
            const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET);
            const user = await User_1.User.findById(decoded.id).select('-passwordHash');
            if (!user) {
                res.status(401).json({ success: false, error: { code: 'USER_NOT_FOUND', message: 'Not authorized, user not found' } });
                return;
            }
            if (user.status !== 'active') {
                res.status(403).json({ success: false, error: { code: 'ACCOUNT_INACTIVE', message: 'Account is suspended or deleted' } });
                return;
            }
            req.user = user;
            next();
        }
        catch (error) {
            res.status(401).json({ success: false, error: { code: 'INVALID_TOKEN', message: 'Not authorized, token failed' } });
        }
    }
    else {
        res.status(401).json({ success: false, error: { code: 'NO_TOKEN', message: 'Not authorized, no token' } });
    }
};
exports.protect = protect;
//# sourceMappingURL=authMiddleware.js.map
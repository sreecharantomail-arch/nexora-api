"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const authMiddleware_1 = require("../middleware/authMiddleware");
const userController_1 = require("../controllers/userController");
const router = express_1.default.Router();
router.get('/search', authMiddleware_1.protect, userController_1.searchUsers);
router.post('/report', authMiddleware_1.protect, userController_1.reportContent);
router.get('/:username', authMiddleware_1.protect, userController_1.getUserProfile);
router.post('/:id/follow', authMiddleware_1.protect, userController_1.followUser);
router.delete('/:id/follow', authMiddleware_1.protect, userController_1.unfollowUser);
router.post('/:id/block', authMiddleware_1.protect, userController_1.blockUser);
router.delete('/:id/block', authMiddleware_1.protect, userController_1.unblockUser);
router.get('/:username/videos', authMiddleware_1.protect, userController_1.getUserVideos);
exports.default = router;
//# sourceMappingURL=userRoutes.js.map
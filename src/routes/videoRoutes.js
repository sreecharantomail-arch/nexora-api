"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const authMiddleware_1 = require("../middleware/authMiddleware");
const videoController_1 = require("../controllers/videoController");
const uploadMiddleware_1 = require("../middleware/uploadMiddleware");
const router = express_1.default.Router();
router.get('/feed', authMiddleware_1.protect, videoController_1.getFeed);
router.get('/feed/following', authMiddleware_1.protect, videoController_1.getFollowingFeed);
// router.get('/:id', protect, getVideo);
router.post('/', authMiddleware_1.protect, uploadMiddleware_1.upload.single('video'), videoController_1.uploadVideo);
// router.delete('/:id', protect, deleteVideo);
router.post('/:id/like', authMiddleware_1.protect, videoController_1.likeVideo);
router.delete('/:id/like', authMiddleware_1.protect, videoController_1.unlikeVideo);
router.get('/:id/comments', authMiddleware_1.protect, videoController_1.getComments);
router.post('/:id/comments', authMiddleware_1.protect, videoController_1.addComment);
router.delete('/comments/:id', authMiddleware_1.protect, videoController_1.deleteComment);
router.post('/:id/save', authMiddleware_1.protect, videoController_1.saveVideo);
router.delete('/:id/save', authMiddleware_1.protect, videoController_1.unsaveVideo);
exports.default = router;
//# sourceMappingURL=videoRoutes.js.map
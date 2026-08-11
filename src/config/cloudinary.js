"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const cloudinary_1 = require("cloudinary");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
cloudinary_1.v2.config({
    cloud_name: process.env.STORAGE_BUCKET || 'demo',
    api_key: process.env.STORAGE_API_KEY || '1234567890',
    api_secret: process.env.STORAGE_API_SECRET || 'secret',
});
exports.default = cloudinary_1.v2;
//# sourceMappingURL=cloudinary.js.map
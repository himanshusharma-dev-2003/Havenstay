const express = require("express");
const ctrl = require("../controllers/chatController");
const { verifyToken } = require("../middleware/auth");

const router = express.Router();

router.use(verifyToken);

router.get("/conversations", ctrl.getConversations);
router.post("/conversations", ctrl.createConversation);
router.get("/conversations/:id/messages", ctrl.getMessages);

module.exports = router;

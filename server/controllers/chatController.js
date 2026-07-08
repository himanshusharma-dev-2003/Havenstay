const Conversation = require("../models/Conversation");
const Message = require("../models/Message");
const { AppError, catchAsync } = require("../utils/errors");

exports.getConversations = catchAsync(async (req, res) => {
  const filter = req.user.role === "admin" ? {} : { participants: req.user.id };
  
  const conversations = await Conversation.find(filter)
    .sort("-lastMessageAt")
    .populate("participants", "name email")
    .populate("hotelId", "name");

  res.json({ success: true, data: conversations });
});

exports.createConversation = catchAsync(async (req, res) => {
  const { type, hotelId } = req.body;
  
  // Find existing conversation for this user and type/hotel
  let conv = await Conversation.findOne({
    participants: req.user.id,
    type,
    ...(hotelId && { hotelId })
  });

  if (!conv) {
    conv = await Conversation.create({
      participants: [req.user.id],
      type,
      hotelId,
    });
  }

  await conv.populate("participants", "name email");
  if (conv.hotelId) await conv.populate("hotelId", "name");

  res.status(201).json({ success: true, data: conv });
});

exports.getMessages = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const conversation = await Conversation.findById(id);
  
  if (!conversation) return next(new AppError("Conversation not found", 404));

  if (req.user.role !== "admin" && !conversation.participants.includes(req.user.id)) {
    return next(new AppError("Unauthorized", 403));
  }

  const messages = await Message.find({ conversationId: id }).sort("createdAt");
  
  // Mark as read (simple approach)
  await Message.updateMany(
    { conversationId: id, sender: { $ne: req.user.id }, isRead: false },
    { isRead: true }
  );

  res.json({ success: true, data: messages });
});

const express = require("express");
const { handleUpload } = require("@vercel/blob/client");
const { requireAuth, requireAdmin } = require("../middlewares/auth.middleware");

const router = express.Router();

router.post("/upload", requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const response = await handleUpload({
      body: req.body,
      request: req,
      onBeforeGenerateToken: async (_pathname, clientPayload) => ({
        allowedContentTypes: ["audio/mpeg", "audio/mp3", "application/octet-stream"],
        maximumSizeInBytes: 100 * 1024 * 1024,
        addRandomSuffix: true,
        tokenPayload: JSON.stringify({
          userId: req.userId,
          trackId: JSON.parse(clientPayload || "{}").trackId,
        }),
      }),
      onUploadCompleted: async ({ blob }) => {
        console.log("Blob upload completed:", blob.pathname);
      },
    });

    res.json(response);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
import { Router } from "express";
import {
  confirmChannelPosting,
  convertPostingToToApply,
  createChannelPosting,
  deleteChannelPosting,
  listChannelPostings
} from "../controllers/channelPosting.controller.js";
import { requireAuth } from "../middleware/auth.middleware.js";
import { validate } from "../middleware/validate.middleware.js";
import {
  channelPostingIdSchema,
  confirmChannelPostingSchema,
  createChannelPostingSchema,
  listChannelPostingsSchema
} from "../validators/channelPosting.schema.js";

const router = Router();

router.use(requireAuth);

router
  .route("/")
  .post(validate(createChannelPostingSchema), createChannelPosting)
  .get(validate(listChannelPostingsSchema), listChannelPostings);

router.post("/confirm", validate(confirmChannelPostingSchema), confirmChannelPosting);
router.post("/:id/convert-to-to-apply", validate(channelPostingIdSchema), convertPostingToToApply);
router.delete("/:id", validate(channelPostingIdSchema), deleteChannelPosting);

export default router;

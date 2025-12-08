import { Router } from "express";
import auth from "../../middleware/auth";
import { USER_ROLE } from "../user/user.constant";
import { createMessage, getMessages } from "./message.controller";

const router = Router();

router.post("/", auth(USER_ROLE.USER, USER_ROLE.ADMIN), createMessage);
router.get("/:conversationId", getMessages);

const messageRoutes = router;
export default messageRoutes;

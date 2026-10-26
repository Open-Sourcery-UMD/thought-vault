import { Router } from "express";
import { authenticate } from "../middleware/authenticate.js";
import { deleteUserHandler } from "./users.controller.js";

export const usersRouter = Router();

usersRouter.delete("/:id", authenticate, deleteUserHandler);

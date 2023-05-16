"use strict";

const { ensureLoggedIn } = require("../middleware/auth");
const { UnauthorizedError, BadRequestError } = require("../expressError");
const Message = require("../models/message");
const Router = require("express").Router;
const router = new Router();

router.use(ensureLoggedIn);

/** GET /:id - get detail of message.
 *
 * => {message: {id,
 *               body,
 *               sent_at,
 *               read_at,
 *               from_user: {username, first_name, last_name, phone},
 *               to_user: {username, first_name, last_name, phone}}
 *
 * Makes sure that the currently-logged-in users is either the to or from user.
 *
 **/

router.get("/:id", async function (req, res, next) {
  const message = await Message.get(req.params.id);
  // debugger;
  if (res.locals.user.username !== message.from_user.username &&
    res.locals.user.username !== message.to_user.username) {
      throw new UnauthorizedError();
    }

  return res.json({ message });
})


/** POST / - post message.
 *
 * {to_username, body} =>
 *   {message: {id, from_username, to_username, body, sent_at}}
 *
 **/

router.post("/", async function (req, res, next) {
  if (!req.body?.to_username || !req.body?.body) throw new BadRequestError("Invalid body");

  const {to_username, body} = req.body
  const from_username = res.locals.user.username;

  const message = await Message.create({ from_username, to_username, body });

  return res.json({ message });
})


/** POST/:id/read - mark message as read:
 *
 *  => {message: {id, read_at}}
 *
 * Makes sure that the only the intended recipient can mark as read.
 *
 **/

router.post("/:id/read", async function (req, res, next) {
  const id = req.params.id;
  const result = await Message.get(id);

  if (res.locals.user.username !== result.to_user.username) {
      throw new UnauthorizedError();
    }

  const message = await Message.markRead(id);

  return res.json({ message })
})


module.exports = router;
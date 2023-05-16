"use strict";

const Router = require("express").Router;
const jwt = require("jsonwebtoken");
const { SECRET_KEY } = require("../config");
const User = require("../models/user");
const { BadRequestError, UnauthorizedError} = require("../expressError")
const router = new Router();

/** POST /login: {username, password} => {token} */
router.post("/login", async function (req, res, next) {
  if (!req.body) throw new BadRequestError("JSON like: {username, password} required.");

  const { username, password } = req.body;

  if (User.authenticate(username, password)) {
    const token = jwt.sign({ username }, SECRET_KEY);
    return res.json({ token });
  }

  throw new UnauthorizedError("Invalid user/password");
})


/** POST /register: registers, logs in, and returns token.
 *
 * {username, password, first_name, last_name, phone} => {token}.
 */

router.post("/register", async function (req, res, next) {
  const body = req.body
  if (!body?.username ||
    !body?.password ||
    !body?.first_name ||
    !body?.last_name ||
    !body?.phone) {
      throw new BadRequestError("JSON like: {username, password, first_name, last_name, phone} required.");
    }

  User.register(body);

  const {username, first_name, last_name} = body
  const payload = {username, first_name, last_name}
  const token = jwt.sign(payload, SECRET_KEY);

  return res.json({ token });
})

module.exports = router;
"use strict";

/** User class for message.ly */

const db = require("../db");
const bcrypt = require("bcrypt");
const { BCRYPT_WORK_FACTOR } = require("../config");
const { UnauthorizedError, NotFoundError, BadRequestError } = require("../expressError");


/** User of the site. */

class User {

  /** Register new user. Returns
   *    {username, password, first_name, last_name, phone}
   */

  //TODO: throw new error not going to error handler
  static async register({ username, password, first_name, last_name, phone }) {
    const checkUser = await db.query(
      `SELECT username
      FROM users
      WHERE username = $1`,
      [username]
    )
    if (checkUser.rows.length > 0) throw new BadRequestError("user already exists");

    const hashedPassword = await bcrypt.hash(password, BCRYPT_WORK_FACTOR);

    const result = await db.query(
      `INSERT INTO users (username,
                          password,
                          first_name,
                          last_name,
                          phone,
                          join_at,
                          last_login_at)
        VALUES
           ($1, $2, $3, $4, $5, current_timestamp, current_timestamp)
        RETURNING username, password, first_name, last_name, phone`,
    [username, hashedPassword, first_name, last_name, phone]);

    return result.rows[0];
  }


  /** Authenticate: is username/password valid? Returns boolean. */
  static async authenticate(username, password) {
    const result = await db.query(
      `SELECT username, password
       FROM users
       WHERE username = $1`,
       [username]);

    const user = result.rows[0];

    if (!user) throw new UnauthorizedError("Invalid user/password");

    return await bcrypt.compare(password, user.password);
  }


  /** Update last_login_at for user */

  static async updateLoginTimestamp(username) {
    const result = await db.query(
      `UPDATE users
       SET last_login_at = current_timestamp
       WHERE username = $1
       RETURNING username`,
       [username]);

    const user = result.rows[0];

    if (!user) throw new NotFoundError(`No such user: ${username}`);
  }


  /** All: basic info on all users:
   * [{username, first_name, last_name}, ...] */

  static async all() {
    const results = await db.query(
      `SELECT username, first_name, last_name
       FROM users
       ORDER BY username`);
    return results.rows;
  }


  /** Get: get user by username
   *
   * returns {username,
   *          first_name,
   *          last_name,
   *          phone,
   *          join_at,
   *          last_login_at } */

  static async get(username) {
    const result = await db.query(
      `SELECT username, first_name, last_name, phone, join_at, last_login_at
       FROM users
       WHERE username = $1`,
       [username]);

    const user = result.rows[0];

    if (!user) throw new NotFoundError(`No such user: ${username}`);

    return user;
  }


  /** Return messages from this user.
   *
   * [{id, to_user, body, sent_at, read_at}]
   *
   * where to_user is
   *   {username, first_name, last_name, phone}
   */

  static async messagesFrom(username) {
    const results = await db.query(
      `SELECT m.id AS id,
              m.body AS body,
              m.sent_at AS sent_at,
              m.read_at AS read_at,
              m.from_username,
              t.username AS to_username,
              t.first_name AS to_first_name,
              t.last_name AS to_last_name,
              t.phone AS to_phone
      FROM messages AS m
      JOIN users AS t ON m.to_username = t.username
      WHERE m.from_username = $1`,
      [username]);

    const messages = results.rows.map(message => {
      return {
        id: message.id,
        to_user: {
          username: message.to_username,
          first_name: message.to_first_name,
          last_name: message.to_last_name,
          phone: message.to_phone
        },
        body: message.body,
        sent_at: message.sent_at,
        read_at: message.read_at
      }
    });

    return messages
  }

  /** Return messages to this user.
   *
   * [{id, from_user, body, sent_at, read_at}]
   *
   * where from_user is
   *   {username, first_name, last_name, phone}
   */

  static async messagesTo(username) {
    const results = await db.query(
      `SELECT m.id AS id,
              m.body As body,
              m.sent_at AS sent_at,
              m.read_at AS read_at,
              f.username AS from_username,
              f.first_name AS from_first_name,
              f.last_name AS from_last_name,
              f.phone AS from_phone
      FROM messages AS m
      JOIN users AS t ON m.to_username = t.username
      JOIN users AS f ON m.from_username = f.username
      WHERE t.username = $1`,
      [username]);

    const messages = results.rows.map(message => {
      return {
        id: message.id,
        from_user: {
          username: message.from_username,
          first_name: message.from_first_name,
          last_name: message.from_last_name,
          phone: message.from_phone
        },
        body: message.body,
        sent_at: message.sent_at,
        read_at: message.read_at
      }
    });

    return messages
  }
}


module.exports = User;

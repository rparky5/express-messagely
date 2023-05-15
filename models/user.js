"use strict";

/** User class for message.ly */

const { NotFoundError } = require("../expressError");
const db = require("../db");

/** User of the site. */

class User {

  /** Register new user. Returns
   *    {username, password, first_name, last_name, phone}
   */

  static async register({ username, password, first_name, last_name, phone }) {
    //TODO: hash password and store it
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
    [username, password, first_name, last_name, phone]);

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

    if (!user) throw new NotFoundError(`No such user: ${username}`);

    return user.password === password;
  }


  /** Update last_login_at for user */

  static async updateLoginTimestamp(username) {
    await db.query(
      `UPDATE users
       SET last_login_at = current_timestamp
       WHERE username = $1`,
       [username]);
  }


  /** All: basic info on all users:
   * [{username, first_name, last_name}, ...] */

  static async all() {
    const results = await db.query(
      `SELECT username, first_name, last_name
       FROM users`);

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
              t.username AS to_username,
              t.first_name AS to_first_name,
              t.last_name AS to_last_name,
              t.phone AS to_phone
      FROM messages AS m
      JOIN users AS f ON m.from_username = f.username
      JOIN users AS t ON m.to_username = t.username
      WHERE f.username = $1`,
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
      `SELECT m.id,
              m.body,
              m.sent_at,
              m.read_at,
              f.username,
              f.first_name,
              f.last_name,
              f.phone
      FROM messages AS m
      JOIN users AS t ON m.to_username = t.username
      JOIN users AS f ON m.from_username = f.username
      WHERE t.username = $1`,
      [username]);

    const messages = results.rows.map(message => {
      return {
        id: message["m.id"],
        from_user: {
          username: message["f.username"],
          first_name: message["f.first_name"],
          last_name: message["f.last_name"],
          phone: message["f.phone"]
        },
        body: message["m.body"],
        sent_at: message["m.sent_at"],
        read_at: message["m.read_at"]
      }
    });

    return messages
  }
}


module.exports = User;

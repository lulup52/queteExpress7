// dotenv loads parameters (port and database config) from .env
require('dotenv').config();
const { check, validationResult } = require('express-validator');
const express = require('express');
const bodyParser = require('body-parser');
const connection = require('./db');

const app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

// respond to requests on `/api/users`
app.get('/api/users', (req, res) => {
  // send an SQL query to get all users
  connection.query('SELECT * FROM user', (err, results) => {
    if (err) {
      // If an error has occurred, then the client is informed of the error
      res.status(500).json({
        error: err.message,
        sql: err.sql,
      });
    } else {
      // If everything went well, we send the result of the SQL query as JSON
      res.json(results);
    }
  });
});

app.post(
  '/api/users',
  [check('email').isEmail(),
    check('password').isLength({ min: 8 })],
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).json({ errors: errors.array() });
    }
    connection.query('INSERT INTO user SET ?', req.body, (err, results) => {
      if (err) {
        // MySQL reports a duplicate entry -> 409 Conflict
        if (err.code === 'ER_DUP_ENTRY') {
          return res.status(409).json({error: 'Email already exists'})
        }
        return res.status(500).json({
          error: err.message,
          sql: err.sql,
        });
      }
      connection.query(`SELECT * FROM user where id = ${results.insertId}`, (err, insertedResults) => {
        if (err) {
          return res.status(500).json({
            error: err.message,
            sql: err.sql,
          });
        }
        res.status(200).json(insertedResults[0]);
      });
    });
  },
);


app.put('/api/users/:id',
  [check('email').isEmail(),
    check('password').isLength({ min: 8 })],
  (req, res) => {
    const userId = req.params.id;
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).json({ errors: errors.array() });
    }
/*    connection.query(`SELECT * FROM user where id = ${userId}`,(err, results) => {
      if (results[0] === undefined) {
        res.send("u can't modify an inexistant user");
      } else {
        connection.query(`UPDATE user SET ? where id = ${userId}`, req.body, (err, results) => {
          if (err) {
            return res.status(500).json({
              error: err.message,
              sql: err.sql,
            });
          }
          res.status(200).json({...req.body, id : userId});
        });
      }
    });*/
    connection.query(`UPDATE user SET ? where id = ${userId}`, req.body, (err, results) => {
      if (err) {
        return res.status(500).json({
          error: err.message,
          sql: err.sql,
        });
      }
      if (results.affectedRows === 0) {
        return res.send("u can't modify an inexistant user");
      }
      connection.query(`SELECT * FROM user where id = ${userId}`,(err, results) => {
        if (err) {
          return res.status(500).json({
            error: err.message,
            sql: err.sql,
          });
        }
        res.status(200).json(results[0]);
      });
    });
  });

app.listen(process.env.PORT, (err) => {
  if (err) {
    throw new Error('Something bad happened...');
  }
  console.log(`Server is listening on ${process.env.PORT}`);
});

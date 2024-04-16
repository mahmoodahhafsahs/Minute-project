const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const db = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: '1234',
  database: 'please1',
  port: 3308
});

// Route to handle user signup
app.post('/signup', (req, res) => {
  const sql = 'INSERT INTO signup (name, email, password) VALUES (?, ?, ?)';
  const values = [req.body.name, req.body.email, req.body.password];
  
  db.query(sql, values, (err, result) => {
    if (err) {
      console.error("Error occurred while inserting data:", err);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
    
    console.log("Data inserted successfully:", result);
    return res.status(200).json({ message: 'Data inserted successfully' });
  });
});

// Route to handle user login
app.post('/login', (req, res) => {
  const sql = 'SELECT * FROM signup WHERE email=? AND password=?';
  
  db.query(sql, [req.body.email, req.body.password], (err, data) => {
    if (err) {
      console.error("Error occurred while querying data:", err);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
    
    if (data.length > 0) {
      return res.status(200).json({ message: "Success" });
    } else {
      return res.status(401).json({ message: "Failed" });
    }
  });
});

// Route to handle admin login
app.post('/admin-login', (req, res) => {
  const { email, password } = req.body;
  
  if (email === 'admin@gmail.com' && password === 'admin') {
    return res.status(200).json({ message: 'Success', isAdmin: true });
  } else {
    return res.status(401).json({ message: 'Failed' });
  }
});

// Route to assign a task
app.post('/assign-task', (req, res) => {
  const { taskName, deadline, assignedTo } = req.body;

  // Check if the assignedTo value is "all"
  if (assignedTo === 'all') {
    // Iterate through all emails and assign the task to each one
    emails.forEach(email => {
      const sql = 'INSERT INTO tasks (task_name, deadline, assigned_to) VALUES (?, ?, ?)';
      const values = [taskName, deadline, email];
      
      db.query(sql, values, (err, result) => {
        if (err) {
          console.error("Error occurred while assigning task:", err);
          return res.status(500).json({ error: 'Internal Server Error' });
        }
        console.log(`Task assigned to ${email} successfully`);
      });
    });
    return res.status(200).json({ message: 'Task assigned to all emails successfully' });
  } else {
    // If assignedTo is not "all", assign the task as usual
    const sql = 'INSERT INTO tasks (task_name, deadline, assigned_to) VALUES (?, ?, ?)';
    const values = [taskName, deadline, assignedTo];

    db.query(sql, values, (err, result) => {
      if (err) {
        console.error("Error occurred while assigning task:", err);
        return res.status(500).json({ error: 'Internal Server Error' });
      }

      console.log("Task assigned successfully:", result);
      return res.status(200).json({ message: 'Task assigned successfully' });
    });
  }
});

// Route to fetch emails
app.get('/emails', (req, res) => {
  const sql = 'SELECT email FROM signup';

  db.query(sql, (err, data) => {
    if (err) {
      console.error("Error occurred while fetching emails:", err);
      return res.status(500).json({ error: 'Internal Server Error' });
    }

    const emails = data.map(item => item.email);
    return res.status(200).json(emails);
  });
});

// Route to fetch tasks including completed status
app.get('/tasks', (req, res) => {
  const { email } = req.query; // Extract email from query parameters
  let sql = 'SELECT tasks.*, CASE WHEN finishedtasks.task_id IS NOT NULL THEN true ELSE false END as completed FROM tasks LEFT JOIN finishedtasks ON tasks.id = finishedtasks.task_id WHERE tasks.is_deleted = false';
  let params = [];

  if (email) {
    sql += ' AND tasks.assigned_to = ?';
    params.push(email);
  }

  db.query(sql, params, (err, data) => {
    if (err) {
      console.error("Error occurred while fetching tasks:", err);
      return res.status(500).json({ error: 'Internal Server Error' });
    }

    return res.status(200).json(data);
  });
});

// Route to fetch completed tasks
app.get('/completed-tasks', (req, res) => {
  const { email } = req.query; // Extract email from query parameters
  let sql = 'SELECT * FROM finishedtasks';
  let params = [];

  if (email) {
    sql += ' WHERE email = ?';
    params.push(email);
  }

  db.query(sql, params, (err, data) => {
    if (err) {
      console.error("Error occurred while fetching completed tasks:", err);
      return res.status(500).json({ error: 'Internal Server Error' });
    }

    return res.status(200).json(data);
  });
});

// Route to handle completed tasks
app.post('/finishedtasks', (req, res) => {
  const { taskId, email } = req.body;
  
  // Check if taskId and email are provided
  if (!taskId || !email) {
    return res.status(400).json({ error: 'Task ID and email are required' });
  }
  
  // Insert the completed task into the finishedtasks table
  const sql = 'INSERT INTO finishedtasks (task_id, email) VALUES (?, ?)';
  const values = [taskId, email];
  
  db.query(sql, values, (err, result) => {
    if (err) {
      console.error("Error occurred while storing completed task:", err);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
    
    console.log("Completed task stored successfully:", result);
    return res.status(200).json({ message: 'Completed task stored successfully' });
  });
});

// Route to delete a task
app.delete('/tasks/:id', (req, res) => {
  const taskId = req.params.id;
  const findTaskQuery = 'SELECT * FROM tasks WHERE id = ?';
  const deleteTaskQuery = 'DELETE FROM tasks WHERE id = ?';

  // Check if the task exists
  db.query(findTaskQuery, taskId, (err, rows) => {
    if (err) {
      console.error("Error occurred while finding task:", err);
      return res.status(500).json({ error: 'Internal Server Error' });
    }

    if (rows.length === 0) {
      // No task found with the provided ID
      return res.status(404).json({ error: 'Task not found' });
    }

    const task = rows[0];

    // Check if the task is completed
    if (task.completed) {
      // Task is completed, remove it from the UI only
      console.log("Task is completed, removing from UI:", task);
      return res.status(200).json({ message: 'Task is completed, removed from UI' });
    } else {
      // Task is not completed, delete it from the database
      db.query(deleteTaskQuery, taskId, (err, result) => {
        if (err) {
          console.error("Error occurred while deleting task:", err);
          return res.status(500).json({ error: 'Internal Server Error' });
        }

        console.log("Task deleted from the database successfully:", result);
        return res.status(200).json({ message: 'Task deleted from the database successfully' });
      });
    }
  });
});

app.listen(5000, () => {
  console.log('Server is listening on port 5000');
});

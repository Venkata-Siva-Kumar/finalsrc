const express = require('express');
const cors = require('cors');
const mysql = require('mysql2');
const bcrypt = require('bcrypt');
const axios = require('axios'); // Add at the top if not present
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ limit: '1mb', extended: true }));

const db = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT,
  multipleStatements: true
});

db.connect(err => {
  if (err) {
    console.error('❌ Database connection failed:', err);
    process.exit(1);
  }
  console.log('✅ Connected to database');
});

app.post('/signup', (req, res) => {
  const { fname, lname, mobile, password, gender, email, dob } = req.body;
  if (!fname || !lname || !mobile || !password || !gender) {
    return res.status(400).json({ message: 'Missing required fields' });
  }
  if (!dob) {
    return res.status(400).json({ message: 'Date of birth is required.' });
  }
  
  db.query('SELECT * FROM users WHERE mobile = ?', [mobile], async (err, results) => {
    if (err) return res.status(500).json({ message: 'Database error' });
    if (results.length > 0) {
      const user = results[0];
      if (user.activity_status === 'inactive') {
        // Reactivate and update user
        const hashedPassword = await bcrypt.hash(password, 10);
        db.query(
          `UPDATE users SET fname=?, lname=?, password=?, gender=?, email=?, dob=?, activity_status='active' WHERE mobile=?`,
          [fname, lname, hashedPassword, gender, email || null, dob || null, mobile],
          err2 => {
            if (err2) return res.status(500).json({ message: 'Error reactivating user' });
            return res.json({ message: 'Account reactivated and updated successfully' });
          }
        );
      } else {
        return res.status(400).json({ message: 'User already exists' });
      }
    } else {
      // Normal signup
      const hashedPassword = await bcrypt.hash(password, 10);
      db.query(
        `INSERT INTO users (fname, lname, mobile, password, gender, email, dob, activity_status) VALUES (?, ?, ?, ?, ?, ?, ?, 'active')`,
        [fname, lname, mobile, hashedPassword, gender, email || null, dob || null],
        err => {
          if (err) return res.status(500).json({ message: 'Error inserting user' });
          res.json({ message: 'User registered successfully' });
        }
      );
    }
  });
});


// ✅ Login route
app.post('/login', (req, res) => {
  const { mobile, password } = req.body;
  db.query('SELECT * FROM users WHERE mobile = ?', [mobile], (err, results) => {
    if (err) return res.status(500).json({ message: 'Database error' });
    if (results.length === 0) return res.status(401).json({ message: 'Invalid mobile number' });

    const user = results[0];
    if (user.activity_status !== 'active') {
      return res.status(403).json({ message: 'Account is inactive. Please sign up again to reactivate.' });
    }
    const hashedPassword = user.password;
    bcrypt.compare(password, hashedPassword, (err, isMatch) => {
      if (err) return res.status(500).json({ message: 'Password comparison error' });
      if (!isMatch) return res.status(401).json({ message: 'Invalid password' });
      res.json({ message: 'Login successful' });
    });
  });
});

app.get('/products', (req, res) => {
  const { category_id, search } = req.query;
  let sql = `
    SELECT p.*, i.image_data, i.mime_type
    FROM products p
    LEFT JOIN images i ON p.id = i.product_id
    where 1
  `;
  const params = [];
  if (category_id) {
    sql += ' AND p.category_id = ?';
    params.push(category_id);
  }
  if (search) {
    sql += ' AND p.name LIKE ?';
    params.push(`%${search}%`);
  }
  db.query(sql, params, (err, results) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    const products = [];
    const productMap = {};
    results.forEach(row => {
      if (!productMap[row.id]) {
        productMap[row.id] = {
          id: row.id,
          name: row.name,
          description: row.description,
          category_id: row.category_id,
          status: row.status,
          image_url: row.image_data
            ? `data:${row.mime_type || 'image/jpeg'};base64,${row.image_data.toString('base64')}`
            : null,
          variants: [],
        };
        products.push(productMap[row.id]);
      }
    });
    db.query('SELECT * FROM product_variants', (err2, variantRows) => {
      if (err2) return res.status(500).json({ error: 'DB error' });
      variantRows.forEach(v => {
        if (productMap[v.product_id]) {
          productMap[v.product_id].variants.push(v);
        }
      });
      res.json(products);
    });
  });
});

app.post('/place-order', (req, res) => {
  let { orderId, totalAmount, orderDate, orderStatus, user_id, mobile, address_id, items, coupon_code, discount, final_amount, delivery_charge } = req.body;

  function getUserIdAndInsertOrder() {
    if (!user_id && mobile) {
      mobile = (mobile || '').replace(/^\+91/, '').replace(/\D/g, '').slice(-10);
      db.query('SELECT id FROM users WHERE mobile = ?', [mobile], (err, results) => {
        if (err || results.length === 0) {
          return res.status(400).json({ error: 'User not found for this mobile' });
        }
        user_id = results[0].id;
        insertOrder();
      });
    } else {
      insertOrder();
    }
  }

  function insertOrder() {
    if (!orderId || !totalAmount || !orderDate || !orderStatus || !user_id || !items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const orderSql = `INSERT INTO orders (orderId, totalAmount, orderDate, orderStatus, user_id, address_id, coupon_code, discount, final_amount, delivery_charge)
                      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
    db.query(
      orderSql,
      [orderId, totalAmount, orderDate, orderStatus, user_id, address_id || null, coupon_code || null, discount || 0, final_amount || totalAmount, delivery_charge || 0],
      (err, orderResult) => {
        if (err) {
          return res.status(500).json({ error: 'Failed to insert order', details: err.message });
        }

        // Insert order items
        const orderItemsSql = `INSERT INTO order_items (orderId, productId, variantId, quantity, price) VALUES ?`;
        const orderItemsValues = items.map(item => [
          orderId,
          item.productId,
          item.variantId,
          item.quantity,
          item.price
        ]);

        db.query(orderItemsSql, [orderItemsValues], (err, itemsResult) => {
          if (err) {
            return res.status(500).json({ error: 'Failed to insert order items', details: err.message });
          }
          res.json({ success: true, orderId });
        });
      }
    );
  }

  getUserIdAndInsertOrder();
});

// ...existing code...

app.get('/addresses', (req, res) => {
  const { user_id } = req.query;
  if (!user_id) {
    return res.status(400).json({ message: 'Missing user_id' });
  }
  db.query('SELECT * FROM addresses WHERE user_id = ?', [user_id], (err, rows) => {
    if (err) {
      return res.status(500).json({ message: 'Error fetching addresses' });
    }
    res.json(rows);
  });
});

// ✅ Remove Address
app.delete('/addresses/:id', (req, res) => {
  const { id } = req.params;
  // Only block if there are orders NOT delivered or canceled
  db.query(
    `SELECT * FROM orders WHERE address_id = ? AND orderStatus NOT IN ('Delivered', 'Cancelled')`,
    [id],
    (err, rows) => {
      if (err) {
        console.error('❌ Error checking orders:', err);
        return res.status(500).json({ message: 'Error checking orders: ' + err.message });
      }
      if (rows.length > 0) {
        return res.status(400).json({ message: 'There are pending orders for this address.' });
      }
      // No pending orders, safe to delete
      db.query('DELETE FROM addresses WHERE id = ?', [id], (err2, result) => {
        if (err2) {
          console.error('❌ Error deleting address:', err2);
          return res.status(500).json({ message: 'Error deleting address: ' + err2.message });
        }
        if (result.affectedRows === 0) {
          return res.status(404).json({ message: 'Address not found' });
        }
        res.json({ message: 'Address deleted successfully' });
      });
    }
  );
});

app.get('/addresses/:id/pending-orders', (req, res) => {
  const { id } = req.params;
  db.query(
    `SELECT * FROM orders WHERE address_id = ? AND orderStatus NOT IN ('Delivered', 'Cancelled')`,
    [id],
    (err, rows) => {
      if (err) {
        return res.status(500).json({ hasPending: false, error: 'Database error' });
      }
      res.json({ hasPending: rows.length > 0 });
    }
  );
});

// Example for Express backend
// Express backend example
app.post('/update-user', (req, res) => {
  const { mobile, fname, lname, email, gender, dob } = req.body;
  if (!mobile || !fname || !lname || !gender) {
    return res.json({ success: false, message: 'Missing required fields' });
  }
  
  db.query(
    'UPDATE users SET fname = ?, lname = ?, email = ?, gender = ?, dob = ? WHERE mobile = ?',
    [fname, lname, email || null, gender, dob || null, mobile],
    (err, result) => {
      if (err) return res.json({ success: false, message: err.message });
      if (result.affectedRows === 0) {
        return res.json({ success: false, message: 'User not found' });
      }
      res.json({ success: true });
    }
  );
});

// Express example
app.get('/user', (req, res) => {
  const { mobile } = req.query;
  if (!mobile) return res.status(400).json({ message: 'Missing mobile' });
  db.query('SELECT * FROM users WHERE mobile = ?', [mobile], (err, results) => {
    if (err || results.length === 0) return res.json({ user: null });
    res.json({ user: results[0] });
  });
});


// Admin login route
app.post('/admin-login', (req, res) => {
  const { mobile, password } = req.body;
  db.query('SELECT * FROM admins WHERE mobile = ?', [mobile], (err, results) => {
    if (err) return res.status(500).json({ message: 'Database error' });
    if (results.length === 0) return res.status(401).json({ message: 'Admin not found' });

    const hashedPassword = results[0].password;
    bcrypt.compare(password, hashedPassword, (err, isMatch) => {
      if (err) return res.status(500).json({ message: 'Password comparison error' });
      if (!isMatch) return res.status(401).json({ message: 'Invalid password' });
      res.json({ message: 'Admin login successful' });
    });
  });
});


app.get('/orders', (req, res) => {
  const { user_id, mobile } = req.query;
  let sql = `
    SELECT o.*, a.*, u.mobile as user_mobile
    FROM orders o
    LEFT JOIN addresses a ON o.address_id = a.id
    LEFT JOIN users u ON o.user_id = u.id
    WHERE 1
  `;
  const params = [];
  if (user_id) {
    sql += ' AND o.user_id = ?';
    params.push(user_id);
  } else if (mobile) {
    sql += ' AND u.mobile = ?';
    params.push(mobile);
  }
  sql += ' ORDER BY o.orderDate DESC';

  db.query(sql, params, (err, orders) => {
    if (err) return res.status(500).json({ error: 'DB error' });
    if (!orders.length) return res.json([]);

    const orderIds = orders.map(o => o.orderId);
    if (!orderIds.length) return res.json([]);

    db.query(
      `SELECT 
         oi.*, 
         p.name AS product_name, 
         v.quantity_value, 
         v.price AS variant_price,
         v.mrp AS variant_mrp,
         img.image_data, img.mime_type
       FROM order_items oi
       JOIN products p ON oi.productId = p.id
       JOIN product_variants v ON oi.variantId = v.id
       LEFT JOIN images img ON img.product_id = p.id
       WHERE oi.orderId IN (?)`,
      [orderIds],
      (err2, items) => {
        if (err2) return res.status(500).json({ error: 'DB error' });
        // Group items by orderId
        const itemsByOrder = {};
        items.forEach(item => {
          if (!itemsByOrder[item.orderId]) itemsByOrder[item.orderId] = [];
          itemsByOrder[item.orderId].push({
            name: item.product_name,
            quantity: item.quantity,
            price: item.variant_price,
            mrp: item.variant_mrp,
            quantity_value: item.quantity_value,
            product_id: item.productId,
            variant_id: item.variantId,
            image_url: item.image_data
              ? `data:${item.mime_type || 'image/jpeg'};base64,${item.image_data.toString('base64')}`
              : null,
          });
        });
        // Attach items to orders
        const result = orders.map(order => ({
          orderId: order.orderId,
          orderDate: order.orderDate,
          orderStatus: order.orderStatus,
          totalAmount: order.totalAmount,
          final_amount: order.final_amount,
          coupon_code: order.coupon_code,
          discount: order.discount,
          items: itemsByOrder[order.orderId] || [],
          delivery_charge: order.delivery_charge,
          deliveryAddress: {
            name: order.name,
            mobile: order.addr_mobile,
            address: order.address,
            locality: order.locality,
            city: order.city,
            state: order.state,
            pincode: order.pincode,
            landmark: order.landmark,
          },
          userMobile: order.user_mobile,
        }));
        res.json(result);
      }
    );
  });
});


// Add a new address
app.post('/addresses', (req, res) => {
  const { user_id, name, addr_mobile, pincode, locality, address, city, state, landmark } = req.body;
  if (!user_id || !name || !addr_mobile || !pincode || !address) {
    return res.status(400).json({ message: 'Missing required fields' });
  }
  const sql = `
    INSERT INTO addresses (user_id, name, addr_mobile, pincode, locality, address, city, state, landmark)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;
  db.query(
    sql,
    [user_id, name, addr_mobile, pincode, locality, address, city, state, landmark],
    (err, result) => {
      if (err) {
        console.error('❌ Error inserting address:', err);
        return res.status(500).json({ message: 'Error inserting address: ' + err.message });
      }
      // Return the newly created address (with its id)
      db.query('SELECT * FROM addresses WHERE id = ?', [result.insertId], (err2, rows) => {
        if (err2 || rows.length === 0) {
          return res.status(500).json({ message: 'Error fetching new address' });
        }
        res.json(rows[0]);
      });
    }
  );
});

// Update an existing address
app.put('/addresses/:id', (req, res) => {
  const { id } = req.params;
  const { user_id, name, addr_mobile, pincode, locality, address, city, state, landmark } = req.body;
  if (!user_id || !name || !addr_mobile || !pincode || !address) {
    return res.status(400).json({ message: 'Missing required fields' });
  }
  const sql = `
    UPDATE addresses
    SET user_id = ?, name = ?, addr_mobile = ?, pincode = ?, locality = ?, address = ?, city = ?, state = ?, landmark = ?
    WHERE id = ?
  `;
  db.query(
    sql,
    [user_id, name, addr_mobile, pincode, locality, address, city, state, landmark, id],
    (err, result) => {
      if (err) {
        console.error('❌ Error updating address:', err);
        return res.status(500).json({ message: 'Error updating address: ' + err.message });
      }
      // Return the updated address
      db.query('SELECT * FROM addresses WHERE id = ?', [id], (err2, rows) => {
        if (err2 || rows.length === 0) {
          return res.status(500).json({ message: 'Error fetching updated address' });
        }
        res.json(rows[0]);
      });
    }
  );
});

// // ✅ Delete user by mobile number
// app.delete('/users/:mobile', (req, res) => {
//   const { mobile } = req.params;
//   if (!mobile) {
//     return res.status(400).json({ message: 'Missing mobile number' });
//   }
//   // First, check if user exists
//   db.query('SELECT * FROM users WHERE mobile = ?', [mobile], (err, results) => {
//     if (err) return res.status(500).json({ message: 'Database error' });
//     if (results.length === 0) return res.status(404).json({ message: 'User not found' });

//     // Delete user
//     db.query('DELETE FROM users WHERE mobile = ?', [mobile], (err2, result) => {
//       if (err2) return res.status(500).json({ message: 'Error deleting user' });
//       res.json({ message: 'User deleted successfully' });
//     });
//   });
// });


// ...existing code...
app.get('/orders/:userId', (req, res) => {
  const userId = req.params.userId;

  // Get all orders for this user
  const ordersSql = 'SELECT * FROM orders WHERE user_id = ? ORDER BY orderDate DESC';
  db.query(ordersSql, [userId], (err, orders) => {
    if (err) return res.status(500).json({ error: 'Failed to fetch orders' });

    if (!orders.length) return res.json([]);

    // Get all order items for these orders
    const orderIds = orders.map(o => o.orderId);
    const itemsSql = 'SELECT * FROM order_items WHERE orderId IN (?)';
    db.query(itemsSql, [orderIds], (err, items) => {
      if (err) return res.status(500).json({ error: 'Failed to fetch order items' });

      // Group items by orderId
      const itemsByOrder = {};
      items.forEach(item => {
        if (!itemsByOrder[item.orderId]) itemsByOrder[item.orderId] = [];
        itemsByOrder[item.orderId].push(item);
      });

      // Attach items to orders
      const ordersWithItems = orders.map(order => ({
        ...order,
        items: itemsByOrder[order.orderId] || []
      }));

      res.json(ordersWithItems);
    });
  });
});





app.post('/categories', (req, res) => {
  const { name, image_base64 } = req.body;
  if (!name || !image_base64) {
    return res.status(400).json({ error: 'Name and image are required' });
  }
  const imageBuffer = Buffer.from(image_base64, 'base64');
  
  db.query(
    'INSERT INTO categories (name, image_data) VALUES (?, ?)',
    [name, imageBuffer],
    (err, result) => {
      if (err) {
        if (err.code === 'ER_DUP_ENTRY') {
          return res.status(409).json({ error: 'Category name already exists' });
        }
        return res.status(500).json({ error: 'Database error' });
      }
      res.json({ id: result.insertId });
    }
  );
});

// Edit category image
app.put('/categories/:id/image', (req, res) => {
  const { image_base64 } = req.body;
  const { id } = req.params;
  if (!image_base64) {
    return res.status(400).json({ error: 'Image is required' });
  }
  const imageBuffer = Buffer.from(image_base64, 'base64');
  console.log('Updating category image:', { id, image_base64_length: image_base64.length });
  db.query(
    'UPDATE categories SET image_data = ? WHERE id = ?',
    [imageBuffer, id],
    (err, result) => {
      if (err) {
        console.error('DB Error:', err);
        return res.status(500).json({ error: 'Database error' });
      }
      if (result.affectedRows === 0) {
        return res.status(404).json({ error: 'Category not found' });
      }
      res.json({ success: true });
    }
  );
});

// Edit category name only
app.put('/categories/:id', (req, res) => {
  const { id } = req.params;
  const { name } = req.body;
  if (!name) {
    return res.status(400).json({ error: 'Name is required' });
  }
  db.query(
    'UPDATE categories SET name = ? WHERE id = ?',
    [name, id],
    (err, result) => {
      if (err) {
        if (err.code === 'ER_DUP_ENTRY') {
          return res.status(409).json({ error: 'Category name already exists' });
        }
        return res.status(500).json({ error: 'Database error' });
      }
      if (result.affectedRows === 0) {
        return res.status(404).json({ error: 'Category not found' });
      }
      res.json({ success: true });
    }
  );
});


// Get all categories with image as base64 url
app.get('/categories', (req, res) => {
  db.query('SELECT id, name, image_data FROM categories', (err, results) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    const categories = results.map(row => ({
      id: row.id,
      name: row.name,
      image_url: row.image_data
        ? `data:image/jpeg;base64,${row.image_data.toString('base64')}`
        : null,
    }));
    res.json(categories);
  });
});


// Delete a category by ID
app.delete('/categories/:id', (req, res) => {
  const { id } = req.params;
  db.query('DELETE FROM categories WHERE id = ?', [id], (err, result) => {
    if (err) {
      // If foreign key constraint fails, send a clear message
      if (err.code === 'ER_ROW_IS_REFERENCED_2') {
        return res.status(400).json({ error: 'Cannot delete category: It is referenced in other records.' });
      }
      return res.status(500).json({ error: 'Failed to remove category' });
    }
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Category not found' });
    }
    res.json({ success: true });
  });
});

// ...existing code...
app.post('/images', (req, res) => {
  const { product_id, image_base64, mime_type } = req.body;
  if (!product_id || !image_base64) {
    return res.status(400).json({ message: 'Missing product_id or image data' });
  }
  const imageBuffer = Buffer.from(image_base64, 'base64');
  // Use INSERT ... ON DUPLICATE KEY UPDATE for upsert
  db.query(
    `INSERT INTO images (product_id, image_data, mime_type)
     VALUES (?, ?, ?)
     ON DUPLICATE KEY UPDATE image_data = VALUES(image_data), mime_type = VALUES(mime_type)`,
    [product_id, imageBuffer, mime_type || 'image/jpeg'],
    (err, result) => {
      if (err) {
        console.error('DB Error:', err);
        return res.status(500).json({ message: 'Failed to store image' });
      }
      res.json({ success: true });
    }
  );
});
// ...existing code...

app.put('/orders/:id/status', (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  db.query(
    'UPDATE orders SET orderStatus = ? WHERE orderId = ?',
    [status, id],
    (err, result) => {
      if (err) return res.status(500).json({ message: 'Failed to update status' });
      res.json({ message: 'Order status updated' });
    }
  );
});

// To serve the image:
app.get('/images/:id', async (req, res) => {
  const [rows] = await db.query('SELECT image_data, mime_type FROM images WHERE product_id = ?', [req.params.id]);
  if (!rows.length) return res.status(404).send('Not found');
  res.set('Content-Type', rows[0].mime_type || 'image/jpeg');
  res.send(rows[0].image_data);
});

// Enable/Disable product
app.put('/products/:id/status', (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  if (!['enabled', 'disabled'].includes(status)) {
    return res.status(400).json({ error: 'Invalid status' });
  }
  db.query(
    'UPDATE products SET status = ? WHERE id = ?',
    [status, id],
    (err, result) => {
      if (err) {
        return res.status(500).json({ error: 'Failed to update status' });
      }
      if (result.affectedRows === 0) {
        return res.status(404).json({ error: 'Product not found' });
      }
      res.json({ success: true });
    }
  );
});


// Add Product with variants
app.post('/products', (req, res) => {
  const { name, description, category_id, status, variants } = req.body;
  db.query(
    'INSERT INTO products (name, description, category_id, status) VALUES (?, ?, ?, ?)',
    [name, description, category_id, status || 'enabled'],
    (err, result) => {
      if (err) return res.status(500).json({ error: 'DB error' });
      const productId = result.insertId;
      if (Array.isArray(variants) && variants.length > 0) {
        const values = variants.map(
          v => [productId, v.quantity_value, v.price, v.mrp || null]
        );
        db.query(
          'INSERT INTO product_variants (product_id, quantity_value, price, mrp) VALUES ?',
          [values],
          (err2) => {
            if (err2) return res.status(500).json({ error: 'DB error' });
            res.json({ id: productId });
          }
        );
      } else {
        res.json({ id: productId });
      }
    }
  );
});

// Update Product and its variants
app.put('/products/:id', (req, res) => {
  const { name, description, category_id, status, variants } = req.body;
  const { id } = req.params;
  db.query(
    'UPDATE products SET name=?, description=?, category_id=?, status=? WHERE id=?',
    [name, description, category_id, status || 'enabled', id],
    (err) => {
      if (err) return res.status(500).json({ error: 'DB error' });
      if (Array.isArray(variants)) {
        db.query('DELETE FROM product_variants WHERE product_id=?', [id], (err2) => {
          if (err2) return res.status(500).json({ error: 'DB error' });
          if (variants.length > 0) {
            const values = variants.map(
              v => [id, v.quantity_value, v.price, v.mrp || null]
            );
            db.query(
              'INSERT INTO product_variants (product_id, quantity_value, price, mrp) VALUES ?',
              [values],
              (err3) => {
                if (err3) return res.status(500).json({ error: 'DB error' });
                res.json({ success: true });
              }
            );
          } else {
            res.json({ success: true });
          }
        });
      } else {
        res.json({ success: true });
      }
    }
  );
});


app.get('/contact-center', (req, res) => {
  db.query('SELECT id, type, value, description FROM contact_center', (err, results) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    res.json(results);
  });
});


// Get daily earnings with optional date filter
// Get daily earnings with optional date filter
app.get('/earnings', (req, res) => {
  const { from, to } = req.query;
  let sql = `
    SELECT DATE(orderDate) as date, SUM(totalAmount) as total
    FROM orders
    WHERE orderStatus = 'Delivered'
  `;
  const params = [];
  if (from) {
    sql += ' AND DATE(orderDate) >= ?';
    params.push(from);
  }
  if (to) {
    sql += ' AND DATE(orderDate) <= ?';
    params.push(to);
  }
  sql += ' GROUP BY DATE(orderDate) ORDER BY DATE(orderDate) DESC';

  db.query(sql, params, (err, results) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    res.json(results);
  });
});

// Get all cart items for a user (with product details)
app.get('/cart', (req, res) => {
  const { user_id } = req.query;
  if (!user_id) return res.status(400).json({ error: 'Missing user_id' });
  const sql = `
    SELECT 
      c.product_id, 
      c.variant_id,
      c.quantity, 
      p.name, 
      v.quantity_value, 
      v.price, 
      COALESCE(i.image_data, NULL) AS image_data, 
      i.mime_type
    FROM cart c
    JOIN products p ON c.product_id = p.id
    JOIN product_variants v ON c.variant_id = v.id
    LEFT JOIN images i ON i.product_id = p.id
    WHERE c.user_id = ?
  `;
  db.query(sql, [user_id], (err, results) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    const cart = results.map(row => ({
      product_id: row.product_id,
      variant_id: row.variant_id,
      name: row.name,
      quantity_value: row.quantity_value,
      price: row.price,
      quantity: row.quantity,
      image_url: row.image_data
        ? `data:${row.mime_type || 'image/jpeg'};base64,${row.image_data.toString('base64')}`
        : null,
    }));
    res.json(cart);
  });
});

// Add or update a cart item
app.post('/cart', (req, res) => {
  const { user_id, product_id, variant_id, quantity } = req.body;
  if (!user_id || !product_id || !variant_id || !quantity) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  db.query(
    `INSERT INTO cart (user_id, product_id, variant_id, quantity)
     VALUES (?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE quantity = VALUES(quantity)`,
    [user_id, product_id, variant_id, quantity],
    (err, result) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      res.json({ success: true });
    }
  );
});

app.delete('/cart', (req, res) => {
  const { user_id, product_id, variant_id } = req.body;
  if (!user_id || !product_id || !variant_id) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  db.query(
    `DELETE FROM cart WHERE user_id = ? AND product_id = ? AND variant_id = ?`,
    [user_id, product_id, variant_id],
    (err, result) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      res.json({ success: true });
    }
  );
});

// Clear all cart items for a user
app.delete('/cart/clear', (req, res) => {
  const { user_id } = req.body;
  if (!user_id) return res.status(400).json({ error: 'Missing user_id' });
  db.query('DELETE FROM cart WHERE user_id = ?', [user_id], (err) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    res.json({ success: true });
  });
});

// ...existing code...

// ✅ Get all pincodes
app.get('/pincodes', (req, res) => {
  db.query('SELECT pincode FROM pincode', (err, results) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    res.json(results.map(row => row.pincode));
  });
});

// Delete a product and its variants/images
app.delete('/products/:id', (req, res) => {
  const productId = req.params.id;

  // Check for pending orders
  db.query(
    `SELECT oi.* FROM order_items oi
     JOIN orders o ON oi.orderId = o.orderId
     WHERE oi.productId = ? AND o.orderStatus != 'Delivered'`,
    [productId],
    (err, rows) => {
      if (err) return res.status(500).json({ error: 'Database error' });
      if (rows.length > 0) {
        return res.status(400).json({ error: 'Cannot delete product: There are pending orders for this product.' });
      }

      // Start by checking if the product exists
      db.query('SELECT id FROM products WHERE id = ?', [productId], (err, rows) => {
        if (err) return res.status(500).json({ error: 'Database error' });
        if (!rows.length) return res.status(404).json({ error: 'Product not found' });

        // Delete variants first
        db.query('DELETE FROM product_variants WHERE product_id = ?', [productId], (err) => {
          if (err) return res.status(500).json({ error: 'Failed to delete variants' });

          // Delete images next
          db.query('DELETE FROM images WHERE product_id = ?', [productId], (err2) => {
            if (err2) return res.status(500).json({ error: 'Failed to delete images' });

            // Now delete the product
            db.query('DELETE FROM products WHERE id = ?', [productId], (err3, result) => {
              if (err3) return res.status(500).json({ error: 'Failed to delete product' });
              if (result.affectedRows === 0) return res.status(404).json({ error: 'Product not found' });
              res.json({ success: true });
            });
          });
        });
      });
    }
  );
});


app.post('/delete-user', (req, res) => {
  const { mobile, password } = req.body;
  if (!mobile || !password) {
    return res.status(400).json({ success: false, message: 'Mobile and password required' });
  }
  db.query('SELECT * FROM users WHERE mobile = ?', [mobile], (err, results) => {
    if (err) return res.status(500).json({ success: false, message: 'Database error' });
    if (results.length === 0) return res.status(404).json({ success: false, message: 'User not found' });

    const userId = results[0].id;
    const hashedPassword = results[0].password;
    bcrypt.compare(password, hashedPassword, (err, isMatch) => {
      if (err) return res.status(500).json({ success: false, message: 'Password comparison error' });
      if (!isMatch) return res.status(401).json({ success: false, message: 'Invalid password' });

      db.query(
        `UPDATE users SET fname = '', lname = '', password = '', dob = NULL ,email = NULL, activity_status = 'inactive' WHERE id = ?`,
        [userId],
        (err2) => {
          console.log(`User with mobile ${mobile} marked as inactive`,err2);
          if (err2) return res.status(500).json({ success: false, message: 'Error updating user status' });
          
          res.json({ success: true });
        }
      );
    });
  });
});


app.get('/banner', (req, res) => {
  db.query('SELECT * FROM banners WHERE active=1 ORDER BY id DESC', (err, results) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    const banners = results.map(banner => ({
      id: banner.id,
      active: !!banner.active,
      image_url: banner.image_data
        ? `data:${banner.mime_type || 'image/jpeg'};base64,${banner.image_data.toString('base64')}`
        : null,
    }));
    res.json(banners);
  });
});
// Replace your /banner GET endpoint with this:
app.get('/banner-admin', (req, res) => {
  db.query('SELECT * FROM banners ORDER BY id DESC', (err, results) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    const banners = results.map(banner => ({
      id: banner.id,
      active: !!banner.active,
      image_url: banner.image_data
        ? `data:${banner.mime_type || 'image/jpeg'};base64,${banner.image_data.toString('base64')}`
        : null,
    }));
    res.json(banners);
  });
});


// Only insert the new banner, do NOT update any existing banners' active status!
app.post('/banner', (req, res) => {
  const { image_base64, mime_type } = req.body;
  if (!image_base64) return res.status(400).json({ error: 'No image' });
  const imageBuffer = Buffer.from(image_base64, 'base64');
  db.query(
    'INSERT INTO banners (image_data, mime_type, active) VALUES (?, ?, 0)', // active=0 by default
    [imageBuffer, mime_type || 'image/jpeg'],
    (err, result) => {
      if (err) return res.status(500).json({ error: 'DB error' });
      res.json({ success: true, id: result.insertId });
    }
  );
});

// Activate a banner (without deactivating others)
app.put('/banner/:id/activate', (req, res) => {
  const { id } = req.params;
  db.query('UPDATE banners SET active=1 WHERE id=?', [id], (err) => {
    if (err) return res.status(500).json({ error: 'DB error' });
    res.json({ success: true });
  });
});
// Admin: Deactivate a banner
app.put('/banner/:id/deactivate', (req, res) => {
  const { id } = req.params;
  db.query('UPDATE banners SET active=0 WHERE id=?', [id], (err) => {
    if (err) return res.status(500).json({ error: 'DB error' });
    res.json({ success: true });
  });
});

// Admin: Remove (delete) a banner
app.delete('/banner/:id', (req, res) => {
  const { id } = req.params;
  db.query('DELETE FROM banners WHERE id=?', [id], (err) => {
    if (err) return res.status(500).json({ error: 'DB error' });
    res.json({ success: true });
  });
});


// --- Offer Endpoints ---

function toDDMMYYYY(dateStr) {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  const dd = parts[0].padStart(2, '0');
  const mm = parts[1].padStart(2, '0');
  const yyyy = parts[2];
  return `${dd}-${mm}-${yyyy}`;
}

// Add Offer
app.post('/api/offers', (req, res) => {
  let { coupon_code, start_date, end_date, min_cart_value, max_cart_value, discount_percent, max_discount } = req.body;
  start_date = toDDMMYYYY(start_date);
  end_date = toDDMMYYYY(end_date);
  db.query(
    'INSERT INTO offers (coupon_code, start_date, end_date, min_cart_value, max_cart_value, discount_percent, max_discount) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [coupon_code, start_date, end_date, min_cart_value, max_cart_value, discount_percent, max_discount],
    (err, result) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ success: true });
    }
  );
});

// Update Offer
app.put('/api/offers/:id', (req, res) => {
  let { coupon_code, start_date, end_date, min_cart_value, max_cart_value, discount_percent, max_discount } = req.body;
  start_date = toDDMMYYYY(start_date);
  end_date = toDDMMYYYY(end_date);
  db.query(
    `UPDATE offers SET coupon_code=?, start_date=?, end_date=?, min_cart_value=?, max_cart_value=?, discount_percent=?, max_discount=? WHERE id=?`,
    [coupon_code, start_date, end_date, min_cart_value, max_cart_value, discount_percent, max_discount, req.params.id],
    (err, result) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ success: true });
    }
  );
});

// Get All Offers
app.get('/api/offers', (req, res) => {
  db.query('SELECT * FROM offers', (err, offers) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(offers);
  });
});

// Delete Offer
app.delete('/api/offers/:id', (req, res) => {
  db.query('DELETE FROM offers WHERE id=?', [req.params.id], (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true });
  });
});

// Coupon validation: get today's date in dd-mm-yyyy


// Helper to get today's date in IST as dd-mm-yyyy
function getTodayIST_ddmmyyyy() {
  const now = new Date();
  // Convert to IST (UTC+5:30)
  const istOffset = 5.5 * 60 * 60 * 1000;
  const istNow = new Date(now.getTime() + istOffset - (now.getTimezoneOffset() * 60000));
  const dd = String(istNow.getDate()).padStart(2, '0');
  const mm = String(istNow.getMonth() + 1).padStart(2, '0');
  const yyyy = istNow.getFullYear();
  return `${dd}-${mm}-${yyyy}`;
}

// Helper to convert dd-mm-yyyy to JS Date (midnight IST)
function parseDDMMYYYYtoDate(dateStr) {
  if (!dateStr) return null;
  const [dd, mm, yyyy] = dateStr.split('-');
  // Date.UTC uses month 0-based
  return new Date(Date.UTC(Number(yyyy), Number(mm) - 1, Number(dd), 0, 0, 0));
}

app.post('/api/apply-coupon', (req, res) => {
  let { coupon_code, cart_value } = req.body;
  coupon_code = (coupon_code || '').toUpperCase();

  const todayStr = getTodayIST_ddmmyyyy();
  const todayDate = parseDDMMYYYYtoDate(todayStr);

  db.query(
    `SELECT * FROM offers
     WHERE UPPER(coupon_code) = ?
     AND min_cart_value <= ? AND max_cart_value >= ?`,
    [coupon_code, cart_value, cart_value],
    (err, rows) => {
      if (err) {
        console.error('Coupon DB error:', err);
        return res.status(500).json({ valid: false, message: 'Server error' });
      }
      if (!rows.length) {
        return res.json({ valid: false, message: 'Invalid or expired coupon' });
      }

      // Now check date validity in JS
      const offer = rows[0];
      const startDate = parseDDMMYYYYtoDate(offer.start_date);
      const endDate = parseDDMMYYYYtoDate(offer.end_date);

      if (!startDate || !endDate || !todayDate ||
          todayDate < startDate || todayDate > endDate) {
        return res.json({ valid: false, message: 'Coupon expired' });
      }

      let discount = Number(cart_value) * Number(offer.discount_percent) / 100;
if (offer.max_discount !== null && offer.max_discount !== undefined && discount > Number(offer.max_discount)) {
  discount = Number(offer.max_discount);
}
const final_value = Number(cart_value) - discount;
res.json({
  valid: true,
  discount: discount.toFixed(2),
  final_value: final_value.toFixed(2),
  discount_percent: offer.discount_percent
});
    }
  );
});

// Get delivery settings
app.get('/delivery-settings', (req, res) => {
  db.query('SELECT * FROM delivery_settings ORDER BY id DESC LIMIT 1', (err, rows) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    if (!rows.length) return res.json({ delivery_charge: 0, free_delivery_limit: 0 });
    res.json(rows[0]);
  });
});

// Update delivery settings (admin only)
app.put('/delivery-settings', (req, res) => {
  const { delivery_charge, free_delivery_limit } = req.body;
  if (delivery_charge == null || free_delivery_limit == null) {
    return res.status(400).json({ error: 'Missing fields' });
  }
  db.query(
    'UPDATE delivery_settings SET delivery_charge=?, free_delivery_limit=? ORDER BY id DESC LIMIT 1',
    [delivery_charge, free_delivery_limit],
    (err, result) => {
      if (err) return res.status(500).json({ error: 'Database error' });
      res.json({ success: true });
    }
  );
});

// Helper to generate random 5-digit OTP
function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Send OTP via WhatsApp
app.post('/send-otp', async (req, res) => {
  const { mobile } = req.body;
  if (!mobile) return res.status(400).json({ success: false, message: 'Mobile required' });
  console.log(`Sending OTP to mobile: ${mobile}`);
  const otp = generateOTP();
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 min expiry

  // Save OTP to DB (upsert)
  db.query(
    `INSERT INTO user_otps (mobile, otp, expires_at) VALUES (?, ?, ?)
     ON DUPLICATE KEY UPDATE otp=?, expires_at=?`,
    [mobile, otp, expiresAt, otp, expiresAt],
    async (err) => {
      if (err) return res.status(500).json({ success: false, message: 'DB error' });

      // Send WhatsApp message via Facebook API
      try {
        await axios.post(
          'https://graph.facebook.com/v22.0/721182311071916/messages',
          {
            messaging_product: "whatsapp",
            recipient_type: "individual",
            to: "91" + mobile, // WhatsApp expects country code
            type: "template",
            template: {
              name: "otp_registration",
              language: { code: "en_US" },
              components: [
                {
                  type: "body",
                  parameters: [
                    { type: "text", text: otp },
                    { type: "text", text: mobile }
                  ]
                },
                {
                  type: "button",
                  sub_type: "url",
                  index: "0",
                  parameters: [
                    { type: "text", text: otp }
                  ]
                }
              ]
            }
          },
          {
            headers: {
              'Content-Type': 'application/json',
              'Authorization': 'Bearer EAAbNG1p6zT0BO3BPXh1WzvghnU64pqOFd5ZBowZBJADzaruUf0PbTzSFxFMuUF4Jx1t3oqGsad48ZBFuAA5QngZA0a7Qy4eMqD2U22kvZCMDNBR251gJXnHagYPG72hgnZATdqBul4hU9itRp3r9pVWaFkQKo25f9o37x5zq44QlEWMQi5YdELObofAzcxcFLMBfZC1iyZBEaR9ghY7kFUBHM8hEqLi0e4Lj26Ce'
            }
          }
        );
        res.json({ success: true, message: 'OTP sent' });
      } catch (e) {
        console.error('WhatsApp API error:', e.response?.data || e.message);
        res.status(500).json({ success: false, message: 'Failed to send OTP', error: e.response?.data || e.message });
      }
    }
  );
});

// ...existing code...

app.post('/verify-otp', (req, res) => {
  const { mobile, otp } = req.body;
  if (!mobile || !otp) return res.status(400).json({ success: false, message: 'Mobile and OTP required' });

  db.query(
    'SELECT * FROM user_otps WHERE mobile = ? AND otp = ? AND expires_at > NOW()',
    [mobile, otp],
    (err, rows) => {
      if (err) return res.status(500).json({ success: false, message: 'DB error' });
      if (!rows.length) return res.status(400).json({ success: false, message: 'Invalid or expired OTP' });

      // Mark OTP as verified, do NOT delete
      db.query('UPDATE user_otps SET verified = 1 WHERE mobile = ?', [mobile]);
      res.json({ success: true });
    }
  );
});

app.post('/forgot-password/send-otp', (req, res) => {
  const { mobile } = req.body;
  if (!mobile) return res.status(400).json({ success: false, message: 'Mobile required' });

  db.query('SELECT * FROM users WHERE mobile = ? AND activity_status = "active"', [mobile], (err, results) => {
    if (err) return res.status(500).json({ success: false, message: 'Database error' });
    if (results.length === 0) return res.status(404).json({ success: false, message: 'User not found or inactive' });

    // Reuse your OTP logic
    const otp = generateOTP();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 min expiry

    db.query(
      `INSERT INTO user_otps (mobile, otp, expires_at) VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE otp=?, expires_at=?`,
      [mobile, otp, expiresAt, otp, expiresAt],
      async (err) => {
        if (err) return res.status(500).json({ success: false, message: 'DB error' });

        try {
          await axios.post(
            'https://graph.facebook.com/v22.0/721182311071916/messages',
            {
              messaging_product: "whatsapp",
              recipient_type: "individual",
              to: "91" + mobile,
              type: "template",
              template: {
                name: "otp_registration",
                language: { code: "en_US" },
                components: [
                  {
                    type: "body",
                    parameters: [
                      { type: "text", text: otp },
                      { type: "text", text: mobile }
                    ]
                  },
                  {
                    type: "button",
                    sub_type: "url",
                    index: "0",
                    parameters: [
                      { type: "text", text: otp }
                    ]
                  }
                ]
              }
            },
            {
              headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer EAAbNG1p6zT0BO3BPXh1WzvghnU64pqOFd5ZBowZBJADzaruUf0PbTzSFxFMuUF4Jx1t3oqGsad48ZBFuAA5QngZA0a7Qy4eMqD2U22kvZCMDNBR251gJXnHagYPG72hgnZATdqBul4hU9itRp3r9pVWaFkQKo25f9o37x5zq44QlEWMQi5YdELObofAzcxcFLMBfZC1iyZBEaR9ghY7kFUBHM8hEqLi0e4Lj26Ce'
              }
            }
          );
          res.json({ success: true, message: 'OTP sent' });
        } catch (e) {
          console.error('WhatsApp API error:', e.response?.data || e.message);
          res.status(500).json({ success: false, message: 'Failed to send OTP', error: e.response?.data || e.message });
        }
      }
    );
  });
});

app.post('/forgot-password/reset', async (req, res) => {
  const { mobile, otp, newPassword } = req.body;
  if (!mobile || !otp || !newPassword) {
    return res.status(400).json({ success: false, message: 'Missing fields' });
  }

  // Verify OTP and check if verified
  db.query(
    'SELECT * FROM user_otps WHERE mobile = ? AND otp = ? AND expires_at > NOW() AND verified = 1',
    [mobile, otp],
    async (err, rows) => {
      if (err) return res.status(500).json({ success: false, message: 'DB error' });
      if (!rows.length) return res.status(400).json({ success: false, message: 'OTP not verified or expired' });

      // Update password
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      db.query(
        'UPDATE users SET password = ? WHERE mobile = ?',
        [hashedPassword, mobile],
        (err2, result) => {
          if (err2) return res.status(500).json({ success: false, message: 'Failed to update password' });
          db.query('DELETE FROM user_otps WHERE mobile = ?', [mobile]);
          res.json({ success: true, message: 'Password updated successfully' });
        }
      );
    }
  );
});


const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server running on http://0.0.0.0:${PORT}`));
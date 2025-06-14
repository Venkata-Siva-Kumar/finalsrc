const express = require('express');
const cors = require('cors');
const mysql = require('mysql2');
const bcrypt = require('bcrypt');
require('dotenv').config();


const app = express();
app.use(cors());
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ limit: '1mb', extended: true }));

// ✅ Connect to MySQL
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
  db.query('SELECT * FROM users WHERE mobile = ?', [mobile], async (err, results) => {
    if (err) return res.status(500).json({ message: 'Database error' });
    if (results.length > 0) return res.status(400).json({ message: 'User already exists' });

    const hashedPassword = await bcrypt.hash(password, 10);
    db.query(
      `INSERT INTO users (fname, lname, mobile, password, gender, email, dob) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [fname, lname, mobile, hashedPassword, gender, email || null, dob || null],
      err => {
        if (err) return res.status(500).json({ message: 'Error inserting user' });
        res.json({ message: 'User registered successfully' });
      }
    );
  });
});
// ...existing code...

// ✅ Login route
app.post('/login', (req, res) => {
  const { mobile, password } = req.body;
  db.query('SELECT * FROM users WHERE mobile = ?', [mobile], (err, results) => {
    if (err) return res.status(500).json({ message: 'Database error' });
    if (results.length === 0) return res.status(401).json({ message: 'Invalid mobile number' });

    const hashedPassword = results[0].password;
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
  let { orderId, totalAmount, orderDate, orderStatus, user_id, mobile, address_id, items } = req.body;

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

    const orderSql = `INSERT INTO orders (orderId, totalAmount, orderDate, orderStatus, user_id, address_id)
                      VALUES (?, ?, ?, ?, ?, ?)`;
    db.query(
      orderSql,
      [orderId, totalAmount, orderDate, orderStatus, user_id, address_id || null],
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
  db.query('DELETE FROM addresses WHERE id = ?', [id], (err, result) => {
    if (err) {
      console.error('❌ Error deleting address:', err);
      return res.status(500).json({ message: 'Error deleting address: ' + err.message });
    }
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Address not found' });
    }
    res.json({ message: 'Address deleted successfully' });
  });
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
         v.price AS variant_price
       FROM order_items oi
       JOIN products p ON oi.productId = p.id
       JOIN product_variants v ON oi.variantId = v.id
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
            quantity_value: item.quantity_value,
            product_id: item.productId,
            variant_id: item.variantId,
          });
        });
        // Attach items to orders
        const result = orders.map(order => ({
          orderId: order.orderId,
          orderDate: order.orderDate,
          orderStatus: order.orderStatus,
          totalAmount: order.totalAmount,
          items: itemsByOrder[order.orderId] || [],
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
  const addressStr = JSON.stringify(address); // Store as JSON string
  const sql = `
    INSERT INTO addresses (user_id, name, addr_mobile, pincode, locality, address, city, state, landmark)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;
  db.query(
    sql,
    [user_id, name, addr_mobile, pincode, locality, addressStr, city, state, landmark],
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
  const addressStr = JSON.stringify(address);
  const sql = `
    UPDATE addresses
    SET user_id = ?, name = ?, addr_mobile = ?, pincode = ?, locality = ?, address = ?, city = ?, state = ?, landmark = ?
    WHERE id = ?
  `;
  db.query(
    sql,
    [user_id, name, addr_mobile, pincode, locality, addressStr, city, state, landmark, id],
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

// ✅ Delete user by mobile number
app.delete('/users/:mobile', (req, res) => {
  const { mobile } = req.params;
  if (!mobile) {
    return res.status(400).json({ message: 'Missing mobile number' });
  }
  // First, check if user exists
  db.query('SELECT * FROM users WHERE mobile = ?', [mobile], (err, results) => {
    if (err) return res.status(500).json({ message: 'Database error' });
    if (results.length === 0) return res.status(404).json({ message: 'User not found' });

    // Delete user
    db.query('DELETE FROM users WHERE mobile = ?', [mobile], (err2, result) => {
      if (err2) return res.status(500).json({ message: 'Error deleting user' });
      res.json({ message: 'User deleted successfully' });
    });
  });
});


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


const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server running on http://0.0.0.0:${PORT}`));
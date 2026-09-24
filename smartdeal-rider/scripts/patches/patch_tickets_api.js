const fs = require('fs');
let code = fs.readFileSync('C:/smartdeal/server.js', 'utf8');

const newEndpoints = `
// Admin Ticket Management
app.get('/api/admin/tickets', async (req, res) => {
  try {
    const [results] = await db.execute(\`
      SELECT oi.issue_id, oi.order_id, oi.user_id, oi.issue_topic, oi.issue_detail, oi.status, oi.created_at, u.full_name AS reporter_name, u.role AS reporter_role
      FROM order_issues oi
      JOIN users u ON oi.user_id = u.user_id
      ORDER BY oi.created_at DESC
    \`);
    res.json(results);
  } catch (error) {
    console.error('API /api/admin/tickets Error:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

app.get('/api/admin/tickets/:id', async (req, res) => {
  const issueId = req.params.id;
  try {
    const [issue] = await db.execute(\`
      SELECT oi.*, u.full_name AS reporter_name, u.email AS reporter_email, u.phone AS reporter_phone, u.role AS reporter_role, u.avatar_url AS reporter_avatar
      FROM order_issues oi
      JOIN users u ON oi.user_id = u.user_id
      WHERE oi.issue_id = ?
    \`, [issueId]);

    if (issue.length === 0) return res.status(404).json({ error: 'Ticket not found' });

    const orderId = issue[0].order_id;
    const [orderInfo] = await db.execute(\`
      SELECT o.order_id, o.total_amount, o.order_status, o.created_at, s.name AS shop_name, s.shop_id
      FROM orders o
      LEFT JOIN shops s ON o.shop_id = s.shop_id
      WHERE o.order_id = ?
    \`, [orderId]);

    res.json({
      ticket: issue[0],
      order: orderInfo.length > 0 ? orderInfo[0] : null
    });
  } catch (error) {
    console.error('API /api/admin/tickets/:id Error:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

app.put('/api/admin/tickets/:id/status', async (req, res) => {
  const { status } = req.body;
  if (!['pending', 'investigating', 'resolved'].includes(status)) {
    return res.status(400).json({ error: 'Invalid status' });
  }
  try {
    const [result] = await db.execute('UPDATE order_issues SET status = ? WHERE issue_id = ?', [status, req.params.id]);
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Ticket not found' });
    res.json({ success: true, message: 'Ticket status updated' });
  } catch (error) {
    console.error('API /api/admin/tickets/:id/status Error:', error);
    res.status(500).json({ error: 'Database error' });
  }
});
`;

// Insert the new endpoints before the closing of the app
if (!code.includes('/api/admin/tickets')) {
  // Find a good place to insert, like before the port listener
  code = code.replace(/app\.listen\(/, newEndpoints + '\napp.listen(');
  fs.writeFileSync('C:/smartdeal/server.js', code);
  console.log('Added Ticket APIs to server.js');
} else {
  console.log('Ticket APIs already exist');
}

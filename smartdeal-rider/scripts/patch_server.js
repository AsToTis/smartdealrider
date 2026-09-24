const fs = require('fs');

let code = fs.readFileSync('C:/smartdeal/server.js', 'utf8');

// 1. Update /api/rider/jobs to ensure only unassigned orders are shown
const oldJobsQuery = `      WHERE o.order_status IN ('finding_rider', 'ready', 'paid') AND o.delivery_type != 'pickup'
      ORDER BY o.created_at ASC`;

const newJobsQuery = `      LEFT JOIN deliveries del ON o.order_id = del.order_id
      WHERE o.order_status IN ('finding_rider', 'ready', 'paid') AND o.delivery_type != 'pickup' AND (del.id IS NULL OR del.status = 'cancelled')
      ORDER BY o.created_at ASC`;

if (code.includes(oldJobsQuery)) {
  code = code.replace(oldJobsQuery, newJobsQuery);
  console.log('✅ Updated /api/rider/jobs query');
}

// 2. Update /api/rider/:id/history to return all deliveries (active + completed) with full details
const oldHistoryBlock = `// 6. Rider Earnings History
app.get('/api/rider/:id/history', async (req, res) => {
  const riderId = req.params.id;
  try {
    const [deliveries] = await db.query(\`
      SELECT d.id as delivery_id, d.status, d.completed_at, d.proof_image,
             o.order_id as order_id, o.delivery_fee,
             s.name as shop_name
      FROM deliveries d
      JOIN orders o ON d.order_id = o.order_id
      JOIN shops s ON o.shop_id = s.shop_id
      WHERE d.rider_id = ? AND d.status = 'delivered'
      ORDER BY d.completed_at DESC
    \`, [riderId]);

    const total_earnings = deliveries.reduce((sum, item) => sum + Number(item.delivery_fee || 0), 0);

    res.json({ 
      success: true, 
      data: {
        total_earnings,
        deliveries
      }
    });
  } catch (error) {
    console.error('Get rider history error:', error);
    res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดเซิร์ฟเวอร์' });
  }
});`;

const newHistoryBlock = `// 6. Rider Deliveries & Earnings History (Active + Completed)
app.get('/api/rider/:id/history', async (req, res) => {
  const riderId = req.params.id;
  try {
    const [deliveries] = await db.query(\`
      SELECT d.id as delivery_id, d.status, d.assigned_at, d.completed_at, d.proof_image,
             o.order_id, o.order_status, o.delivery_fee, o.total_amount,
             o.shipping_address as customer_address, o.shipping_address as delivery_address,
             u.full_name as customer_name, u.phone as customer_phone,
             s.shop_id, s.name as shop_name, s.name as restaurant_name, s.address as shop_address,
             s.latitude as shop_lat, s.longitude as shop_lng,
             o.latitude as customer_lat, o.longitude as customer_lng, o.note_for_rider
      FROM deliveries d
      JOIN orders o ON d.order_id = o.order_id
      JOIN shops s ON o.shop_id = s.shop_id
      JOIN users u ON o.user_id = u.user_id
      WHERE d.rider_id = ?
      ORDER BY d.id DESC
    \`, [riderId]);

    const total_earnings = deliveries
      .filter(item => item.status === 'delivered' || item.status === 'completed')
      .reduce((sum, item) => sum + Number(item.delivery_fee || 0), 0);

    res.json({ 
      success: true, 
      data: {
        total_earnings,
        deliveries
      }
    });
  } catch (error) {
    console.error('Get rider history error:', error);
    res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดเซิร์ฟเวอร์' });
  }
});`;

if (code.includes(oldHistoryBlock)) {
  code = code.replace(oldHistoryBlock, newHistoryBlock);
  console.log('✅ Updated /api/rider/:id/history route');
}

fs.writeFileSync('C:/smartdeal/server.js', code, 'utf8');
console.log('✅ server.js patched successfully!');

const fs = require('fs');

const serverPath = 'C:/smartdeal/smart-deal-backend/src/server.js';
let content = fs.readFileSync(serverPath, 'utf8');

const startMarker = "// 8. Rider Job Details";
const endMarker = "// 6. Rider Deliveries & Earnings History (Active + Completed)";

const startIndex = content.indexOf(startMarker);
const endIndex = content.indexOf(endMarker);

if (startIndex === -1 || endIndex === -1) {
  console.error("Could not find markers in server.js");
  process.exit(1);
}

const targetOld = content.substring(startIndex, endIndex);

const newBlock = `// 8. Rider Job Details
app.get('/api/rider/jobs/:order_id', async (req, res) => {
  try {
    const orderId = req.params.order_id;
    const [jobs] = await db.query(\`
      SELECT o.order_id as order_id, o.total_amount, o.delivery_fee, o.order_status, o.created_at,
             s.shop_id, s.name as shop_name, s.address as shop_address, s.latitude as shop_lat, s.longitude as shop_lng,
             owner.phone as shop_phone,
             o.shipping_address as customer_address, o.latitude as customer_lat, o.longitude as customer_lng,
             u.full_name as customer_name, u.phone as customer_phone, d.status as delivery_status,
             o.note_for_rider
      FROM orders o
      JOIN shops s ON o.shop_id = s.shop_id
      LEFT JOIN users owner ON s.owner_id = owner.user_id
      LEFT JOIN users u ON o.user_id = u.user_id
      LEFT JOIN deliveries d ON d.order_id = o.order_id
      WHERE o.order_id = ?
    \`, [orderId]);
    
    if (jobs.length > 0) {
      const job = jobs[0];

      let pickupShops = [{
        shop_id: job.shop_id,
        shop_name: job.shop_name,
        shop_address: job.shop_address,
        shop_lat: job.shop_lat,
        shop_lng: job.shop_lng,
        shop_phone: job.shop_phone || '021234567'
      }];

      try {
        const [orderShops] = await db.query(\`
          SELECT DISTINCT s.shop_id, s.name as shop_name, s.address as shop_address, s.latitude as shop_lat, s.longitude as shop_lng, owner.phone as shop_phone
          FROM order_items oi
          LEFT JOIN products p ON oi.product_id = p.product_id
          LEFT JOIN shops s ON (oi.shop_id = s.shop_id OR p.shop_id = s.shop_id)
          LEFT JOIN users owner ON s.owner_id = owner.user_id
          WHERE oi.order_id = ? AND s.shop_id IS NOT NULL
        \`, [orderId]);

        if (orderShops.length > 0) {
          pickupShops = orderShops.map(s => ({
            ...s,
            shop_phone: s.shop_phone || '021234567'
          }));
        }
      } catch (shopErr) {
        console.error('Error fetching pickup shops for job detail:', shopErr.message);
      }

      let items = [];
      try {
        const [itemRows] = await db.query(\`
          SELECT oi.*, p.name as db_product_name, COALESCE(s.name, '') as shop_name
          FROM order_items oi
          LEFT JOIN products p ON oi.product_id = p.product_id
          LEFT JOIN shops s ON (oi.shop_id = s.shop_id OR p.shop_id = s.shop_id)
          WHERE oi.order_id = ?
        \`, [orderId]);

        items = itemRows.map(item => ({
          ...item,
          product_name: item.product_name || item.db_product_name || 'สินค้า'
        }));
      } catch (itemErr) {
        console.error('Error fetching order items for job detail:', itemErr.message);
      }

      res.json({
        success: true,
        data: {
          ...job,
          shop_phone: job.shop_phone || '021234567',
          shops: pickupShops,
          pickup_shops: pickupShops,
          is_multi_shop: pickupShops.length > 1,
          items: items
        }
      });
    } else {
      res.status(404).json({ success: false, message: 'Job not found' });
    }
  } catch (error) {
    console.error('Error fetching job details:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

`;

content = content.replace(targetOld, newBlock);
fs.writeFileSync(serverPath, content, 'utf8');
console.log('✅ Successfully patched backend server.js with clean queries!');

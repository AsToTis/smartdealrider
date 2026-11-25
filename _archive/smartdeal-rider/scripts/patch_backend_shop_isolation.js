const fs = require('fs');

const serverPath = 'C:/smartdeal/smart-deal-backend/src/server.js';
let content = fs.readFileSync(serverPath, 'utf8');

// 1. Ensure table initialization has pickup_proofs column
const tableInitMarker = "try { await db.execute('ALTER TABLE deliveries ADD COLUMN pickup_proof_image LONGTEXT NULL'); } catch(e) {}";
const newTableInit = `try { await db.execute('ALTER TABLE deliveries ADD COLUMN pickup_proof_image LONGTEXT NULL'); } catch(e) {}
    try { await db.execute('ALTER TABLE deliveries ADD COLUMN pickup_proofs LONGTEXT NULL'); } catch(e) {}`;

if (content.includes(tableInitMarker) && !content.includes('pickup_proofs LONGTEXT NULL')) {
  content = content.replace(tableInitMarker, newTableInit);
}

// 2. Replace /api/rider/deliveries/:order_id/pickup handler
const pickupStartMarker = "// 4.1 Proof of Pickup (Rider receives food from Shop with photo verification";
const pickupEndMarker = "// 6. Rider Complete & Confirm (Complete Delivery)";

const pStartIndex = content.indexOf(pickupStartMarker);
const pEndIndex = content.indexOf(pickupEndMarker);

if (pStartIndex !== -1 && pEndIndex !== -1) {
  const oldPickupBlock = content.substring(pStartIndex, pEndIndex);
  const newPickupBlock = `// 4.1 Proof of Pickup (Rider receives food from Shop with photo verification per shop)
app.post('/api/rider/deliveries/:order_id/pickup', upload.single('pickup_image'), async (req, res) => {
  const orderId = req.params.order_id;
  const { rider_id, shop_id, pickup_proof_image, is_all_picked_up } = req.body;
  const uploadedImage = req.file ? \`/uploads/\${req.file.filename}\` : (pickup_proof_image || '');

  let connection;
  try {
    connection = await db.getConnection();
    await connection.beginTransaction();

    const [orderRows] = await connection.query('SELECT order_status, shop_id FROM orders WHERE order_id = ? FOR UPDATE', [orderId]);
    if (orderRows.length === 0) {
      await connection.rollback();
      return res.status(404).json({ success: false, message: 'ไม่พบข้อมูลคำสั่งซื้อ' });
    }

    // Get current deliveries record
    const [delRows] = await connection.query('SELECT id, pickup_proofs, pickup_proof_image FROM deliveries WHERE order_id = ? AND rider_id = ? FOR UPDATE', [orderId, rider_id]);
    
    let proofsMap = {};
    if (delRows.length > 0 && delRows[0].pickup_proofs) {
      try {
        proofsMap = typeof delRows[0].pickup_proofs === 'string' ? JSON.parse(delRows[0].pickup_proofs) : delRows[0].pickup_proofs;
      } catch (e) {
        proofsMap = {};
      }
    }

    const targetShopId = String(shop_id || orderRows[0].shop_id || '1');
    proofsMap[targetShopId] = {
      shop_id: targetShopId,
      proof_image: uploadedImage,
      picked_up_at: new Date().toISOString()
    };

    // Find all distinct pickup shops for this order
    const [orderShops] = await connection.query(\`
      SELECT DISTINCT s.shop_id, s.name as shop_name, s.owner_id
      FROM order_items oi
      LEFT JOIN products p ON oi.product_id = p.product_id
      LEFT JOIN shops s ON (oi.shop_id = s.shop_id OR p.shop_id = s.shop_id)
      WHERE oi.order_id = ? AND s.shop_id IS NOT NULL
    \`, [orderId]);

    const allShopIds = orderShops.length > 0 ? orderShops.map(s => String(s.shop_id)) : [String(orderRows[0].shop_id || '1')];
    const pickedUpCount = allShopIds.filter(id => proofsMap[id] && proofsMap[id].proof_image).length;
    const reallyAllPickedUp = is_all_picked_up === true || is_all_picked_up === 'true' || pickedUpCount >= allShopIds.length;

    const newDeliveryStatus = reallyAllPickedUp ? 'delivering' : 'accepted';
    const newOrderStatus = reallyAllPickedUp ? 'delivering' : orderRows[0].order_status;

    await connection.query(
      'UPDATE deliveries SET status = ?, pickup_proofs = ?, pickup_proof_image = ?, pickup_at = NOW() WHERE order_id = ? AND rider_id = ?',
      [newDeliveryStatus, JSON.stringify(proofsMap), uploadedImage, orderId, rider_id]
    );

    if (reallyAllPickedUp) {
      await connection.query(
        'UPDATE orders SET order_status = "delivering" WHERE order_id = ?',
        [orderId]
      );
    }

    // 1. Notify ONLY the specific Shop Owner that was just picked up
    try {
      const [shopOwner] = await connection.query('SELECT owner_id, name FROM shops WHERE shop_id = ?', [targetShopId]);
      if (shopOwner.length > 0 && shopOwner[0].owner_id) {
        await connection.query(
          'INSERT INTO notifications (user_id, title, message, type, reference_id, is_read, created_at) VALUES (?, ?, ?, "order", ?, 0, NOW())',
          [shopOwner[0].owner_id, \`🛵 ไรเดอร์รับสินค้าจากร้าน \${shopOwner[0].name} แล้ว (#\${orderId})\`, 'ไรเดอร์ได้ถ่ายรูปยืนยันรับสินค้าจากร้านของคุณเรียบร้อยแล้ว', String(orderId)]
        );
      }
    } catch(ne) {}

    // 2. Auto post pickup proof message & photo ONLY to this Shop Seller Chat Channel
    try {
      const [sInfo] = await connection.query('SELECT name FROM shops WHERE shop_id = ?', [targetShopId]);
      const sName = sInfo.length > 0 ? sInfo[0].name : 'ร้านค้า';
      await connection.query(
        'INSERT INTO order_messages (order_id, shop_id, sender_id, sender_type, receiver_type, message, image_url) VALUES (?, ?, ?, "rider", "seller", ?, ?)',
        [orderId, targetShopId, rider_id, \`🛵 [ยืนยันรับสินค้าแล้ว] ไรเดอร์ได้รับสินค้าจาก "\${sName}" เรียบร้อยแล้วครับ\`, uploadedImage || null]
      );
    } catch(e) {
      console.error('Error auto-posting pickup proof to shop chat:', e);
    }

    // 3. If ALL shops are picked up, notify Buyer & post to Buyer Chat Channel
    if (reallyAllPickedUp) {
      try {
        const [oRows] = await connection.query('SELECT user_id FROM orders WHERE order_id = ?', [orderId]);
        if (oRows.length > 0 && oRows[0].user_id) {
          await connection.query(
            'INSERT INTO notifications (user_id, title, message, type, reference_id, is_read, created_at) VALUES (?, ?, ?, "order", ?, 0, NOW())',
            [oRows[0].user_id, \`🛵 ไรเดอร์รับสินค้าครบทุกร้านแล้ว (#\${orderId})\`, 'ไรเดอร์ได้รับสินค้าครบทุกร้านแล้ว และกำลังเดินทางนำส่งให้คุณ', String(orderId)]
          );
        }
      } catch(ne) {}

      try {
        await connection.query(
          'INSERT INTO order_messages (order_id, sender_id, sender_type, receiver_type, message, image_url) VALUES (?, NULL, ?, "rider", "buyer", ?, ?)',
          [orderId, rider_id, '🛵 [รับสินค้าครบแล้ว] ไรเดอร์ได้รับสินค้าครบทุกร้านค้าเรียบร้อยแล้ว กำลังเดินทางไปส่งให้คุณลูกค้าครับ', uploadedImage || null]
        );
      } catch(e) {}
    }

    await connection.commit();
    res.json({
      success: true,
      message: reallyAllPickedUp ? 'รับสินค้าครบทุกร้านแล้ว กำลังไปส่งลูกค้า' : 'ยืนยันการรับสินค้าร้านนี้เรียบร้อย',
      is_all_picked_up: reallyAllPickedUp,
      picked_up_count: pickedUpCount,
      total_shops: allShopIds.length,
      proofs: proofsMap
    });
  } catch (error) {
    if (connection) await connection.rollback();
    console.error('Pickup error:', error);
    res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดเซิร์ฟเวอร์' });
  } finally {
    if (connection) connection.release();
  }
});

`;
  content = content.replace(oldPickupBlock, newPickupBlock);
  console.log('✅ Updated pickup handler in server.js');
}

// 3. Replace /api/rider/jobs/:order_id handler with per-shop proof mapping
const jobDetailStartMarker = "// 8. Rider Job Details";
const jobDetailEndMarker = "// 6. Rider Deliveries & Earnings History (Active + Completed)";

const jStartIndex = content.indexOf(jobDetailStartMarker);
const jEndIndex = content.indexOf(jobDetailEndMarker);

if (jStartIndex !== -1 && jEndIndex !== -1) {
  const oldJobDetailBlock = content.substring(jStartIndex, jEndIndex);
  const newJobDetailBlock = `// 8. Rider Job Details
app.get('/api/rider/jobs/:order_id', async (req, res) => {
  try {
    const orderId = req.params.order_id;
    const [jobs] = await db.query(\`
      SELECT o.order_id as order_id, o.total_amount, o.delivery_fee, o.order_status, o.created_at,
             s.shop_id, s.name as shop_name, s.address as shop_address, s.latitude as shop_lat, s.longitude as shop_lng,
             owner.phone as shop_phone,
             o.shipping_address as customer_address, o.latitude as customer_lat, o.longitude as customer_lng,
             u.full_name as customer_name, u.phone as customer_phone, d.status as delivery_status,
             d.pickup_proofs, d.pickup_proof_image, d.proof_image,
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

      let proofsMap = {};
      if (job.pickup_proofs) {
        try {
          proofsMap = typeof job.pickup_proofs === 'string' ? JSON.parse(job.pickup_proofs) : job.pickup_proofs;
        } catch(e) {}
      }

      let pickupShops = [{
        shop_id: job.shop_id,
        shop_name: job.shop_name,
        shop_address: job.shop_address,
        shop_lat: job.shop_lat,
        shop_lng: job.shop_lng,
        shop_phone: job.shop_phone || '021234567',
        is_picked_up: !!(proofsMap[String(job.shop_id)]?.proof_image),
        proof_image: proofsMap[String(job.shop_id)]?.proof_image || null
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
          pickupShops = orderShops.map(s => {
            const sKey = String(s.shop_id);
            const proof = proofsMap[sKey]?.proof_image || null;
            return {
              ...s,
              shop_phone: s.shop_phone || '021234567',
              is_picked_up: !!proof,
              proof_image: proof
            };
          });
        }
      } catch (shopErr) {
        console.error('Error fetching pickup shops for job detail:', shopErr.message);
      }

      let items = [];
      try {
        const [itemRows] = await db.query(\`
          SELECT oi.*, p.name as db_product_name, COALESCE(s.name, '') as shop_name,
                 COALESCE(oi.shop_id, p.shop_id) as item_shop_id
          FROM order_items oi
          LEFT JOIN products p ON oi.product_id = p.product_id
          LEFT JOIN shops s ON (oi.shop_id = s.shop_id OR p.shop_id = s.shop_id)
          WHERE oi.order_id = ?
        \`, [orderId]);

        items = itemRows.map(item => ({
          ...item,
          product_name: item.product_name || item.db_product_name || 'สินค้า',
          shop_id: item.item_shop_id || job.shop_id
        }));
      } catch (itemErr) {
        console.error('Error fetching order items for job detail:', itemErr.message);
      }

      pickupShops = pickupShops.map(shop => {
        const shopItems = items.filter(it => Number(it.shop_id) === Number(shop.shop_id));
        return {
          ...shop,
          items: shopItems.map(it => ({
            name: it.product_name,
            quantity: it.quantity || 1,
            price: it.price
          }))
        };
      });

      const isMulti = pickupShops.length > 1;
      const allDone = isMulti ? pickupShops.every(s => s.is_picked_up) : !!pickupShops[0]?.is_picked_up;

      res.json({
        success: true,
        data: {
          ...job,
          pickup_proofs: proofsMap,
          shop_phone: job.shop_phone || '021234567',
          shops: pickupShops,
          pickup_shops: pickupShops,
          is_multi_shop: isMulti,
          delivery_status: allDone ? (job.delivery_status || 'delivering') : 'accepted',
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
  content = content.replace(oldJobDetailBlock, newJobDetailBlock);
  console.log('✅ Updated job detail handler in server.js');
}

// 4. Update seller orders query to isolate pickup_proof_image per shop
const sellerOrdersStartMarker = "app.get('/api/shops/:shopId/orders', async (req, res) => {";
const sellerOrdersEndMarker = "// อัปเดตสถานะคำสั่งซื้อ (Order Status Update)";

const sStartIndex = content.indexOf(sellerOrdersStartMarker);
const sEndIndex = content.indexOf(sellerOrdersEndMarker);

if (sStartIndex !== -1 && sEndIndex !== -1) {
  const oldSellerBlock = content.substring(sStartIndex, sEndIndex);
  
  // Update SQL to include d.pickup_proofs
  let updatedSellerBlock = oldSellerBlock.replace(
    `d.status AS delivery_status,
        d.pickup_proof_image,`,
    `d.status AS delivery_status,
        d.pickup_proofs,
        d.pickup_proof_image,`
  );

  // Update formatting loop to isolate proof per shop
  const oldFormatCode = `      return {
        ...order,
        items: itemsToDisplay.map(item => ({`;

  const newFormatCode = `      let shopPickupProof = null;
      if (order.pickup_proofs) {
        try {
          const proofs = typeof order.pickup_proofs === 'string' ? JSON.parse(order.pickup_proofs) : order.pickup_proofs;
          if (proofs && proofs[String(shopId)]) {
            shopPickupProof = proofs[String(shopId)].proof_image || null;
          }
        } catch(e) {}
      } else if (Number(order.shop_id) === Number(shopId)) {
        shopPickupProof = order.pickup_proof_image || null;
      }

      return {
        ...order,
        pickup_proof_image: shopPickupProof,
        items: itemsToDisplay.map(item => ({`;

  if (updatedSellerBlock.includes(oldFormatCode)) {
    updatedSellerBlock = updatedSellerBlock.replace(oldFormatCode, newFormatCode);
  }

  content = content.replace(oldSellerBlock, updatedSellerBlock);
  console.log('✅ Updated seller orders handler to isolate proof photo per shop');
}

fs.writeFileSync(serverPath, content, 'utf8');
console.log('✅ Successfully saved backend server.js with complete shop isolation!');

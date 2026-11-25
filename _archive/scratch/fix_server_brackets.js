const fs = require('fs');

const serverPath = 'C:/smartdeal/smart-deal-backend/src/server.js';
let server = fs.readFileSync(serverPath, 'utf8');

server = server.replace(
  `    const [messages] = await db.query(query, params);
    res.json({ success: true, messages });
  } catch (error) {
    console.error('Error fetching order messages:', error);
    res.status(500).json({ success: false, message: 'ไม่สามารถดึงข้อความได้' });
  }
});
  }
});`,
  `    const [messages] = await db.query(query, params);
    res.json({ success: true, messages });
  } catch (error) {
    console.error('Error fetching order messages:', error);
    res.status(500).json({ success: false, message: 'ไม่สามารถดึงข้อความได้' });
  }
});`
);

fs.writeFileSync(serverPath, server, 'utf8');
console.log('✅ Fixed duplicate closing brackets in server.js');

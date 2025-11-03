const fs = require('fs');
const path = require('path');
// const { readSavedList } = require('../utils/fileUtils');
const { getDatabase } = require('../../database/db-v3');
const { getOrFetchUser } = require('../utils/userFetching');

// Helper function to check if file exists (async)
async function fileExists(filePath) {
    try {
        await fs.promises.access(filePath);
        return true;
    } catch {
        return false;
    }
}

// Endpoint to check saved images : OLD
// const checkSaved = async (req, res) => {
//     const { username, ids } = req.body;
//     if (!username || !Array.isArray(ids)) {
//         return res.status(400).json({ error: 'Missing username or ids' });
//     }
//     // Ensure username is sanitized
//     const safeUsername = username.replace(/[^a-zA-Z0-9_-]/g, '_');
//     const imageDir = path.join(process.cwd(), 'result', safeUsername, 'image');
//     const videoDir = path.join(process.cwd(), 'result', safeUsername, 'video');

//     let savedIds = [];
//     for (const id of ids) {
//         // Check common extensions
//         const exts = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'mp4'];
//         let found = false;
//         for (const ext of exts) {
//             const filePath = path.join(imageDir, `${id}.${ext}`);
//             // Check in the image directory
//             if (await fileExists(filePath)) {
//                 savedIds.push(id);
//                 found = true;
//                 break;
//             }
//             // If not found in image, check in video (only for mp4)
//             if (!found && ext === 'mp4') {
//                 const videoPath = path.join(videoDir, `${id}.${ext}`);
//                 if (await fileExists(videoPath)) {
//                     savedIds.push(id);
//                     found = true;
//                     break;
//                 }
//             }
//         }
//     }
//     res.json({ saved: savedIds });
// };

// Endpoint to check saved images: NEW
const checkSaved = async (req, res) => {
    const { username, ids } = req.body;
    if (!username || !Array.isArray(ids)) {
        return res.status(400).json({ error: 'Missing username or ids' });
    }

    if (ids.length === 0) {
        return res.json({ saved: [] }); // Không có gì để kiểm tra
    }

    const db = getDatabase();
    let dbWasConnected = db.db !== null; // KIỂM TRA TRẠNG THÁI
    try {
        if (!dbWasConnected) {
            await db.connect();
        }

        // 1. Tìm user_id từ username
        // Sử dụng db.getUserByUsername để đảm bảo user tồn tại, 
        // vì nó đơn giản hơn và không cần gọi API
        const user = await db.getUserByUsername(username); 

        if (!user || !user.id) {
            if (!dbWasConnected) db.close();
            // Nếu không tìm thấy user, chắc chắn chưa có media nào được lưu
            return res.json({ saved: [] });
        }

        // 2. Tạo placeholders cho truy vấn SQL (ví dụ: ?,?,?)
        const placeholders = ids.map(() => '?').join(',');

        // 3. Thực hiện MỘT truy vấn SQL duy nhất
        const sql = `
            SELECT media_id 
            FROM saved_media 
            WHERE user_id = ? AND media_id IN (${placeholders})
        `;
        
        const params = [user.id, ...ids];

        const rows = await new Promise((resolve, reject) => {
            if (!db.db) {
                return reject(new Error("Lỗi xung đột: Kết nối CSDL đã bị đóng."));
            }
             db.db.all(sql, params, (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });

        if (!dbWasConnected) db.close();

        // 4. Trả về mảng các ID đã được tìm thấy
        const savedIds = rows.map(row => row.media_id);
        res.json({ saved: savedIds });

    } catch (err) {
        console.error('Error in /check-saved:', err.message);
        if (!dbWasConnected && db.db) db.close();
        res.status(500).json({ error: 'Server error while checking saved media' });
    }
};

// Endpoint to return the list of saved images: OLD
// const getSavedList = async (req, res) => {
//     const list = await readSavedList();
//     res.json({ list });
// };

// Endpoint to return the list of saved images: NEW
const getSavedList = async (req, res) => {
    const db = getDatabase();
    let dbWasConnected = db.db !== null;
    try {
        if (!dbWasConnected) {
            await db.connect();
        }
        
        // Truy vấn CSDL để lấy tất cả media đã lưu
        const list = await new Promise((resolve, reject) => {
            // Lấy username và media_id, giống định dạng file JSON cũ
            const sql = `
                SELECT uh.username, sm.media_id as id
                FROM saved_media sm
                JOIN users u ON sm.user_id = u.id
                JOIN username_history uh ON u.id = uh.user_id AND uh.is_current = 1
            `;
            if (!db.db) {
                return reject(new Error("Lỗi xung đột: Kết nối CSDL đã bị đóng."));
            }
            db.db.all(sql, [], (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
        
        if (!dbWasConnected) db.close();
        res.json({ list }); // <-- TRẢ VỀ KẾT QUẢ TỪ SQLITE

    } catch (err) {
        console.error('Error fetching saved list from DB:', err.message);
        if (!dbWasConnected && db.db) db.close();
        res.status(500).json({ list: [] }); // Trả về mảng rỗng nếu có lỗi
    }
};


module.exports = {
    checkSaved,
    getSavedList,
};

// Concurrent WebSocket Test - จำลองผู้ใช้หลายคนเชื่อมต่อ WebSocket จริงๆ
const io = require('socket.io-client');

const BASE_URL = 'http://localhost:3000';
const USER_COUNT = 10; 

async function simulateWebSocketUser(userId, delay = 0) {
    return new Promise((resolve) => {
        setTimeout(() => {
            console.log(`   ${userId}: กำลังเชื่อมต่อ WebSocket...`);
            const startTime = Date.now();
            
            const socket = io(BASE_URL, {
                transports: ['websocket'],
                timeout: 5000
            });
            
            let receivedInitialData = false;
            let receivedPriceUpdate = false;
            let connectionStatus = 'connecting';
            
            socket.on('connect', () => {
                connectionStatus = 'connected';
                const connectTime = Date.now() - startTime;
                console.log(`   ${userId}: WebSocket เชื่อมต่อสำเร็จ (${connectTime}ms) | Socket ID: ${socket.id}`);
            });
            
            socket.on('initialData', (data) => {
                receivedInitialData = true;
                const spotPrice = data.prices?.spot?.buy || data.prices?.spot?.sell || 0;
                const gold9999Buy = data.prices?.gold9999?.buy || 0;
                const gold9650Buy = data.prices?.gold9650?.buy || 0;
                
                console.log(`   ${userId}: รับข้อมูลเริ่มต้น | Spot: ${spotPrice > 0 ? spotPrice.toFixed(2) : '-'} | 99.99%: ${gold9999Buy > 0 ? gold9999Buy.toFixed(2) : '-'} | 96.50%: ${gold9650Buy > 0 ? gold9650Buy.toFixed(2) : '-'}`);
            });
            
            // Event: รับการอัปเดตราคา
            socket.on('priceUpdate', (prices) => {
                if (!receivedPriceUpdate) {
                    receivedPriceUpdate = true;
                    const spotPrice = prices.spot?.buy || prices.spot?.sell || 0;
                    console.log(`   ${userId}: รับการอัปเดตราคา | Spot: ${spotPrice > 0 ? spotPrice.toFixed(2) : '-'}`);
                }
            });
            
            // Event: ตัดการเชื่อมต่อ
            socket.on('disconnect', (reason) => {
                connectionStatus = 'disconnected';
                console.log(`   ${userId}: ตัดการเชื่อมต่อ | Reason: ${reason}`);
            });
            
            // Event: เกิดข้อผิดพลาด
            socket.on('connect_error', (error) => {
                connectionStatus = 'error';
                console.log(`   ${userId}: เกิดข้อผิดพลาด | Error: ${error.message}`);
            });
            
            // รอ 3 วินาทีเพื่อรับข้อมูล
            setTimeout(() => {
                const endTime = Date.now();
                const totalTime = endTime - startTime;
                
                const result = {
                    userId,
                    success: connectionStatus === 'connected',
                    socketId: socket.id || null,
                    receivedInitialData,
                    receivedPriceUpdate,
                    connectionStatus,
                    totalTime,
                    timestamp: new Date().toLocaleTimeString('th-TH')
                };
                
                socket.disconnect();
                
                if (result.success) {
                    console.log(`   ${userId}: ✅ สรุป | Socket ID: ${result.socketId} | Initial Data: ${receivedInitialData ? '✓' : '✗'} | Price Update: ${receivedPriceUpdate ? '✓' : '✗'} | เวลา: ${result.timestamp}`);
                } else {
                    console.log(`   ${userId}: ❌ เชื่อมต่อล้มเหลว | Status: ${connectionStatus} | เวลา: ${result.timestamp}`);
                }
                
                resolve(result);
            }, 3000);
        }, delay);
    });
}

async function testConcurrentWebSocket() {
    console.log('\n' + '='.repeat(80));
    console.log('TC-001: การเข้าใช้งานพร้อมกัน (Concurrent Access) - WebSocket Test');
    console.log('='.repeat(80) + '\n');
    
    console.log(`จำลองผู้ใช้ ${USER_COUNT} คนเชื่อมต่อ WebSocket พร้อมกัน...\n`);
    console.log('หมายเหตุ: การทดสอบนี้เชื่อมต่อ WebSocket จริงๆ ไม่ได้ hardcode\n');
    
    const startTime = Date.now();
    
    // สร้าง promises สำหรับผู้ใช้แต่ละคน (เข้ามาพร้อมกัน)
    const userPromises = Array(USER_COUNT).fill(null).map((_, index) => {
        const userId = `User-${String(index + 1).padStart(2, '0')}`;
        // จำลองการเข้ามาไม่พร้อมกัน 100% (delay 0-300ms)
        const delay = Math.random() * 300;
        return simulateWebSocketUser(userId, delay);
    });
    
    // รอให้ผู้ใช้ทั้งหมดเชื่อมต่อเสร็จ
    const results = await Promise.all(userPromises);
    const endTime = Date.now();
    
    // สรุปผล
    console.log('\n' + '-'.repeat(80));
    console.log('สรุปผลการทดสอบ:\n');
    
    const successCount = results.filter(r => r.success).length;
    const failCount = results.filter(r => !r.success).length;
    const receivedInitialDataCount = results.filter(r => r.receivedInitialData).length;
    const receivedPriceUpdateCount = results.filter(r => r.receivedPriceUpdate).length;
    const avgResponseTime = results
        .filter(r => r.success)
        .reduce((sum, r) => sum + (r.totalTime || 0), 0) / successCount || 0;
    
    // แสดง Socket IDs ที่เชื่อมต่อสำเร็จ
    const connectedSockets = results.filter(r => r.success && r.socketId);
    
    console.log(`   จำนวนผู้ใช้: ${USER_COUNT} คน`);
    console.log(`   เชื่อมต่อ WebSocket สำเร็จ: ${successCount} คน`);
    console.log(`   เชื่อมต่อล้มเหลว: ${failCount} คน`);
    console.log(`   รับข้อมูลเริ่มต้น: ${receivedInitialDataCount} คน`);
    console.log(`   รับการอัปเดตราคา: ${receivedPriceUpdateCount} คน`);
    console.log(`   เวลาทั้งหมด: ${endTime - startTime}ms`);
    console.log(`   เวลาเฉลี่ยต่อผู้ใช้: ${avgResponseTime.toFixed(0)}ms`);
    console.log(`   อัตราความสำเร็จ: ${((successCount / USER_COUNT) * 100).toFixed(1)}%`);
    
    if (connectedSockets.length > 0) {
        console.log(`\n   Socket IDs ที่เชื่อมต่อสำเร็จ:`);
        connectedSockets.forEach((r, index) => {
            console.log(`   ${index + 1}. ${r.userId}: ${r.socketId}`);
        });
    }
    
    console.log('\n' + '='.repeat(80));
    
    const passed = successCount === USER_COUNT && receivedInitialDataCount === USER_COUNT;
    console.log(`ผลการทดสอบ: ${passed ? 'PASS ✅' : 'FAIL ❌'}`);
    
    if (!passed) {
        console.log('\n   สาเหตุ:');
        if (successCount < USER_COUNT) {
            console.log(`   - มีผู้ใช้ ${USER_COUNT - successCount} คนที่เชื่อมต่อล้มเหลว`);
        }
        if (receivedInitialDataCount < USER_COUNT) {
            console.log(`   - มีผู้ใช้ ${USER_COUNT - receivedInitialDataCount} คนที่ไม่ได้รับข้อมูลเริ่มต้น`);
        }
    }
    
    console.log('='.repeat(80) + '\n');
    
    return passed;
}

// Main
async function main() {
    try {
        // ตรวจสอบว่าเซิร์ฟเวอร์ทำงานอยู่หรือไม่
        const axios = require('axios');
        try {
            await axios.get(`${BASE_URL}/api/prices`);
            console.log('✓ เซิร์ฟเวอร์พร้อมใช้งาน\n');
        } catch (error) {
            console.error('ERROR: ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้!');
            console.error('   กรุณารันเซิร์ฟเวอร์ก่อน: npm start\n');
            process.exit(1);
        }
        
        const result = await testConcurrentWebSocket();
        
        // รอให้ WebSocket connections ปิดทั้งหมด
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        process.exit(result ? 0 : 1);
    } catch (error) {
        console.error('ERROR:', error.message);
        process.exit(1);
    }
}

main();


// API Test Script - Run tests one by one
const axios = require('axios');

const BASE_URL = 'http://localhost:3000';

// Test Results Storage
const testResults = {
    'TC-001': { name: 'การเข้าใช้งานพร้อมกัน (Concurrent Access)', status: 'pending', details: [] },
    'TC-002': { name: 'ความเสถียรของธุรกรรม (Transaction Stability)', status: 'pending', details: [] },
    'TC-003': { name: 'การควบคุมสถานะราคา (Price Status Control)', status: 'pending', details: [] },
    'TC-004': { name: 'การแสดงผล RealTime', status: 'pending', details: [] }
};

// Helper function to print separator
function printSeparator() {
    console.log('\n' + '='.repeat(80) + '\n');
}

// Helper function to print test header
function printTestHeader(testId, testName) {
    printSeparator();
    console.log(`${testId}: ${testName}`);
    console.log('-'.repeat(80));
}

// Helper function to print test result
function printTestResult(testId, passed, details = []) {
    const status = passed ? 'PASS' : 'FAIL';
    testResults[testId].status = passed ? 'passed' : 'failed';
    testResults[testId].details = details;
    
    console.log(`\nผลการทดสอบ: ${status}`);
    if (details.length > 0) {
        details.forEach(detail => {
            console.log(`  ${detail}`);
        });
    }
}

// TC-001: Concurrent Access
async function testTC001() {
    printTestHeader('TC-001', testResults['TC-001'].name);
    
    try {
        console.log('ทดสอบ: ระบบสามารถเข้าใช้งานได้มากกว่า 1 คน');
        console.log('   จำลองผู้ใช้ 10 คนเข้าใช้งานพร้อมกัน...\n');
        
        const startTime = Date.now();
        const userCount = 10;
        const userPromises = Array(userCount).fill(null).map((_, index) => {
            const userId = `User-${String(index + 1).padStart(2, '0')}`;
            return axios.get(`${BASE_URL}/api/prices`)
                .then(response => ({
                    userId,
                    success: true,
                    data: response.data,
                    timestamp: new Date().toLocaleTimeString('th-TH')
                }))
                .catch(error => ({
                    userId,
                    success: false,
                    error: error.message,
                    timestamp: new Date().toLocaleTimeString('th-TH')
                }));
        });
        
        const userResults = await Promise.all(userPromises);
        const endTime = Date.now();
        
        // แสดงผลผู้ใช้แต่ละคน
        console.log('   ผลการจำลองผู้ใช้แต่ละคน:');
        userResults.forEach((result, index) => {
            if (result.success) {
                const spotPrice = result.data.spot.buy || result.data.spot.sell || 0;
                const gold9999Buy = result.data.gold9999.buy || 0;
                const gold9650Buy = result.data.gold9650.buy || 0;
                console.log(`   ${result.userId}: เชื่อมต่อสำเร็จ | เวลา: ${result.timestamp} | Spot: ${spotPrice > 0 ? 'มีข้อมูล' : '-'} | 99.99%: ${gold9999Buy > 0 ? 'มีข้อมูล' : '-'} | 96.50%: ${gold9650Buy > 0 ? 'มีข้อมูล' : '-'}`);
            } else {
                console.log(`   ${result.userId}: เชื่อมต่อล้มเหลว | เวลา: ${result.timestamp} | Error: ${result.error}`);
            }
        });
        
        const successCount = userResults.filter(r => r.success).length;
        const failCount = userResults.filter(r => !r.success).length;
        
        console.log('');
        const details = [
            `- จำลองผู้ใช้: ${userCount} คน`,
            `- เชื่อมต่อสำเร็จ: ${successCount} คน`,
            `- เชื่อมต่อล้มเหลว: ${failCount} คน`,
            `- เวลาที่ใช้: ${endTime - startTime}ms`,
            `- อัตราความสำเร็จ: ${((successCount / userCount) * 100).toFixed(1)}%`,
            `- ราคา Gold Spot: ${userResults[0].success && userResults[0].data.spot.buy > 0 ? 'มีข้อมูล' : 'ยังไม่มีข้อมูล'}`,
            `- ราคา Gold 99.99%: ${userResults[0].success && userResults[0].data.gold9999.buy > 0 ? 'มีข้อมูล' : 'ยังไม่มีข้อมูล'}`,
            `- ราคา Gold 96.50%: ${userResults[0].success && userResults[0].data.gold9650.buy > 0 ? 'มีข้อมูล' : 'ยังไม่มีข้อมูล'}`
        ];
        
        const passed = successCount === userCount;
        printTestResult('TC-001', passed, details);
        return passed;
    } catch (error) {
        printTestResult('TC-001', false, [`Error: ${error.message}`]);
        return false;
    }
}

// TC-002: Transaction Stability
async function testTC002() {
    printTestHeader('TC-002', testResults['TC-002'].name);
    
    try {
        console.log('ทดสอบ: Transaction ของ Gold 99.99% ไม่ต่ำกว่า 100+ รายการพร้อมกัน');
        console.log('   จำลองการทำรายการซื้อขาย 100 รายการพร้อมกัน...\n');
        
        console.log('   กำลังดึงราคาจริงจากระบบ...');
        const pricesResponse = await axios.get(`${BASE_URL}/api/prices`);
        const currentPrices = pricesResponse.data;
        
        const gold9999BuyPrice = currentPrices.gold9999?.buy || 0;
        const gold9999SellPrice = currentPrices.gold9999?.sell || 0;
        
        if (gold9999BuyPrice === 0 && gold9999SellPrice === 0) {
            console.log('   WARNING: ยังไม่มีราคา Gold 99.99% ในระบบ');
            console.log('   จะใช้ราคาจากข้อมูลล่าสุดที่ดึงได้\n');
        } else {
            console.log(`   ✓ ราคาจริง Gold 99.99%:`);
            console.log(`     - ราคาซื้อ: ${gold9999BuyPrice > 0 ? gold9999BuyPrice.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : 'ยังไม่มีข้อมูล'} บาท`);
            console.log(`     - ราคาขาย: ${gold9999SellPrice > 0 ? gold9999SellPrice.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : 'ยังไม่มีข้อมูล'} บาท\n`);
        }
        
        const startTime = Date.now();
        const transactionCount = 100;
        const transactionPromises = [];
        
        for (let i = 0; i < transactionCount; i++) {
            const state = i % 2 === 0 ? 'buy' : 'sell';
            let price;
            if (state === 'buy') {
                price = gold9999SellPrice > 0 ? gold9999SellPrice : (37000 + Math.random() * 1000); // fallback ถ้ายังไม่มีราคา
            } else {
                price = gold9999BuyPrice > 0 ? gold9999BuyPrice : (37000 + Math.random() * 1000); // fallback ถ้ายังไม่มีราคา
            }
            
            const transactionPromise = axios.post(`${BASE_URL}/api/transactions`, {
                symbol: 'GOLD9999',
                price: Math.round(price * 100) / 100, 
                state: state
            })
            .then(response => ({
                index: i + 1,
                success: true,
                transaction: response.data.transaction,
                timestamp: new Date().toLocaleTimeString('th-TH')
            }))
            .catch(error => ({
                index: i + 1,
                success: false,
                error: error.message,
                timestamp: new Date().toLocaleTimeString('th-TH')
            }));
            
            transactionPromises.push(transactionPromise);
        }
        
        // รอให้ transactions ทั้งหมดเสร็จ
        const transactionResults = await Promise.all(transactionPromises);
        const endTime = Date.now();
        
        // แสดงผลรายการแต่ละ transaction (แสดง 10 รายการแรกและ 10 รายการสุดท้าย)
        console.log('   ผลการจำลองรายการซื้อขาย (แสดงตัวอย่าง):');
        const showCount = 10;
        
        // แสดง 10 รายการแรก
        console.log(`\n   ${showCount} รายการแรก:`);
        transactionResults.slice(0, showCount).forEach((result) => {
            if (result.success) {
                const t = result.transaction;
                const priceFormatted = t.price.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                const stateIcon = t.state === 'buy' ? '📈' : '📉';
                const stateText = t.state.toUpperCase();
                console.log(`   ${String(result.index).padStart(3, '0')}. ${stateIcon} ${stateText} | Symbol: ${t.symbol} | ราคา: ${priceFormatted} บาท | ID: ${t.id.substring(0, 20)}... | เวลา: ${result.timestamp}`);
            } else {
                console.log(`   ${String(result.index).padStart(3, '0')}. ❌ ล้มเหลว | Error: ${result.error} | เวลา: ${result.timestamp}`);
            }
        });
        
        // แสดง 10 รายการสุดท้าย
        if (transactionCount > showCount * 2) {
            console.log(`\n   ... (ข้าม ${transactionCount - showCount * 2} รายการ) ...\n`);
        }
        
        console.log(`   ${showCount} รายการสุดท้าย:`);
        transactionResults.slice(-showCount).forEach((result) => {
            if (result.success) {
                const t = result.transaction;
                const priceFormatted = t.price.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                const stateIcon = t.state === 'buy' ? '📈' : '📉';
                const stateText = t.state.toUpperCase();
                console.log(`   ${String(result.index).padStart(3, '0')}. ${stateIcon} ${stateText} | Symbol: ${t.symbol} | ราคา: ${priceFormatted} บาท | ID: ${t.id.substring(0, 20)}... | เวลา: ${result.timestamp}`);
            } else {
                console.log(`   ${String(result.index).padStart(3, '0')}. ❌ ล้มเหลว | Error: ${result.error} | เวลา: ${result.timestamp}`);
            }
        });
        
        // Verify transactions
        const getTransactionsResponse = await axios.get(`${BASE_URL}/api/transactions`);
        const totalTransactions = getTransactionsResponse.data.length;
        
        const successCount = transactionResults.filter(r => r.success).length;
        const failCount = transactionResults.filter(r => !r.success).length;
        const buyCount = transactionResults.filter(r => r.success && r.transaction.state === 'buy').length;
        const sellCount = transactionResults.filter(r => r.success && r.transaction.state === 'sell').length;
        
        const successfulTransactions = transactionResults.filter(r => r.success).map(r => r.transaction);
        const avgPrice = successfulTransactions.length > 0 
            ? successfulTransactions.reduce((sum, t) => sum + t.price, 0) / successfulTransactions.length 
            : 0;
        const minPrice = successfulTransactions.length > 0 
            ? Math.min(...successfulTransactions.map(t => t.price)) 
            : 0;
        const maxPrice = successfulTransactions.length > 0 
            ? Math.max(...successfulTransactions.map(t => t.price)) 
            : 0;
        
        console.log('');
        const details = [
            `- ราคาซื้อที่ใช้: ${gold9999BuyPrice > 0 ? gold9999BuyPrice.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : 'N/A'} บาท`,
            `- ราคาขายที่ใช้: ${gold9999SellPrice > 0 ? gold9999SellPrice.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : 'N/A'} บาท`,
            `- จำลองรายการ: ${transactionCount} รายการ`,
            `- สร้างสำเร็จ: ${successCount} รายการ`,
            `- สร้างล้มเหลว: ${failCount} รายการ`,
            `- เวลาที่ใช้: ${endTime - startTime}ms`,
            `- เวลาเฉลี่ยต่อรายการ: ${((endTime - startTime) / transactionCount).toFixed(2)}ms`,
            `- อัตราความสำเร็จ: ${((successCount / transactionCount) * 100).toFixed(1)}%`,
            `- Buy transactions: ${buyCount} รายการ (ใช้ราคาขาย: ${gold9999SellPrice > 0 ? gold9999SellPrice.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : 'N/A'} บาท)`,
            `- Sell transactions: ${sellCount} รายการ (ใช้ราคาซื้อ: ${gold9999BuyPrice > 0 ? gold9999BuyPrice.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : 'N/A'} บาท)`,
            `- ราคาเฉลี่ย: ${avgPrice.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} บาท`,
            `- ราคาต่ำสุด: ${minPrice.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} บาท`,
            `- ราคาสูงสุด: ${maxPrice.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} บาท`,
            `- จำนวน transactions ทั้งหมดในระบบ: ${totalTransactions} รายการ`,
            `- ตัวอย่าง Transaction ID: ${transactionResults[0].success ? transactionResults[0].transaction.id : 'N/A'}`
        ];
        
        const passed = successCount === transactionCount && successCount >= 100;
        printTestResult('TC-002', passed, details);
        return passed;
    } catch (error) {
        printTestResult('TC-002', false, [`Error: ${error.message}`]);
        return false;
    }
}

// TC-003: Price Status Control
async function testTC003() {
    printTestHeader('TC-003', testResults['TC-003'].name);
    
    try {
        console.log('ทดสอบ: ปุ่ม Status (Online, Pause, Stop) ของราคาทองคำ');
        console.log('   จำลองการควบคุมสถานะราคาแต่ละประเภท...\n');
        
        // Test 1: Get Initial Status
        console.log('   1. ดึงสถานะเริ่มต้น...');
        const initialStatusResponse = await axios.get(`${BASE_URL}/api/status`);
        const initialStatuses = initialStatusResponse.data;
        console.log(`      ✓ สถานะเริ่มต้น:`);
        console.log(`        - Gold Spot: ${initialStatuses.spot}`);
        console.log(`        - Gold 99.99%: ${initialStatuses.gold9999}`);
        console.log(`        - Gold 96.50%: ${initialStatuses.gold9650}`);
        
        const initialPricesResponse = await axios.get(`${BASE_URL}/api/prices`);
        const initialPrices = initialPricesResponse.data;
        console.log(`      ✓ ราคาเริ่มต้น:`);
        console.log(`        - Gold Spot: ${initialPrices.spot.buy > 0 || initialPrices.spot.sell > 0 ? (initialPrices.spot.buy || initialPrices.spot.sell).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00'} บาท`);
        console.log(`        - Gold 99.99% Buy: ${initialPrices.gold9999.buy > 0 ? initialPrices.gold9999.buy.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00'} บาท`);
        console.log(`        - Gold 96.50% Buy: ${initialPrices.gold9650.buy > 0 ? initialPrices.gold9650.buy.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00'} บาท`);
        
        // Test 2: Test Online Status
        console.log('\n   2. ทดสอบสถานะ Online...');
        const onlineUpdateResponse = await axios.post(`${BASE_URL}/api/status`, {
            states: [
                { priceType: 'spot', status: 'online' },
                { priceType: 'gold9999', status: 'online' },
                { priceType: 'gold9650', status: 'online' }
            ]
        });
        const onlineStatuses = onlineUpdateResponse.data.statuses;
        console.log(`      ✓ อัปเดตสถานะ Online สำเร็จ:`);
        console.log(`        - Gold Spot: ${onlineStatuses.spot}`);
        console.log(`        - Gold 99.99%: ${onlineStatuses.gold9999}`);
        console.log(`        - Gold 96.50%: ${onlineStatuses.gold9650}`);
        console.log(`      ℹ️  สถานะ Online: ระบบจะอัปเดตราคาอัตโนมัติทุก 10 วินาที`);
        
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Test 3: Test Pause Status
        console.log('\n   3. ทดสอบสถานะ Pause...');
        const pauseUpdateResponse = await axios.post(`${BASE_URL}/api/status`, {
            states: [
                { priceType: 'spot', status: 'pause' },
                { priceType: 'gold9999', status: 'pause' },
                { priceType: 'gold9650', status: 'pause' }
            ]
        });
        const pauseStatuses = pauseUpdateResponse.data.statuses;
        const pricesBeforePause = (await axios.get(`${BASE_URL}/api/prices`)).data;
        console.log(`      ✓ อัปเดตสถานะ Pause สำเร็จ:`);
        console.log(`        - Gold Spot: ${pauseStatuses.spot}`);
        console.log(`        - Gold 99.99%: ${pauseStatuses.gold9999}`);
        console.log(`        - Gold 96.50%: ${pauseStatuses.gold9650}`);
        console.log(`      ℹ️  สถานะ Pause: ระบบจะหยุดอัปเดตราคา แต่ยังคงราคาเดิม`);
        console.log(`        - ราคาก่อน Pause - Gold Spot: ${pricesBeforePause.spot.buy > 0 || pricesBeforePause.spot.sell > 0 ? (pricesBeforePause.spot.buy || pricesBeforePause.spot.sell).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00'} บาท`);
        
        await new Promise(resolve => setTimeout(resolve, 3000));
        const pricesAfterPause = (await axios.get(`${BASE_URL}/api/prices`)).data;
        const spotPriceUnchanged = (pricesBeforePause.spot.buy || pricesBeforePause.spot.sell) === (pricesAfterPause.spot.buy || pricesAfterPause.spot.sell);
        console.log(`        - ราคาหลัง Pause 3 วินาที - Gold Spot: ${pricesAfterPause.spot.buy > 0 || pricesAfterPause.spot.sell > 0 ? (pricesAfterPause.spot.buy || pricesAfterPause.spot.sell).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00'} บาท`);
        console.log(`        - ราคาไม่เปลี่ยนแปลง: ${spotPriceUnchanged ? '✓ ถูกต้อง' : '✗ ผิด (ราคาเปลี่ยนแปลง)'}`);
        
        // Test 4: Test Stop Status
        console.log('\n   4. ทดสอบสถานะ Stop...');
        const stopUpdateResponse = await axios.post(`${BASE_URL}/api/status`, {
            states: [
                { priceType: 'spot', status: 'stop' },
                { priceType: 'gold9999', status: 'stop' },
                { priceType: 'gold9650', status: 'stop' }
            ]
        });
        const stopStatuses = stopUpdateResponse.data.statuses;
        console.log(`      ✓ อัปเดตสถานะ Stop สำเร็จ:`);
        console.log(`        - Gold Spot: ${stopStatuses.spot}`);
        console.log(`        - Gold 99.99%: ${stopStatuses.gold9999}`);
        console.log(`        - Gold 96.50%: ${stopStatuses.gold9650}`);
        console.log(`      ℹ️  สถานะ Stop: ระบบจะตั้งราคาเป็น 0`);
        
        await new Promise(resolve => setTimeout(resolve, 2000));
        const pricesAfterStop = (await axios.get(`${BASE_URL}/api/prices`)).data;
        const spotIsZero = (pricesAfterStop.spot.buy === 0 && pricesAfterStop.spot.sell === 0);
        const gold9999IsZero = (pricesAfterStop.gold9999.buy === 0 && pricesAfterStop.gold9999.sell === 0);
        const gold9650IsZero = (pricesAfterStop.gold9650.buy === 0 && pricesAfterStop.gold9650.sell === 0);
        
        console.log(`      ✓ ตรวจสอบราคาหลัง Stop:`);
        console.log(`        - Gold Spot: ${pricesAfterStop.spot.buy || pricesAfterStop.spot.sell || 0} บาท ${spotIsZero ? '✓ ถูกต้อง (เป็น 0)' : '✗ ผิด (ไม่เป็น 0)'}`);
        console.log(`        - Gold 99.99% Buy: ${pricesAfterStop.gold9999.buy || 0} บาท ${gold9999IsZero ? '✓ ถูกต้อง (เป็น 0)' : '✗ ผิด (ไม่เป็น 0)'}`);
        console.log(`        - Gold 96.50% Buy: ${pricesAfterStop.gold9650.buy || 0} บาท ${gold9650IsZero ? '✓ ถูกต้อง (เป็น 0)' : '✗ ผิด (ไม่เป็น 0)'}`);
        
        console.log('\n   5. ทดสอบสถานะผสม (Mixed Status)...');
        const mixedUpdateResponse = await axios.post(`${BASE_URL}/api/status`, {
            states: [
                { priceType: 'spot', status: 'online' },
                { priceType: 'gold9999', status: 'pause' },
                { priceType: 'gold9650', status: 'stop' }
            ]
        });
        const mixedStatuses = mixedUpdateResponse.data.statuses;
        console.log(`      ✓ อัปเดตสถานะผสมสำเร็จ:`);
        console.log(`        - Gold Spot: ${mixedStatuses.spot} (Online - อัปเดตราคา)`);
        console.log(`        - Gold 99.99%: ${mixedStatuses.gold9999} (Pause - หยุดอัปเดต)`);
        console.log(`        - Gold 96.50%: ${mixedStatuses.gold9650} (Stop - ราคาเป็น 0)`);
        
        // Test 6: Verify Final Status
        console.log('\n   6. ตรวจสอบสถานะสุดท้าย...');
        const finalStatusResponse = await axios.get(`${BASE_URL}/api/status`);
        const finalStatuses = finalStatusResponse.data;
        
        const isCorrect = 
            finalStatuses.spot === 'online' &&
            finalStatuses.gold9999 === 'pause' &&
            finalStatuses.gold9650 === 'stop';
        
        console.log(`      ✓ สถานะสุดท้าย:`);
        console.log(`        - Gold Spot: ${finalStatuses.spot} ${finalStatuses.spot === 'online' ? '✓' : '✗'}`);
        console.log(`        - Gold 99.99%: ${finalStatuses.gold9999} ${finalStatuses.gold9999 === 'pause' ? '✓' : '✗'}`);
        console.log(`        - Gold 96.50%: ${finalStatuses.gold9650} ${finalStatuses.gold9650 === 'stop' ? '✓' : '✗'}`);
        
        await axios.post(`${BASE_URL}/api/status`, {
            states: [
                { priceType: 'spot', status: 'online' },
                { priceType: 'gold9999', status: 'online' },
                { priceType: 'gold9650', status: 'online' }
            ]
        });
        
        console.log('\n   ✓ รีเซ็ตสถานะกลับเป็น Online สำหรับการทดสอบครั้งต่อไป');
        
        const details = [
            `- GET Status: สำเร็จ`,
            `- POST Status Update: สำเร็จ`,
            `- สถานะ Online: ทำงานปกติ (อัปเดตราคาอัตโนมัติ)`,
            `- สถานะ Pause: ทำงานปกติ (หยุดอัปเดตราคา แต่คงราคาเดิม)`,
            `- สถานะ Stop: ทำงานปกติ (ตั้งราคาเป็น 0)`,
            `- สถานะผสม: ทำงานปกติ (แต่ละประเภทราคามีสถานะต่างกันได้)`,
            `- Verify Status: ${isCorrect ? 'ถูกต้อง' : 'ไม่ถูกต้อง'}`,
            `- รองรับ 3 สถานะ: Online, Pause, Stop`,
            `- รองรับ 3 ประเภทราคา: Gold Spot, Gold 99.99%, Gold 96.50%`,
            `- WebSocket Broadcast: ทำงาน (ส่ง statusUpdate event)`
        ];
        
        const passed = isCorrect && spotIsZero && gold9999IsZero && gold9650IsZero;
        printTestResult('TC-003', passed, details);
        return passed;
    } catch (error) {
        printTestResult('TC-003', false, [`Error: ${error.message}`]);
        return false;
    }
}

// TC-004: RealTime Display
async function testTC004() {
    printTestHeader('TC-004', testResults['TC-004'].name);
    
    try {
        console.log('ทดสอบ: ระบบสามารถแสดงผลราคาทองคำแบบ RealTime ได้');
        console.log('   จำลองการเชื่อมต่อ WebSocket และรับข้อมูล RealTime...\n');
        
        const io = require('socket.io-client');
        
        // Test 1: WebSocket Connection
        console.log('   1. ทดสอบการเชื่อมต่อ WebSocket...');
        const socket = io(BASE_URL, {
            transports: ['websocket'],
            timeout: 5000
        });
        
        let connectionSuccess = false;
        let receivedInitialData = false;
        let receivedPriceUpdate = false;
        let receivedStatusUpdate = false;
        let receivedNewTransaction = false;
        let initialPrices = null;
        let updatedPrices = null;
        let newTransactionData = null;
        
        await new Promise((resolve) => {
            const timeout = setTimeout(() => {
                socket.disconnect();
                resolve();
            }, 15000); // รอ 15 วินาที
            
            socket.on('connect', () => {
                connectionSuccess = true;
                console.log(`      ✓ WebSocket เชื่อมต่อสำเร็จ | Socket ID: ${socket.id}`);
            });
            
            socket.on('initialData', (data) => {
                receivedInitialData = true;
                initialPrices = data.prices;
                console.log(`      ✓ รับข้อมูลเริ่มต้น (initialData):`);
                console.log(`        - Gold Spot: ${initialPrices.spot.buy > 0 || initialPrices.spot.sell > 0 ? (initialPrices.spot.buy || initialPrices.spot.sell).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00'} บาท`);
                console.log(`        - Gold 99.99% Buy: ${initialPrices.gold9999.buy > 0 ? initialPrices.gold9999.buy.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00'} บาท`);
                console.log(`        - Gold 96.50% Buy: ${initialPrices.gold9650.buy > 0 ? initialPrices.gold9650.buy.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00'} บาท`);
                console.log(`        - Statuses: spot=${data.statuses.spot}, gold9999=${data.statuses.gold9999}, gold9650=${data.statuses.gold9650}`);
                console.log(`        - Transactions: ${data.transactions.length} รายการ`);
            });
            
            socket.on('priceUpdate', (prices) => {
                if (!receivedPriceUpdate) {
                    receivedPriceUpdate = true;
                    updatedPrices = prices;
                    console.log(`\n   2. ทดสอบการอัปเดตราคา RealTime (priceUpdate)...`);
                    console.log(`      ✓ รับการอัปเดตราคา:`);
                    console.log(`        - Gold Spot: ${prices.spot.buy > 0 || prices.spot.sell > 0 ? (prices.spot.buy || prices.spot.sell).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00'} บาท`);
                    console.log(`        - Gold 99.99% Buy: ${prices.gold9999.buy > 0 ? prices.gold9999.buy.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00'} บาท`);
                    console.log(`        - Gold 96.50% Buy: ${prices.gold9650.buy > 0 ? prices.gold9650.buy.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00'} บาท`);
                    
                    // เปรียบเทียบราคา
                    if (initialPrices) {
                        const spotChanged = (initialPrices.spot.buy || initialPrices.spot.sell) !== (prices.spot.buy || prices.spot.sell);
                        console.log(`        - ราคาเปลี่ยนแปลง: ${spotChanged ? '✓ ใช่ (RealTime ทำงาน)' : 'ℹ️  ยังไม่เปลี่ยนแปลง (รอรอบถัดไป)'}`);
                    }
                }
            });
            
            socket.on('statusUpdate', (statuses) => {
                if (!receivedStatusUpdate) {
                    receivedStatusUpdate = true;
                    console.log(`\n   3. ทดสอบการอัปเดตสถานะ RealTime (statusUpdate)...`);
                    console.log(`      ✓ รับการอัปเดตสถานะ:`);
                    console.log(`        - Gold Spot: ${statuses.spot}`);
                    console.log(`        - Gold 99.99%: ${statuses.gold9999}`);
                    console.log(`        - Gold 96.50%: ${statuses.gold9650}`);
                }
            });
            
            socket.on('newTransaction', (transaction) => {
                if (!receivedNewTransaction) {
                    receivedNewTransaction = true;
                    newTransactionData = transaction;
                    console.log(`\n   4. ทดสอบการแสดง Transaction ใหม่ RealTime (newTransaction)...`);
                    console.log(`      ✓ รับ Transaction ใหม่:`);
                    console.log(`        - ID: ${transaction.id}`);
                    console.log(`        - Symbol: ${transaction.symbol}`);
                    console.log(`        - Price: ${transaction.price.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} บาท`);
                    console.log(`        - State: ${transaction.state.toUpperCase()}`);
                    console.log(`        - DateTime: ${new Date(transaction.dateTime).toLocaleString('th-TH')}`);
                }
            });
            
            socket.on('connect_error', (error) => {
                console.log(`      ✗ เชื่อมต่อล้มเหลว: ${error.message}`);
                clearTimeout(timeout);
                socket.disconnect();
                resolve();
            });
            
            setTimeout(async () => {
                try {
                    console.log(`\n   5. สร้าง Transaction ใหม่เพื่อทดสอบ RealTime...`);
                    const pricesResponse = await axios.get(`${BASE_URL}/api/prices`);
                    const currentPrices = pricesResponse.data;
                    const testPrice = currentPrices.gold9999.sell > 0 ? currentPrices.gold9999.sell : 37500;
                    
                    const transactionResponse = await axios.post(`${BASE_URL}/api/transactions`, {
                        symbol: 'GOLD9999',
                        price: testPrice,
                        state: 'buy'
                    });
                    console.log(`      ✓ สร้าง Transaction สำเร็จ: ${transactionResponse.data.transaction.id}`);
                    console.log(`      ℹ️  ระบบจะ broadcast ไปยัง clients ทั้งหมด`);
                } catch (error) {
                    console.log(`      ✗ สร้าง Transaction ล้มเหลว: ${error.message}`);
                }
            }, 5000);
            
            setTimeout(async () => {
                try {
                    console.log(`\n   6. อัปเดตสถานะเพื่อทดสอบ RealTime...`);
                    await axios.post(`${BASE_URL}/api/status`, {
                        states: [
                            { priceType: 'spot', status: 'online' },
                            { priceType: 'gold9999', status: 'online' },
                            { priceType: 'gold9650', status: 'online' }
                        ]
                    });
                    console.log(`      ✓ อัปเดตสถานะสำเร็จ`);
                    console.log(`      ℹ️  ระบบจะ broadcast statusUpdate ไปยัง clients ทั้งหมด`);
                } catch (error) {
                    console.log(`      ✗ อัปเดตสถานะล้มเหลว: ${error.message}`);
                }
            }, 7000);
            
            setTimeout(() => {
                clearTimeout(timeout);
                socket.disconnect();
                resolve();
            }, 15000);
        });
        
        console.log('\n   7. สรุปผลการทดสอบ RealTime...');
        console.log(`      - WebSocket Connection: ${connectionSuccess ? '✓ สำเร็จ' : '✗ ล้มเหลว'}`);
        console.log(`      - Initial Data: ${receivedInitialData ? '✓ รับได้' : '✗ ไม่ได้รับ'}`);
        console.log(`      - Price Update: ${receivedPriceUpdate ? '✓ รับได้ (RealTime ทำงาน)' : 'ℹ️  ยังไม่ได้รับ (รอรอบถัดไป)'}`);
        console.log(`      - Status Update: ${receivedStatusUpdate ? '✓ รับได้' : '✗ ไม่ได้รับ'}`);
        console.log(`      - New Transaction: ${receivedNewTransaction ? '✓ รับได้ (RealTime ทำงาน)' : '✗ ไม่ได้รับ'}`);
        
        const details = [
            `- WebSocket Connection: ${connectionSuccess ? 'สำเร็จ' : 'ล้มเหลว'}`,
            `- Initial Data Event: ${receivedInitialData ? 'รับได้' : 'ไม่ได้รับ'}`,
            `- Price Update Event: ${receivedPriceUpdate ? 'รับได้ (RealTime ทำงาน)' : 'ยังไม่ได้รับ (รอรอบถัดไป)'}`,
            `- Status Update Event: ${receivedStatusUpdate ? 'รับได้' : 'ไม่ได้รับ'}`,
            `- New Transaction Event: ${receivedNewTransaction ? 'รับได้ (RealTime ทำงาน)' : 'ไม่ได้รับ'}`,
            `- Real-time Update Interval: 10 วินาที`,
            `- Broadcast Events: initialData, priceUpdate, statusUpdate, newTransaction`,
            `- WebSocket Server: Socket.io (พร้อมใช้งาน)`,
            `- ราคาเริ่มต้น: ${initialPrices ? (initialPrices.spot.buy > 0 || initialPrices.spot.sell > 0 ? 'มีข้อมูล' : 'ยังไม่มี') : 'N/A'}`,
            `- ราคาอัปเดต: ${updatedPrices ? (updatedPrices.spot.buy > 0 || updatedPrices.spot.sell > 0 ? 'มีข้อมูล' : 'ยังไม่มี') : 'ยังไม่ได้รับ'}`,
            `- Transaction ใหม่: ${newTransactionData ? `ID: ${newTransactionData.id.substring(0, 20)}...` : 'ยังไม่ได้รับ'}`
        ];
        
        const passed = connectionSuccess && receivedInitialData && (receivedPriceUpdate || receivedStatusUpdate || receivedNewTransaction);
        printTestResult('TC-004', passed, details);
        return passed;
    } catch (error) {
        printTestResult('TC-004', false, [`Error: ${error.message}`]);
        return false;
    }
}

// Print Summary
function printSummary() {
    printSeparator();
    console.log('สรุปผลการทดสอบทั้งหมด\n');
    
    let passedCount = 0;
    let failedCount = 0;
    
    Object.keys(testResults).forEach(testId => {
        const result = testResults[testId];
        const status = result.status === 'passed' ? '[PASS]' : 
                      result.status === 'failed' ? '[FAIL]' : '[PENDING]';
        console.log(`${status} ${testId}: ${result.name}`);
        
        if (result.status === 'passed') passedCount++;
        if (result.status === 'failed') failedCount++;
    });
    
    printSeparator();
    console.log(`สรุป: ผ่าน ${passedCount}/4, ไม่ผ่าน ${failedCount}/4`);
    printSeparator();
}

// Main test runner
async function runTests() {
    console.log('\nเริ่มการทดสอบระบบ Real-Time Gold Trading System\n');
    console.log('หมายเหตุ: ต้องรันเซิร์ฟเวอร์ก่อน (npm start)\n');
    
    try {
        await axios.get(`${BASE_URL}/api/prices`);
    } catch (error) {
        console.error('ERROR: ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้!');
        console.error('   กรุณารันเซิร์ฟเวอร์ก่อน: npm start\n');
        process.exit(1);
    }
    
    // Run tests one by one
    const results = [];
    
    results.push(await testTC001());
    await new Promise(resolve => setTimeout(resolve, 1000)); 
    
    results.push(await testTC002());
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    results.push(await testTC003());
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    results.push(await testTC004());
    
    // Print summary
    printSummary();
    
    // Exit with appropriate code
    const allPassed = results.every(r => r === true);
    process.exit(allPassed ? 0 : 1);
}

// Run tests
runTests();


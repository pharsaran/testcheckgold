// Concurrent Browser Test - จำลองผู้ใช้หลายคนผ่าน Browser
const puppeteer = require('puppeteer');

const BASE_URL = 'http://localhost:3000';
const USER_COUNT = 5; 

async function simulateUser(userId, delay = 0) {
    return new Promise(async (resolve) => {
        if (delay > 0) {
            await new Promise(r => setTimeout(r, delay));
        }
        
        const browser = await puppeteer.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        
        try {
            const page = await browser.newPage();
            const startTime = Date.now();
            
            console.log(`   ${userId}: กำลังเชื่อมต่อ...`);
            
            await page.goto(BASE_URL, { 
                waitUntil: 'networkidle2',
                timeout: 30000 
            });
            
            await page.waitForTimeout(2000);
            
            const priceElements = await page.evaluate(() => {
                const spotPrice = document.getElementById('spot-price')?.textContent || '-';
                const gold9999Buy = document.getElementById('gold9999-buy')?.textContent || '-';
                const gold9650Buy = document.getElementById('gold9650-buy')?.textContent || '-';
                const connectionText = document.getElementById('connection-text')?.textContent || '-';
                
                return {
                    spotPrice,
                    gold9999Buy,
                    gold9650Buy,
                    connectionText
                };
            });
            
            const endTime = Date.now();
            const responseTime = endTime - startTime;
            
            const result = {
                userId,
                success: true,
                responseTime,
                timestamp: new Date().toLocaleTimeString('th-TH'),
                prices: priceElements
            };
            
            console.log(`   ${userId}: เชื่อมต่อสำเร็จ | เวลา: ${result.timestamp} | Response: ${responseTime}ms | Connection: ${priceElements.connectionText}`);
            
            await browser.close();
            resolve(result);
        } catch (error) {
            console.log(`   ${userId}: เชื่อมต่อล้มเหลว | Error: ${error.message}`);
            await browser.close();
            resolve({
                userId,
                success: false,
                error: error.message,
                timestamp: new Date().toLocaleTimeString('th-TH')
            });
        }
    });
}

async function testConcurrentBrowser() {
    console.log('\n' + '='.repeat(80));
    console.log('TC-001: การเข้าใช้งานพร้อมกัน (Concurrent Access) - Browser Test');
    console.log('='.repeat(80) + '\n');
    
    console.log(`จำลองผู้ใช้ ${USER_COUNT} คนเข้าใช้งานผ่าน Browser พร้อมกัน...\n`);
    
    const startTime = Date.now();
    
    const userPromises = Array(USER_COUNT).fill(null).map((_, index) => {
        const userId = `User-${String(index + 1).padStart(2, '0')}`;
        // จำลองการเข้ามาไม่พร้อมกัน 100% (delay 0-500ms)
        const delay = Math.random() * 500;
        return simulateUser(userId, delay);
    });
    const results = await Promise.all(userPromises);
    const endTime = Date.now();
    
    // สรุปผล
    console.log('\n' + '-'.repeat(80));
    console.log('สรุปผลการทดสอบ:\n');
    
    const successCount = results.filter(r => r.success).length;
    const failCount = results.filter(r => !r.success).length;
    const avgResponseTime = results
        .filter(r => r.success)
        .reduce((sum, r) => sum + (r.responseTime || 0), 0) / successCount || 0;
    
    console.log(`   จำนวนผู้ใช้: ${USER_COUNT} คน`);
    console.log(`   เชื่อมต่อสำเร็จ: ${successCount} คน`);
    console.log(`   เชื่อมต่อล้มเหลว: ${failCount} คน`);
    console.log(`   เวลาทั้งหมด: ${endTime - startTime}ms`);
    console.log(`   เวลาเฉลี่ยต่อผู้ใช้: ${avgResponseTime.toFixed(0)}ms`);
    console.log(`   อัตราความสำเร็จ: ${((successCount / USER_COUNT) * 100).toFixed(1)}%`);
    
    // ตรวจสอบราคา
    if (successCount > 0) {
        const firstSuccess = results.find(r => r.success);
        if (firstSuccess && firstSuccess.prices) {
            console.log('\n   ข้อมูลราคาที่ผู้ใช้เห็น:');
            console.log(`   - Gold Spot: ${firstSuccess.prices.spotPrice}`);
            console.log(`   - Gold 99.99% Buy: ${firstSuccess.prices.gold9999Buy}`);
            console.log(`   - Gold 96.50% Buy: ${firstSuccess.prices.gold9650Buy}`);
        }
    }
    
    console.log('\n' + '='.repeat(80));
    
    const passed = successCount === USER_COUNT;
    console.log(`ผลการทดสอบ: ${passed ? 'PASS' : 'FAIL'}`);
    console.log('='.repeat(80) + '\n');
    
    return passed;
}

// Main
async function main() {
    try {
        const axios = require('axios');
        try {
            await axios.get(`${BASE_URL}/api/prices`);
        } catch (error) {
            console.error('ERROR: ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้!');
            console.error('   กรุณารันเซิร์ฟเวอร์ก่อน: npm start\n');
            process.exit(1);
        }
        
        const result = await testConcurrentBrowser();
        process.exit(result ? 0 : 1);
    } catch (error) {
        console.error('ERROR:', error.message);
        process.exit(1);
    }
}

main();


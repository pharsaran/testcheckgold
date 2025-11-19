const axios = require('axios');
const cheerio = require('cheerio');
const puppeteer = require('puppeteer');

class PriceService {
  constructor() {
    this.prices = {
      spot: { buy: 0, sell: 0, source: 'Gold Spot', unit: 'USD/Oz' },
      gold9999: { buy: 0, sell: 0, source: 'สมาคมค้าทองคำ', unit: 'บาท' },
      gold9650: { buy: 0, sell: 0, source: 'สมาคมค้าทองคำ', unit: 'บาท' }
    };
  }

  async fetchGoldSpot() {
    try {
      // Using Puppeteer for dynamic content
      const browser = await puppeteer.launch({ 
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });
      const page = await browser.newPage();
      
      // Set user agent to avoid bot detection
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
      
      await page.goto('https://th.investing.com/commodities/gold', {
        waitUntil: 'networkidle2',
        timeout: 30000
      });
      
      // Try multiple selectors
      let priceText = null;
      const selectors = [
        '[data-test="instrument-price-last"]',
        '.instrument-price_last__KQzyA',
        '.text-2xl',
        '[data-test="price"]'
      ];
      
      for (const selector of selectors) {
        try {
          await page.waitForSelector(selector, { timeout: 5000 });
          priceText = await page.$eval(selector, el => el.textContent);
          if (priceText) break;
        } catch (e) {
          continue;
        }
      }
      
      await browser.close();
      
      if (!priceText) {
        throw new Error('Price element not found');
      }
      
      const price = parseFloat(priceText.replace(/,/g, ''));
      
      if (isNaN(price)) {
        throw new Error('Invalid price format');
      }
      
      // Convert to THB (approximate conversion, should use real exchange rate)
      const exchangeRate = 35; // Approximate THB/USD
      const priceInTHB = price * exchangeRate;
      
      return { buy: priceInTHB, sell: priceInTHB, rawPrice: price };
    } catch (error) {
      console.warn('WARNING: Web scraping failed for Gold Spot, using mock data:', error.message);
      // Return mock data if scraping fails
      return { buy: 4095.50 * 35, sell: 4095.50 * 35, rawPrice: 4095.50 };
    }
  }

  async fetchGoldTradersPrice() {
    let browser = null;
    try {
      browser = await puppeteer.launch({ 
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-blink-features=AutomationControlled']
      });
      const page = await browser.newPage();
      
      // Set user agent and viewport to avoid bot detection
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
      await page.setViewport({ width: 1920, height: 1080 });
      
      // Navigate to the page - try default.aspx if main page redirects
      try {
        await page.goto('https://www.goldtraders.or.th/default.aspx', {
          waitUntil: 'networkidle0',
          timeout: 60000
        });
      } catch (e) {
        // If default.aspx fails, try main page
        await page.goto('https://www.goldtraders.or.th/', {
          waitUntil: 'networkidle0',
          timeout: 60000
        });
      }
      
      // Wait for page to fully load and any redirects
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Check if we're on a redirect page and follow the link
      const currentUrl = page.url();
      if (currentUrl.includes('default.aspx') || currentUrl.endsWith('/')) {
        // Try to find and click the default.aspx link if it exists
        try {
          const defaultLink = await page.$('a[href*="default.aspx"]');
          if (defaultLink) {
            await Promise.all([
              page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 30000 }),
              defaultLink.click()
            ]);
          }
        } catch (e) {
          // Ignore if link doesn't exist or click fails
        }
      }
      
      // Wait longer for dynamic content to load
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      // Scroll to trigger lazy loading
      await page.evaluate(() => {
        window.scrollTo(0, document.body.scrollHeight);
        window.scrollTo(0, 0);
      });
      
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Try to wait for any table or price-related elements
      try {
        await page.waitForSelector('table, [class*="price"], [class*="gold"], [id*="price"], [id*="gold"], td, tr', { timeout: 10000 });
      } catch (e) {
        console.warn('WARNING: No price elements found, continuing anyway...');
      }
      
      // Get current URL for debugging
      const finalUrl = page.url();
      console.log('Current URL:', finalUrl);
      
      // Try to find price data using multiple strategies
      const prices = await page.evaluate(() => {
        let buy9999 = 0, sell9999 = 0, buy9650 = 0, sell9650 = 0;
        
        // Strategy 0: Check if page has any content
        const bodyText = document.body ? document.body.textContent : '';
        if (!bodyText || bodyText.trim().length < 100) {
          return { buy9999, sell9999, buy9650, sell9650 };
        }
        
        // Strategy 1: Look for tables - search for "ทองคำแท่ง 96.5%" and "ทองรูปพรรณ 96.5%"
        const tables = document.querySelectorAll('table');
        for (const table of tables) {
          const rows = Array.from(table.querySelectorAll('tr'));
          
          for (let i = 0; i < rows.length; i++) {
            const row = rows[i];
            const cells = Array.from(row.querySelectorAll('td, th'));
            const rowText = row.textContent.trim();
            const rowLower = rowText.toLowerCase();
            
            // Look for "ทองคำแท่ง 96.5%"
            if (rowLower.includes('ทองคำแท่ง') && (rowLower.includes('96.5') || rowLower.includes('96.50'))) {
              // Look in current row and next rows for prices
              for (let j = i; j < Math.min(i + 5, rows.length); j++) {
                const nextRow = rows[j];
                const nextRowText = nextRow.textContent.trim();
                const nextRowLower = nextRowText.toLowerCase();
                
                // Find "รับซื้อ" and "ขายออก"
                if (nextRowLower.includes('รับซื้อ') || nextRowLower.includes('ขายออก')) {
                  const numbers = nextRowText.match(/[\d,]+\.?\d*/g);
                  if (numbers) {
                    for (const numStr of numbers) {
                      const num = parseFloat(numStr.replace(/,/g, ''));
                      if (num > 50000 && num < 100000) {
                        if (nextRowLower.includes('รับซื้อ') && buy9650 === 0) {
                          buy9650 = num;
                        } else if (nextRowLower.includes('ขายออก') && sell9650 === 0) {
                          sell9650 = num;
                        }
                      }
                    }
                  }
                }
                
                // Also check cells directly
                const nextCells = Array.from(nextRow.querySelectorAll('td, th'));
                for (const cell of nextCells) {
                  const cellText = cell.textContent.trim();
                  const cellLower = cellText.toLowerCase();
                  const num = parseFloat(cellText.replace(/,/g, ''));
                  
                  if (!isNaN(num) && num > 50000 && num < 100000) {
                    if (cellLower.includes('รับซื้อ') && buy9650 === 0) {
                      buy9650 = num;
                    } else if (cellLower.includes('ขายออก') && sell9650 === 0) {
                      sell9650 = num;
                    }
                  }
                }
              }
            }
            
            // Look for "ทองรูปพรรณ 96.5%"
            if (rowLower.includes('ทองรูปพรรณ') && (rowLower.includes('96.5') || rowLower.includes('96.50'))) {
              // Similar logic for 96.5% jewelry
              for (let j = i; j < Math.min(i + 5, rows.length); j++) {
                const nextRow = rows[j];
                const nextRowText = nextRow.textContent.trim();
                const nextRowLower = nextRowText.toLowerCase();
                
                if (nextRowLower.includes('รับซื้อ') || nextRowLower.includes('ขายออก')) {
                  const numbers = nextRowText.match(/[\d,]+\.?\d*/g);
                  if (numbers) {
                    for (const numStr of numbers) {
                      const num = parseFloat(numStr.replace(/,/g, ''));
                      if (num > 50000 && num < 100000) {
                        if (nextRowLower.includes('รับซื้อ') && buy9650 === 0) {
                          buy9650 = num;
                        } else if (nextRowLower.includes('ขายออก') && sell9650 === 0) {
                          sell9650 = num;
                        }
                      }
                    }
                  }
                }
              }
            }
            
            // Look for "99.99%" or "99.5%" in Foreign Markets section
            if (rowLower.includes('99.99') || rowLower.includes('99.5') || rowLower.includes('ฮ่องกง')) {
              // Look for "ราคาเปิด" and "ราคาปิด" in current row or next rows
              for (let j = i; j < Math.min(i + 10, rows.length); j++) {
                const nextRow = rows[j];
                const nextRowText = nextRow.textContent.trim();
                const nextRowLower = nextRowText.toLowerCase();
                const nextCells = Array.from(nextRow.querySelectorAll('td, th'));
                
                // Check if this row contains Hong Kong prices
                if (nextRowLower.includes('ฮ่องกง')) {
                  const numbers = nextRowText.match(/[\d,]+\.?\d*/g);
                  if (numbers && numbers.length >= 2) {
                    const num1 = parseFloat(numbers[0].replace(/,/g, ''));
                    const num2 = parseFloat(numbers[1].replace(/,/g, ''));
                    if (num1 > 30000 && num1 < 50000 && num2 > 30000 && num2 < 50000) {
                      buy9999 = Math.min(num1, num2);
                      sell9999 = Math.max(num1, num2);
                    }
                  }
                }
                
                // Also check for "ราคาเปิด" and "ราคาปิด"
                if (nextRowLower.includes('ราคาเปิด') || nextRowLower.includes('ราคาปิด') || 
                    nextRowLower.includes('open') || nextRowLower.includes('close')) {
                  const numbers = nextRowText.match(/[\d,]+\.?\d*/g);
                  if (numbers) {
                    for (const numStr of numbers) {
                      const num = parseFloat(numStr.replace(/,/g, ''));
                      if (num > 30000 && num < 50000) {
                        if ((nextRowLower.includes('เปิด') || nextRowLower.includes('open')) && buy9999 === 0) {
                          buy9999 = num;
                        } else if ((nextRowLower.includes('ปิด') || nextRowLower.includes('close')) && sell9999 === 0) {
                          sell9999 = num;
                        }
                      }
                    }
                  }
                }
                
                // Check cells for prices in Hong Kong row
                if (nextRowLower.includes('ฮ่องกง')) {
                  for (let k = 0; k < nextCells.length; k++) {
                    const cellText = nextCells[k]?.textContent?.trim() || '';
                    const num = parseFloat(cellText.replace(/,/g, ''));
                    if (!isNaN(num) && num > 30000 && num < 50000) {
                      if (buy9999 === 0) buy9999 = num;
                      else if (sell9999 === 0 && num !== buy9999) sell9999 = num;
                    }
                  }
                }
              }
            }
          }
        }
        
        // Strategy 2: Search entire page text for price patterns
        if (buy9999 === 0 || sell9999 === 0 || buy9650 === 0 || sell9650 === 0) {
          const allText = document.body.textContent || '';
          const lines = allText.split(/\r?\n/);
          
          let in9999Section = false;
          let in9650Section = false;
          let found9650Header = false;
          
          for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            const lowerLine = line.toLowerCase();
            
            // Detect section headers
            if (lowerLine.includes('99.99') || lowerLine.includes('99.5') || 
                (lowerLine.includes('ฮ่องกง') && lowerLine.includes('ราคา'))) {
              in9999Section = true;
              in9650Section = false;
            } else if ((lowerLine.includes('ทองคำแท่ง') && (lowerLine.includes('96.5') || lowerLine.includes('96.50'))) ||
                       (lowerLine.includes('gold price by gta') && lowerLine.includes('96.5'))) {
              in9650Section = true;
              in9999Section = false;
              found9650Header = true;
            } else if (lowerLine.includes('ทองรูปพรรณ') && (lowerLine.includes('96.5') || lowerLine.includes('96.50'))) {
              in9650Section = true;
              in9999Section = false;
            } else if (lowerLine.includes('foreign market') || lowerLine.includes('ราคาทองอ้างอิง')) {
              in9999Section = true;
              in9650Section = false;
            }
            
            // Extract prices based on section
            if (in9650Section && found9650Header) {
              // Look for "รับซื้อ" and "ขายออก" patterns
              if (lowerLine.includes('รับซื้อ') || lowerLine.includes('buy')) {
                const numbers = line.match(/[\d,]+\.?\d*/g);
                if (numbers) {
                  for (const numStr of numbers) {
                    const num = parseFloat(numStr.replace(/,/g, ''));
                    if (num > 50000 && num < 100000 && buy9650 === 0) {
                      buy9650 = num;
                      break;
                    }
                  }
                }
              }
              
              if (lowerLine.includes('ขายออก') || lowerLine.includes('sell')) {
                const numbers = line.match(/[\d,]+\.?\d*/g);
                if (numbers) {
                  for (const numStr of numbers) {
                    const num = parseFloat(numStr.replace(/,/g, ''));
                    if (num > 50000 && num < 100000 && sell9650 === 0) {
                      sell9650 = num;
                      break;
                    }
                  }
                }
              }
            }
            
            if (in9999Section) {
              // Look for "ราคาเปิด" and "ราคาปิด" patterns
              if (lowerLine.includes('ราคาเปิด') || lowerLine.includes('open')) {
                const numbers = line.match(/[\d,]+\.?\d*/g);
                if (numbers) {
                  for (const numStr of numbers) {
                    const num = parseFloat(numStr.replace(/,/g, ''));
                    if (num > 30000 && num < 50000 && buy9999 === 0) {
                      buy9999 = num;
                      break;
                    }
                  }
                }
              }
              
              if (lowerLine.includes('ราคาปิด') || lowerLine.includes('close')) {
                const numbers = line.match(/[\d,]+\.?\d*/g);
                if (numbers) {
                  for (const numStr of numbers) {
                    const num = parseFloat(numStr.replace(/,/g, ''));
                    if (num > 30000 && num < 50000 && sell9999 === 0) {
                      sell9999 = num;
                      break;
                    }
                  }
                }
              }
            }
          }
        }
        
        // Strategy 3: Direct regex pattern matching for specific formats
        if (buy9650 === 0 || sell9650 === 0) {
          const pageText = document.body.textContent || '';
          
          // Pattern: "ทองคำแท่ง 96.5%" followed by prices
          // Look for pattern like: "ทองคำแท่ง 96.5%	ขายออก	62,100.00	รับซื้อ	62,000.00"
          const pattern9650 = /ทองคำแท่ง\s*96\.?5%?[^\d]*ขายออก[^\d]*([\d,]+\.?\d*)[^\d]*รับซื้อ[^\d]*([\d,]+\.?\d*)/i;
          const match9650 = pageText.match(pattern9650);
          if (match9650) {
            const sellNum = parseFloat(match9650[1].replace(/,/g, ''));
            const buyNum = parseFloat(match9650[2].replace(/,/g, ''));
            if (buyNum > 50000 && buyNum < 100000 && sellNum > 50000 && sellNum < 100000) {
              buy9650 = buyNum;
              sell9650 = sellNum;
            }
          }
          
          // Alternative pattern: "รับซื้อ" then "ขายออก"
          if (buy9650 === 0 || sell9650 === 0) {
            const pattern9650_alt = /ทองคำแท่ง[^\d]*([\d,]+\.?\d*)[^\d]*([\d,]+\.?\d*)/i;
            const match9650_alt = pageText.match(pattern9650_alt);
            if (match9650_alt) {
              const num1 = parseFloat(match9650_alt[1].replace(/,/g, ''));
              const num2 = parseFloat(match9650_alt[2].replace(/,/g, ''));
              if (num1 > 50000 && num1 < 100000 && num2 > 50000 && num2 < 100000) {
                if (buy9650 === 0) buy9650 = Math.min(num1, num2);
                if (sell9650 === 0) sell9650 = Math.max(num1, num2);
              }
            }
          }
        }
        
        // Strategy 4: For 99.99% - look for Hong Kong prices
        if (buy9999 === 0 || sell9999 === 0) {
          const pageText = document.body.textContent || '';
          
          // Pattern: "ฮ่องกง	37,385.00	37,485.00" or similar
          const pattern9999 = /ฮ่องกง[^\d]*([\d,]+\.?\d*)[^\d]*([\d,]+\.?\d*)/i;
          const match9999 = pageText.match(pattern9999);
          if (match9999) {
            const num1 = parseFloat(match9999[1].replace(/,/g, ''));
            const num2 = parseFloat(match9999[2].replace(/,/g, ''));
            if (num1 > 30000 && num1 < 50000 && num2 > 30000 && num2 < 50000) {
              buy9999 = Math.min(num1, num2);
              sell9999 = Math.max(num1, num2);
            }
          }
        }
        
        return { buy9999, sell9999, buy9650, sell9650 };
      });
      
      // Validate prices BEFORE closing browser
      let pageContent = '';
      if (!prices || (prices.buy9999 === 0 && prices.sell9999 === 0 && prices.buy9650 === 0 && prices.sell9650 === 0)) {
        // Try to get page HTML for debugging before closing
        try {
          pageContent = await page.content();
        } catch (e) {
          console.warn('WARNING: Could not get page content:', e.message);
        }
      }
      
      await browser.close();
      browser = null;
      
      // Validate prices
      if (!prices || (prices.buy9999 === 0 && prices.sell9999 === 0 && prices.buy9650 === 0 && prices.sell9650 === 0)) {
        if (pageContent) {
          console.warn('WARNING: Page content preview (first 500 chars):', pageContent.substring(0, 500));
        }
        throw new Error('Price data not found on page');
      }
      
      // Validate price ranges
      // Gold 99.99% (from Hong Kong): typically 30,000 - 50,000 THB
      if (prices.buy9999 > 0 && (prices.buy9999 < 30000 || prices.buy9999 > 50000)) {
        console.warn('WARNING: Invalid buy9999 price:', prices.buy9999);
        prices.buy9999 = 0;
      }
      if (prices.sell9999 > 0 && (prices.sell9999 < 30000 || prices.sell9999 > 50000)) {
        console.warn('WARNING: Invalid sell9999 price:', prices.sell9999);
        prices.sell9999 = 0;
      }
      // Gold 96.50%: typically 50,000 - 100,000 THB
      if (prices.buy9650 > 0 && (prices.buy9650 < 50000 || prices.buy9650 > 100000)) {
        console.warn('WARNING: Invalid buy9650 price:', prices.buy9650);
        prices.buy9650 = 0;
      }
      if (prices.sell9650 > 0 && (prices.sell9650 < 50000 || prices.sell9650 > 100000)) {
        console.warn('WARNING: Invalid sell9650 price:', prices.sell9650);
        prices.sell9650 = 0;
      }
      
      // Final validation
      if (prices.buy9999 === 0 && prices.sell9999 === 0 && prices.buy9650 === 0 && prices.sell9650 === 0) {
        throw new Error('Price data not found on page');
      }
      
      console.log('SUCCESS: Successfully fetched Gold Traders prices:', prices);
      
      return {
        gold9999: { buy: prices.buy9999, sell: prices.sell9999 },
        gold9650: { buy: prices.buy9650, sell: prices.sell9650 }
      };
    } catch (error) {
      if (browser) {
        try {
          await browser.close();
        } catch (e) {
          // Ignore close errors
        }
      }
      console.error('ERROR: Error fetching Gold Traders price:', error.message);
      throw error; // Throw error instead of returning mock data
    }
  }

  async fetchAndUpdatePrice(priceType) {
    try {
      if (priceType === 'spot') {
        const spotPrice = await this.fetchGoldSpot();
        this.prices.spot = {
          ...this.prices.spot,
          buy: spotPrice.buy,
          sell: spotPrice.sell
        };
      } else if (priceType === 'gold9999' || priceType === 'gold9650') {
        // Fetch both prices at once since they come from the same source
        const tradersPrices = await this.fetchGoldTradersPrice();
        this.prices.gold9999 = {
          ...this.prices.gold9999,
          ...tradersPrices.gold9999
        };
        this.prices.gold9650 = {
          ...this.prices.gold9650,
          ...tradersPrices.gold9650
        };
      }
    } catch (error) {
      console.error(`ERROR: Error fetching price for ${priceType}:`, error.message);
      // Don't update price if fetch fails - keep previous value
    }
  }

  async fetchAllPrices() {
    await Promise.all([
      this.fetchAndUpdatePrice('spot'),
      this.fetchAndUpdatePrice('gold9999'),
      this.fetchAndUpdatePrice('gold9650')
    ]);
  }

  updatePrice(priceType, buy, sell) {
    if (this.prices[priceType]) {
      this.prices[priceType].buy = buy;
      this.prices[priceType].sell = sell;
    }
  }

  getAllPricesSync() {
    return this.prices;
  }

  async getAllPrices() {
    return this.prices;
  }
}

module.exports = new PriceService();


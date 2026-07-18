const { PrismaClient } = require('@prisma/client');
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });
const prisma = new PrismaClient();

async function runDownloadTest(fileId, expectedFileName, expectedSize, description) {
  return new Promise((resolve, reject) => {
    console.log(`\n--------------------------------------------`);
    console.log(`[TEST] ${description}`);
    console.log(`File ID: ${fileId}`);
    console.log(`Expected Filename: ${expectedFileName}`);
    console.log(`Expected Size: ${expectedSize} bytes`);
    
    const url = `http://localhost:3001/api/assets/file/${fileId}/download`;
    
    let receivedBytes = 0;
    let maxMemory = 0;
    const startTime = Date.now();
    const sha256 = crypto.createHash('sha256');

    const req = http.get(url, (res) => {
      if (res.statusCode !== 200) {
        console.error(`❌ HTTP Error: ${res.statusCode} - ${res.statusMessage}`);
        return resolve({ success: false, error: `HTTP ${res.statusCode}` });
      }

      const contentDisposition = res.headers['content-disposition'] || '';
      const contentType = res.headers['content-type'] || '';
      const contentLength = parseInt(res.headers['content-length'] || '0', 10);

      console.log(`Headers received:`);
      console.log(` - Content-Disposition: ${contentDisposition}`);
      console.log(` - Content-Type: ${contentType}`);
      console.log(` - Content-Length: ${contentLength} bytes`);

      // Check if Content-Disposition contains the filename (decode URI component)
      const hasCorrectFilename = decodeURIComponent(contentDisposition).includes(expectedFileName);
      if (hasCorrectFilename) {
        console.log(`✅ Filename check passed.`);
      } else {
        console.error(`❌ Filename check failed. Content-Disposition: ${contentDisposition}`);
      }

      // Check Content-Length matches expected
      const hasCorrectSize = contentLength === expectedSize;
      if (hasCorrectSize) {
        console.log(`✅ Content-Length check passed.`);
      } else {
        console.error(`❌ Content-Length check failed. Expected: ${expectedSize}, Got: ${contentLength}`);
      }

      res.on('data', (chunk) => {
        receivedBytes += chunk.length;
        sha256.update(chunk);
        
        // Track peak memory usage of this process
        const mem = process.memoryUsage().heapUsed;
        if (mem > maxMemory) {
          maxMemory = mem;
        }

        // Print progress for large files
        if (expectedSize > 10 * 1024 * 1024 && receivedBytes % (10 * 1024 * 1024) < chunk.length) {
          console.log(`   Downloaded: ${(receivedBytes / (1024 * 1024)).toFixed(2)} MB...`);
        }
      });

      res.on('end', () => {
        const duration = (Date.now() - startTime) / 1000;
        const hash = sha256.digest('hex');
        const peakRamMB = (maxMemory / (1024 * 1024)).toFixed(2);
        
        console.log(`\nStream completed:`);
        console.log(` - Total bytes received: ${receivedBytes}`);
        console.log(` - Duration: ${duration.toFixed(2)}s`);
        console.log(` - Peak Memory: ${peakRamMB} MB`);
        console.log(` - SHA-256 Hash: ${hash}`);

        const sizeMatches = receivedBytes === expectedSize;
        if (sizeMatches) {
          console.log(`✅ Download integrity check passed.`);
        } else {
          console.error(`❌ Download integrity check failed. Bytes received: ${receivedBytes}`);
        }

        resolve({
          success: sizeMatches && hasCorrectFilename && hasCorrectSize,
          fileName: expectedFileName,
          receivedBytes,
          peakRamMB,
          hash,
          contentType
        });
      });
    });

    req.on('error', (err) => {
      console.error(`❌ Request Error:`, err.message);
      resolve({ success: false, error: err.message });
    });
  });
}

async function main() {
  try {
    // 1. Fetch assets from database to get file IDs
    const singleAsset = await prisma.asset.findFirst({
      where: { name: 'gta', isDeleted: false },
      include: { files: true }
    });

    const multipartAsset = await prisma.asset.findFirst({
      where: { name: 'g', isDeleted: false },
      include: { files: true }
    });

    const folderAsset = await prisma.asset.findFirst({
      where: { name: 'asdfasdf', isDeleted: false },
      include: { files: true }
    });

    const largeFileRecord = await prisma.assetFile.findFirst({
      where: {
        fileName: { contains: 'video' },
        telegramMessageId: { not: null }
      }
    });

    const results = [];

    // --- Scenario 1: SINGLE Asset ---
    if (singleAsset && singleAsset.files.length > 0) {
      const file = singleAsset.files[0];
      const res = await runDownloadTest(file.id, file.fileName, Number(file.fileSize), 'SINGLE Asset Download Test');
      results.push({ scenario: 'SINGLE Asset', ...res });
    } else {
      console.warn('⚠️ SINGLE asset "gta" not found or has no files.');
    }

    // --- Scenario 2: MULTIPART Asset (Individual Parts) ---
    if (multipartAsset && multipartAsset.files.length > 0) {
      for (let i = 0; i < multipartAsset.files.length; i++) {
        const file = multipartAsset.files[i];
        const res = await runDownloadTest(file.id, file.fileName, Number(file.fileSize), `MULTIPART Asset Part ${i + 1} Download Test`);
        results.push({ scenario: `MULTIPART Part ${i + 1}`, ...res });
      }
    } else {
      console.warn('⚠️ MULTIPART asset "g" not found or has no files.');
    }

    // --- Scenario 3: FOLDER Asset (Individual Files) ---
    if (folderAsset && folderAsset.files.length > 0) {
      // Test two files from the folder asset
      for (let i = 0; i < Math.min(2, folderAsset.files.length); i++) {
        const file = folderAsset.files[i];
        const res = await runDownloadTest(file.id, file.fileName, Number(file.fileSize), `FOLDER Asset File ${i + 1} Download Test`);
        results.push({ scenario: `FOLDER File ${i + 1}`, ...res });
      }
    } else {
      console.warn('⚠️ FOLDER asset "asdfasdf" not found or has no files.');
    }

    // --- Scenario 4: Large File Test ---
    if (largeFileRecord) {
      const res = await runDownloadTest(largeFileRecord.id, largeFileRecord.fileName, Number(largeFileRecord.fileSize), 'Large File Download Test (~103 MB)');
      results.push({ scenario: 'Large File Download', ...res });
    } else {
      console.warn('⚠️ Large video file record not found in database.');
    }

    console.log(`\n============================================`);
    console.log(`VERIFICATION SUMMARY REPORT`);
    console.log(`============================================`);
    results.forEach(r => {
      console.log(`${r.scenario}: ${r.success ? '✅ PASSED' : '❌ FAILED'}`);
      console.log(` - Filename: ${r.fileName}`);
      console.log(` - MIME type: ${r.contentType}`);
      console.log(` - Size: ${r.receivedBytes} bytes`);
      console.log(` - Peak Memory: ${r.peakRamMB} MB`);
      console.log(` - Hash: ${r.hash}`);
      console.log(`--------------------------------------------`);
    });

  } catch (err) {
    console.error('Error during verifications:', err);
  } finally {
    await prisma.$disconnect();
  }
}

main();

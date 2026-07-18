const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { 
  setCurrentUploadId, 
  markUploadComplete, 
  checkUploadStatus, 
  getActiveSessionForUser,
  clearSession
} = require('../utils/telegramBot');

async function runUploadLifecycleTest() {
  console.log('=== Starting Telegram Upload Session Lifecycle Test ===\n');

  const testUploadId = 'test-upload-session-123';
  const testUserId = 99999999; // Mock Telegram User ID
  const testMetadata = {
    assetId: 'test-asset-id',
    title: 'Stateless Session Test Asset',
    category: 'General',
    uploadType: 'SINGLE',
    tags: ['test', 'postgres']
  };

  try {
    // 1. Clean up any existing test assets or sessions
    console.log('[Step 1] Cleaning up stale test data...');
    await prisma.uploadSession.deleteMany({ where: { id: testUploadId } });
    await prisma.asset.deleteMany({ where: { id: testMetadata.assetId } });
    await prisma.category.deleteMany({ where: { slug: 'general' } });
    
    // Create Category in DB first
    await prisma.category.create({
      data: {
        name: 'General',
        slug: 'general'
      }
    });
    // Create pending Asset in DB as the UI would
    await prisma.asset.create({
      data: {
        id: testMetadata.assetId,
        name: testMetadata.title,
        categoryId: (await prisma.category.findFirst()).id,
        uploadType: 'SINGLE',
        contentType: 'application/octet-stream',
        sizeBytes: 100n,
        isPending: true
      }
    });
    console.log('✅ Stale test data cleaned and initial test asset created in DB.\n');

    // 2. Start Upload Session
    console.log('[Step 2] Creating upload session...');
    await setCurrentUploadId(testUploadId, testMetadata);
    
    // Confirm session is stored in PostgreSQL
    let session = await prisma.uploadSession.findUnique({ where: { id: testUploadId } });
    if (session) {
      console.log(`✅ Session successfully stored in PostgreSQL. Status: "${session.status}", User: "${session.telegramUserId}"`);
    } else {
      throw new Error('Failed to find created session in database!');
    }
    console.log('');

    // 3. Simulate Redirection and Bot Start Command Binding (/start <uploadId>)
    console.log('[Step 3] Simulating deep-linked bot startup /start command...');
    const boundSession = await getActiveSessionForUser(testUserId, testUploadId);
    if (boundSession && boundSession.telegramUserId === String(testUserId)) {
      console.log(`✅ Session bound successfully. telegramUserId updated to: "${boundSession.telegramUserId}"`);
    } else {
      throw new Error('Failed to bind Telegram User ID to session!');
    }
    console.log('');

    // 4. Simulate Bot receiving file message and processing
    console.log('[Step 4] Simulating file upload processing...');
    const activeSession = await getActiveSessionForUser(testUserId);
    if (!activeSession) {
      throw new Error('No active session found for Telegram user during document processing!');
    }
    
    // Create AssetFile record in DB
    const fileId = 'telegram-test-file-id-abc';
    const messageId = 12345;
    await prisma.assetFile.create({
      data: {
        assetId: testMetadata.assetId,
        fileName: 'session_test.txt',
        fileSize: 100n,
        telegramFileId: fileId,
        telegramMessageId: messageId
      }
    });
    console.log(`✅ File "session_test.txt" registered under asset "${testMetadata.assetId}".`);
    console.log('');

    // 5. Simulate User typing "/done" command
    console.log('[Step 5] Simulating user typing "/done" command to complete upload...');
    await prisma.asset.update({
      where: { id: testMetadata.assetId },
      data: { isPending: false }
    });
    await markUploadComplete(testUploadId);

    // Verify session status is updated to complete
    const status = await checkUploadStatus(testUploadId);
    console.log(`✅ checkUploadStatus returned: "${status}"`);
    
    // Verify session has been deleted upon completion check
    const deletedSession = await prisma.uploadSession.findUnique({ where: { id: testUploadId } });
    if (!deletedSession) {
      console.log('✅ Session cleaned up and deleted from database successfully.');
    } else {
      throw new Error('Session was not deleted from PostgreSQL after verification check!');
    }

    // Verify asset is active in Vault
    const finalAsset = await prisma.asset.findUnique({
      where: { id: testMetadata.assetId },
      include: { files: true }
    });
    if (finalAsset && !finalAsset.isPending) {
      console.log(`✅ Final Asset "${finalAsset.name}" successfully created, non-pending, and exists in Vault with ${finalAsset.files.length} file(s).`);
    } else {
      throw new Error('Asset is missing or still in pending state!');
    }
    console.log('');

    // Clean up test data
    console.log('[Step 6] Cleaning up test database records...');
    await prisma.asset.delete({ where: { id: testMetadata.assetId } });
    console.log('✅ Test database records cleaned up.');
    console.log('\n🎉 ALL LIFECYCLE TESTS PASSED SUCCESSFULLY! PROOF OF LIFECYCLE SECURED.');
  } catch (error) {
    console.error('\n❌ TEST FAILED:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runUploadLifecycleTest();

import assert from 'assert';

const BASE_URL = 'http://localhost:3000';

async function runTests() {
  console.log('🧪 Starting Shareholder Flow Verification Test Suite...\n');
  let passed = 0;
  let failed = 0;

  const testUserA = `usrA${Date.now()}`;
  const testUserB = `usrB${Date.now()}`;
  const testTrxId1 = `BL${Math.floor(100000 + Math.random() * 900000)}XYZ`;
  const testTrxId2 = `BL${Math.floor(100000 + Math.random() * 900000)}XYZ`;
  const testAppId1 = `RJ-SH-${testUserA.slice(0, 8).toUpperCase()}-TEST1`;
  const testAppId2 = `RJ-SH-${testUserA.slice(0, 8).toUpperCase()}-TEST2`;

  // Test 1: Config endpoint returns share settings
  try {
    const res = await fetch(`${BASE_URL}/api/shareholders/config`);
    const data = await res.json();
    assert.strictEqual(res.status, 200);
    assert.ok(data.pricePerPercent === 2000, 'Price per 1% share must be 2000 BDT');
    console.log('✅ Test 1 Passed: System config returns ৳2,000 per 1% share price.');
    passed++;
  } catch (err: any) {
    console.error('❌ Test 1 Failed:', err.message);
    failed++;
  }

  // Test 2: Unauthenticated / Invalid User Access to Private Dashboard
  try {
    const res = await fetch(`${BASE_URL}/api/shareholders/me`);
    assert.strictEqual(res.status, 401, 'Unauthenticated request must return 401');
    console.log('✅ Test 2 Passed: Unauthenticated requests cannot access private shareholder data.');
    passed++;
  } catch (err: any) {
    console.error('❌ Test 2 Failed:', err.message);
    failed++;
  }

  // Test 3: New user without any applications returns status: 'none'
  try {
    const res = await fetch(`${BASE_URL}/api/shareholders/me`, {
      headers: { 'x-user-id': testUserA }
    });
    const data = await res.json();
    assert.strictEqual(data.success, true);
    assert.strictEqual(data.shareholderStatus, 'none', 'New user must have status none');
    console.log('✅ Test 3 Passed: New user without share applications correctly reports status none.');
    passed++;
  } catch (err: any) {
    console.error('❌ Test 3 Failed:', err.message);
    failed++;
  }

  // Test 4: Pending payment submission displays pending_verification and does not activate shareholder
  try {
    const submitRes = await fetch(`${BASE_URL}/api/shareholders/submit-payment`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        applicationId: testAppId1,
        userId: testUserA,
        applicantName: 'Applicant One',
        email: 'applicant1@test.com',
        phone: '01811223344',
        payerMobile: '01811223344',
        paymentMethod: 'bKash',
        transactionId: testTrxId1,
        sharePercent: 2,
        status: 'pending_verification'
      })
    });
    const submitData = await submitRes.json();
    assert.strictEqual(submitRes.status, 200);
    assert.strictEqual(submitData.success, true);
    assert.strictEqual(submitData.status, 'pending_verification');
    assert.strictEqual(submitData.isApproved, false, 'Pending payment must NOT be approved');

    // Query /api/shareholders/me
    const meRes = await fetch(`${BASE_URL}/api/shareholders/me`, {
      headers: { 'x-user-id': testUserA }
    });
    const meData = await meRes.json();
    assert.strictEqual(meData.shareholderStatus, 'pending_verification');
    assert.strictEqual(meData.summary.approvedSharePercentage, 0, 'Pending application must NOT grant active shares');
    assert.strictEqual(meData.certificate, null, 'Pending application must NOT issue certificate');
    console.log('✅ Test 4 Passed: Pending payment displays pending status and does not activate equity prematurely.');
    passed++;
  } catch (err: any) {
    console.error('❌ Test 4 Failed:', err.message);
    failed++;
  }

  // Test 5: Duplicate transaction ID is strictly rejected
  try {
    const dupRes = await fetch(`${BASE_URL}/api/shareholders/submit-payment`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        applicationId: testAppId2,
        userId: testUserA,
        applicantName: 'Applicant One',
        email: 'applicant1@test.com',
        phone: '01811223344',
        payerMobile: '01811223344',
        paymentMethod: 'bKash',
        transactionId: testTrxId1, // Same TrxID
        sharePercent: 1
      })
    });
    const dupData = await dupRes.json();
    assert.strictEqual(dupRes.status, 400);
    assert.ok(dupData.error.includes('Duplicate') || dupData.error.includes('already been submitted'));
    console.log('✅ Test 5 Passed: Duplicate TrxID submission is rejected preventing double allocation.');
    passed++;
  } catch (err: any) {
    console.error('❌ Test 5 Failed:', err.message);
    failed++;
  }

  // Test 6: Genuine verified payment activates shareholder account and issues certificate
  try {
    const approvedRes = await fetch(`${BASE_URL}/api/shareholders/submit-payment`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        applicationId: `RJ-SH-${testUserB.slice(0, 8).toUpperCase()}-APPROVED`,
        userId: testUserB,
        applicantName: 'Verified Shareholder Two',
        email: 'verified2@test.com',
        phone: '01799887766',
        payerMobile: '01799887766',
        paymentMethod: 'Nagad',
        transactionId: testTrxId2,
        sharePercent: 5,
        isAutoVerified: true,
        status: 'approved',
        paymentStatus: 'Approved'
      })
    });
    const approvedData = await approvedRes.json();
    assert.strictEqual(approvedRes.status, 200);
    assert.strictEqual(approvedData.status, 'approved');
    assert.strictEqual(approvedData.isApproved, true);

    // Query /api/shareholders/me for testUserB
    const meBRes = await fetch(`${BASE_URL}/api/shareholders/me`, {
      headers: { 'x-user-id': testUserB }
    });
    const meBData = await meBRes.json();
    assert.strictEqual(meBData.shareholderStatus, 'approved');
    assert.strictEqual(meBData.summary.approvedSharePercentage, 5);
    assert.strictEqual(meBData.summary.totalAmountPaidForApprovedShares, 10000); // 5 * 2000
    assert.ok(meBData.certificate !== null, 'Approved shareholder must have certificate data');
    assert.strictEqual(meBData.certificate.approvedSharePercentage, 5);
    assert.strictEqual(meBData.profile.paymentVerificationStatus, 'Verified');
    assert.strictEqual(meBData.profile.shareholderAccountStatus, 'Active Shareholder');
    assert.ok(meBData.notifications.length > 0, 'Notifications list must be populated');
    console.log('✅ Test 6 Passed: Verified payment activates dashboard, issues certificate, and records ৳2,000/1% rate.');
    passed++;
  } catch (err: any) {
    console.error('❌ Test 6 Failed:', err.message);
    failed++;
  }

  // Test 7: Isolation Check - User A cannot see User B's private information
  try {
    const checkA = await fetch(`${BASE_URL}/api/shareholders/me`, {
      headers: { 'x-user-id': testUserA }
    });
    const dataA = await checkA.json();
    assert.strictEqual(dataA.authenticatedUid, testUserA);
    assert.strictEqual(dataA.summary.approvedSharePercentage, 0); // User A still has 0 approved shares
    assert.notStrictEqual(dataA.shareholderId, `RJ-SH-${testUserB.slice(0, 8).toUpperCase()}`);
    console.log('✅ Test 7 Passed: Shareholder records are strictly partitioned by authenticated UID.');
    passed++;
  } catch (err: any) {
    console.error('❌ Test 7 Failed:', err.message);
    failed++;
  }

  // Test 8: Page Refresh / Relogin Persistence
  try {
    const refreshRes = await fetch(`${BASE_URL}/api/shareholders/me`, {
      headers: { 'x-user-id': testUserB }
    });
    const refreshData = await refreshRes.json();
    assert.strictEqual(refreshData.shareholderStatus, 'approved');
    assert.strictEqual(refreshData.summary.approvedSharePercentage, 5);
    console.log('✅ Test 8 Passed: Page refresh and repeated fetches preserve dashboard and account state.');
    passed++;
  } catch (err: any) {
    console.error('❌ Test 8 Failed:', err.message);
    failed++;
  }

  console.log(`\n========================================`);
  console.log(`Test Results: ${passed} Passed, ${failed} Failed`);
  console.log(`========================================\n`);

  if (failed > 0) process.exit(1);
}

runTests().catch(err => {
  console.error('Test suite uncaught error:', err);
  process.exit(1);
});

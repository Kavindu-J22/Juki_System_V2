require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');
const Brand = require('./models/Brand');
const Customer = require('./models/Customer');
const Machinery = require('./models/Machinery');
const Transaction = require('./models/Transaction');
const Expense = require('./models/Expense');
const PartnerLedger = require('./models/PartnerLedger');
const CompanySettings = require('./models/CompanySettings');

const seedDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('🌱 Connected to MongoDB for seeding...');

    // Clear existing data
    await Promise.all([
      User.deleteMany({}),
      Brand.deleteMany({}),
      Customer.deleteMany({}),
      Machinery.deleteMany({}),
      Transaction.deleteMany({}),
      Expense.deleteMany({}),
      PartnerLedger.deleteMany({}),
      CompanySettings.deleteMany({}),
    ]);
    console.log('🧹 Existing collections cleared');

    // 1. Seed Users (Admin, Partner, Staff)
    const adminUser = await User.create({
      name: 'Anujaya Jayasinghe (Admin)',
      email: 'admin@anujaya.com',
      password: 'admin123',
      role: 'Admin',
      partnerCompany: 'Anujaya Enterprises',
      phone: '+94 77 123 4567',
    });

    const partnerUser = await User.create({
      name: 'Global Executive Director (Partner)',
      email: 'partner@global.com',
      password: 'partner123',
      role: 'Partner',
      partnerCompany: 'Global Enterprises',
      phone: '+94 71 987 6543',
    });

    const staffUser = await User.create({
      name: 'Kasun Perera (Operations & Dispatch)',
      email: 'staff@anujaya.com',
      password: 'staff123',
      role: 'Staff',
      partnerCompany: 'Consortium General',
      phone: '+94 76 555 4321',
    });

    console.log('✅ Users seeded (Admin, Partner, Staff)');

    // 2. Seed Brands
    const brands = await Brand.insertMany([
      { name: 'Juki', country: 'Japan', description: 'World leader in heavy industrial sewing machinery and automation.' },
      { name: 'Brother', country: 'Japan', description: 'Precision direct-drive apparel lockstitch and embroidery equipment.' },
      { name: 'Pegasus', country: 'Japan', description: 'High-speed knitwear overlock and interlock sewing systems.' },
      { name: 'Siruba', country: 'Taiwan', description: 'Heavy-duty industrial chainstitch and cylinder bed specialists.' },
      { name: 'Jack', country: 'China', description: 'Smart IoT enabled apparel sewing machines and computerized cutters.' },
      { name: 'Eastman', country: 'USA', description: 'Heavy apparel cutting room solutions, straight and round knife cutters.' },
    ]);
    console.log(`✅ ${brands.length} Brands seeded`);

    // 3. Seed Customers
    const customers = await Customer.insertMany([
      {
        cid: 'CUST-001',
        name: 'MAS Holdings - Linea Clothing (Pvt) Ltd',
        nic: 'PV-102948',
        phone: '+94 11 482 1000',
        email: 'procurement@masholdings.com',
        region: 'Biyagama Export Processing Zone',
        address: 'Plot 42, Biyagama EPZ, Malwana, Sri Lanka',
        previousBalance: 0,
        notes: 'Top tier consortium apparel partner. High volume active rental fleet.',
      },
      {
        cid: 'CUST-002',
        name: 'Brandix Apparel Solutions Ltd - Finishing Hub',
        nic: 'PV-203948',
        phone: '+94 11 472 7000',
        email: 'apparel.ops@brandix.com',
        region: 'Katunayake EPZ',
        address: 'Phase 1, Export Processing Zone, Katunayake, Sri Lanka',
        previousBalance: 45000,
        notes: 'Monthly rental account with 30-day corporate credit facility.',
      },
      {
        cid: 'CUST-003',
        name: 'Hirdaramani Garments International',
        nic: 'PV-304958',
        phone: '+94 11 479 5000',
        email: 'machinery@hirdaramani.com',
        region: 'Seethawaka Industrial Park',
        address: 'Block C, Seethawaka Export Park, Avissawella',
        previousBalance: 0,
        notes: 'Purchased 20 sets of computerized lockstitch units.',
      },
      {
        cid: 'CUST-004',
        name: 'Omega Line Textile Hub (Pvt) Ltd',
        nic: 'PV-405968',
        phone: '+94 31 224 8000',
        email: 'supply@omegaline.lk',
        region: 'Sandalankawa Industrial Zone',
        address: 'No. 12, Sandalankawa, Wayamba Province',
        previousBalance: 0,
        notes: 'Seamless apparel production machines and heavy overlock units.',
      },
      {
        cid: 'CUST-005',
        name: 'Jay Jay Mills Lanka (Pvt) Ltd',
        nic: 'PV-506978',
        phone: '+94 36 223 1200',
        email: 'factory.manager@jayjaymills.com',
        region: 'Avissawella',
        address: 'Industrial Estate, Puwakpitiya, Avissawella',
        previousBalance: 15000,
        notes: 'New account. Trial rental of 4 Brother electronic lockstitch units.',
      },
    ]);
    console.log(`✅ ${customers.length} Customers CRM records seeded`);

    // 4. Seed Machinery
    const exchangeRate = 310;
    const machinesData = [
      {
        sku: 'M-01',
        brand: 'Juki',
        model: 'DDL-8700 Single Needle Lockstitch',
        description: 'Industry standard 1-needle lockstitch machine for medium-weight apparel fabrics, 5500 rpm.',
        initialBatchSets: 80,
        dispatched: 32,
        unit: 'SETS',
        unitWeight: '32 KG',
        factoryFobUsd: 240,
        exchangeRate,
        customsDutyLkr: 18000,
        wholesaleBenchmark: 125000,
        retailBenchmark: 145000,
        rentPricePerMonth: 12500,
        ownershipType: 'OUR_ASSET',
        availableSerialNumbers: ['JK-8700-101', 'JK-8700-102', 'JK-8700-103', 'JK-8700-104', 'JK-8700-105'],
      },
      {
        sku: 'M-02',
        brand: 'Juki',
        model: 'MO-6814S High Speed 4-Thread Overlock',
        description: 'Advanced 2-needle 4-thread overlock sewing machine with differential feed and auto lubrication.',
        initialBatchSets: 50,
        dispatched: 24,
        unit: 'SETS',
        unitWeight: '36 KG',
        factoryFobUsd: 380,
        exchangeRate,
        customsDutyLkr: 26000,
        wholesaleBenchmark: 185000,
        retailBenchmark: 215000,
        rentPricePerMonth: 18500,
        ownershipType: 'OUR_ASSET',
        availableSerialNumbers: ['JK-6814-201', 'JK-6814-202', 'JK-6814-203'],
      },
      {
        sku: 'M-03',
        brand: 'Brother',
        model: 'S-7200C Direct Drive Electronic Lockstitch',
        description: 'Energy saving direct-drive electronic lockstitch with automatic thread trimming and reverse feed.',
        initialBatchSets: 40,
        dispatched: 18,
        unit: 'SETS',
        unitWeight: '38 KG',
        factoryFobUsd: 460,
        exchangeRate,
        customsDutyLkr: 32000,
        wholesaleBenchmark: 225000,
        retailBenchmark: 260000,
        rentPricePerMonth: 22000,
        ownershipType: 'OUR_ASSET',
        availableSerialNumbers: ['BR-7200-301', 'BR-7200-302'],
      },
      {
        sku: 'M-04',
        brand: 'Pegasus',
        model: 'M900 Ultra High Speed Safety Stitch',
        description: 'Specialized 5-thread safety stitch machine for woven shirts, trousers, and denim construction.',
        initialBatchSets: 30,
        dispatched: 12,
        unit: 'SETS',
        unitWeight: '35 KG',
        factoryFobUsd: 520,
        exchangeRate,
        customsDutyLkr: 38000,
        wholesaleBenchmark: 265000,
        retailBenchmark: 298000,
        rentPricePerMonth: 26000,
        ownershipType: 'OUR_ASSET',
        availableSerialNumbers: ['PG-900-401', 'PG-900-402'],
      },
      {
        sku: 'M-05',
        brand: 'Siruba',
        model: '747K Cylinder Bed Interlock Machine',
        description: 'High performance small cylinder bed interlock sewing machine for hemming knit collars and cuffs.',
        initialBatchSets: 25,
        dispatched: 10,
        unit: 'SETS',
        unitWeight: '44 KG',
        factoryFobUsd: 610,
        exchangeRate,
        customsDutyLkr: 44000,
        wholesaleBenchmark: 310000,
        retailBenchmark: 350000,
        rentPricePerMonth: 30000,
        // Third Party Outsourced Asset
        ownershipType: 'THIRD_PARTY_ASSET',
        thirdPartyCompany: 'Lanka Apparel Outsourcing Ltd',
        thirdPartyRentalCostOwed: 21000,
        availableSerialNumbers: ['SR-747-501', 'SR-747-502'],
      },
      {
        sku: 'M-06',
        brand: 'Jack',
        model: 'A4B Computerized Smart Lockstitch',
        description: 'Smart IoT connected direct-drive lockstitch with voice alarm and short remaining thread system.',
        initialBatchSets: 60,
        dispatched: 22,
        unit: 'SETS',
        unitWeight: '37 KG',
        factoryFobUsd: 310,
        exchangeRate,
        customsDutyLkr: 22000,
        wholesaleBenchmark: 155000,
        retailBenchmark: 180000,
        rentPricePerMonth: 15000,
        ownershipType: 'OUR_ASSET',
        availableSerialNumbers: ['JK-A4B-601', 'JK-A4B-602', 'JK-A4B-603'],
      },
      {
        sku: 'M-07',
        brand: 'Eastman',
        model: '629X Blue Streak Cloth Cutting Machine',
        description: 'Heavy-duty 10-inch straight knife fabric cutting machine for dense multi-ply fabric spreading tables.',
        initialBatchSets: 20,
        dispatched: 8,
        unit: 'SETS',
        unitWeight: '16 KG',
        factoryFobUsd: 430,
        exchangeRate,
        customsDutyLkr: 28000,
        wholesaleBenchmark: 215000,
        retailBenchmark: 245000,
        rentPricePerMonth: 20000,
        ownershipType: 'OUR_ASSET',
        availableSerialNumbers: ['ES-629-701', 'ES-629-702'],
      },
    ];

    const machines = [];
    for (const mData of machinesData) {
      const machine = new Machinery(mData);
      await machine.save();
      machines.push(machine);
    }
    console.log(`✅ ${machines.length} Machinery items seeded`);

    // 5. Seed Transactions (BUY & RENT)
    const now = new Date();

    // 5.1 BUY Transaction 1 - MAS Holdings (Fully Paid)
    const buyTx1 = await Transaction.create({
      transactionType: 'BUY',
      invoiceNumber: 'INV-2026-0101',
      customer: customers[0]._id,
      customerSnapshot: {
        name: customers[0].name,
        cid: customers[0].cid,
        phone: customers[0].phone,
        region: customers[0].region,
        address: customers[0].address,
      },
      machinery: machines[0]._id,
      machinerySnapshot: {
        sku: machines[0].sku,
        brand: machines[0].brand,
        model: machines[0].model,
        landedUnitCost: machines[0].landedUnitCost,
        ownershipType: machines[0].ownershipType,
      },
      quantity: 10,
      serialNumbers: ['JK-8700-011', 'JK-8700-012', 'JK-8700-013', 'JK-8700-014', 'JK-8700-015', 'JK-8700-016', 'JK-8700-017', 'JK-8700-018', 'JK-8700-019', 'JK-8700-020'],
      dispatchDate: new Date(now.getTime() - 25 * 24 * 60 * 60 * 1000),
      deliveryStatus: 'Hand Overed',
      deliveryCharges: 15000,
      otherCharges: 0,
      buyDetails: {
        benchmarkType: 'Wholesale',
        unitPrice: 125000,
        subtotal: 1250000,
        taxIncluded: true,
        taxPercent: 5,
        taxAmount: 62500,
        totalAmount: 1327500,
        paidAmount: 1327500,
        outstandingAmount: 0,
        settlementStatus: 'Fully Paid',
        paymentTerms: 'Bank Wire/SLIPS',
        paymentReference: 'COMB-WIRE-98271',
        totalCostOfGoods: machines[0].landedUnitCost * 10,
        totalGrossProfit: 1327500 - (machines[0].landedUnitCost * 10) - 15000,
        profitSplitPercent: { anujayaPercent: 50, globalPercent: 50 },
        anujayaNetProfit: (1327500 - (machines[0].landedUnitCost * 10) - 15000) * 0.5,
        globalNetProfit: (1327500 - (machines[0].landedUnitCost * 10) - 15000) * 0.5,
      },
      payments: [
        {
          date: new Date(now.getTime() - 25 * 24 * 60 * 60 * 1000),
          amount: 1327500,
          paymentType: 'SALES_SETTLEMENT',
          paymentMethod: 'Bank Wire/SLIPS',
          reference: 'COMB-WIRE-98271',
          notes: 'Full settlement received on delivery confirmation',
          receivedBy: 'Kasun Perera (Operations & Dispatch)',
        }
      ],
      createdBy: adminUser._id,
      createdByName: adminUser.name,
    });

    // 5.2 BUY Transaction 2 - Hirdaramani Garments (Partial Payment / Credit)
    const buyTx2 = await Transaction.create({
      transactionType: 'BUY',
      invoiceNumber: 'INV-2026-0102',
      customer: customers[2]._id,
      customerSnapshot: {
        name: customers[2].name,
        cid: customers[2].cid,
        phone: customers[2].phone,
        region: customers[2].region,
        address: customers[2].address,
      },
      machinery: machines[2]._id,
      machinerySnapshot: {
        sku: machines[2].sku,
        brand: machines[2].brand,
        model: machines[2].model,
        landedUnitCost: machines[2].landedUnitCost,
        ownershipType: machines[2].ownershipType,
      },
      quantity: 6,
      serialNumbers: ['BR-7200-021', 'BR-7200-022', 'BR-7200-023', 'BR-7200-024', 'BR-7200-025', 'BR-7200-026'],
      dispatchDate: new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000),
      deliveryStatus: 'Hand Overed',
      deliveryCharges: 12000,
      otherCharges: 5000,
      buyDetails: {
        benchmarkType: 'Wholesale',
        unitPrice: 225000,
        subtotal: 1350000,
        taxIncluded: false,
        taxPercent: 0,
        taxAmount: 0,
        totalAmount: 1367000,
        paidAmount: 800000,
        outstandingAmount: 567000,
        settlementStatus: 'Partial Payment',
        paymentTerms: '30-Day Credit',
        paymentReference: 'CHQ-HIRD-44120',
        totalCostOfGoods: machines[2].landedUnitCost * 6,
        totalGrossProfit: 1367000 - (machines[2].landedUnitCost * 6) - 17000,
        profitSplitPercent: { anujayaPercent: 50, globalPercent: 50 },
        anujayaNetProfit: (1367000 - (machines[2].landedUnitCost * 6) - 17000) * 0.5,
        globalNetProfit: (1367000 - (machines[2].landedUnitCost * 6) - 17000) * 0.5,
      },
      payments: [
        {
          date: new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000),
          amount: 800000,
          paymentType: 'SALES_SETTLEMENT',
          paymentMethod: 'Corporate Cheque',
          reference: 'CHQ-HIRD-44120',
          notes: 'Advance 58% cheque cleared, balance due in 30 days',
          receivedBy: 'Kasun Perera (Operations & Dispatch)',
        }
      ],
      createdBy: adminUser._id,
      createdByName: adminUser.name,
    });

    // 5.3 RENT 1 - Due in 7 Days (Brandix Apparel Solutions) -> Triggers 7 Days Alert!
    const dueIn7Date = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const rentTx1 = await Transaction.create({
      transactionType: 'RENT',
      invoiceNumber: 'AGR-2026-0201',
      customer: customers[1]._id,
      customerSnapshot: {
        name: customers[1].name,
        cid: customers[1].cid,
        phone: customers[1].phone,
        region: customers[1].region,
        address: customers[1].address,
      },
      machinery: machines[1]._id,
      machinerySnapshot: {
        sku: machines[1].sku,
        brand: machines[1].brand,
        model: machines[1].model,
        landedUnitCost: machines[1].landedUnitCost,
        ownershipType: machines[1].ownershipType,
      },
      quantity: 5,
      serialNumbers: ['JK-6814-110', 'JK-6814-111', 'JK-6814-112', 'JK-6814-113', 'JK-6814-114'],
      dispatchDate: new Date(now.getTime() - 23 * 24 * 60 * 60 * 1000),
      deliveryStatus: 'Hand Overed',
      deliveryCharges: 10000,
      rentDetails: {
        durationMonths: 6,
        rentPricePerMonth: 18500,
        totalRentValue: 6 * 18500 * 5, // 555,000
        hasKeyMoney: true,
        keyMoneyAmount: 50000,
        keyMoneyPaidAmount: 50000,
        keyMoneyStatus: 'Fully Paid',
        firstTwoMonthsAmount: 18500 * 2 * 5, // 185,000
        firstTwoMonthsPaidAmount: 18500 * 2 * 5,
        firstTwoMonthsStatus: 'Fully Paid',
        paymentTerms: 'Bank Wire/SLIPS',
        paymentReference: 'RENT-ADV-BRANDIX-01',
        nextPaymentDueDate: dueIn7Date,
        currentMonthCycle: 2,
        returnStatus: 'In Use',
        monthsBilled: 6,
        monthsWaived: 0,
        totalRentalPayable: 555000 + 50000 + 10000, // 615,000
        totalRentalPaid: 50000 + 185000, // 235,000
        outstandingRentalBalance: 615000 - 235000, // 380,000
        anujayaRentalShare: 117500,
        globalRentalShare: 117500,
      },
      payments: [
        {
          date: new Date(now.getTime() - 23 * 24 * 60 * 60 * 1000),
          amount: 50000,
          paymentType: 'KEY_MONEY',
          paymentMethod: 'Bank Wire/SLIPS',
          reference: 'KM-SEC-01',
          notes: 'Security Deposit for 5 sets',
          receivedBy: 'Kasun Perera',
        },
        {
          date: new Date(now.getTime() - 23 * 24 * 60 * 60 * 1000),
          amount: 185000,
          paymentType: 'MONTHLY_RENT',
          paymentMethod: 'Bank Wire/SLIPS',
          reference: 'RENT-M1-M2',
          notes: 'First 2 months rental advance',
          receivedBy: 'Kasun Perera',
        }
      ],
      createdBy: staffUser._id,
      createdByName: staffUser.name,
    });

    // 5.4 RENT 2 - Due in 2 Days (Omega Line Textile) -> Triggers 3 Days Remaining Alert!
    const dueIn2Date = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000);
    const rentTx2 = await Transaction.create({
      transactionType: 'RENT',
      invoiceNumber: 'AGR-2026-0202',
      customer: customers[3]._id,
      customerSnapshot: {
        name: customers[3].name,
        cid: customers[3].cid,
        phone: customers[3].phone,
        region: customers[3].region,
        address: customers[3].address,
      },
      machinery: machines[3]._id,
      machinerySnapshot: {
        sku: machines[3].sku,
        brand: machines[3].brand,
        model: machines[3].model,
        landedUnitCost: machines[3].landedUnitCost,
        ownershipType: machines[3].ownershipType,
      },
      quantity: 4,
      serialNumbers: ['PG-900-310', 'PG-900-311', 'PG-900-312', 'PG-900-313'],
      dispatchDate: new Date(now.getTime() - 28 * 24 * 60 * 60 * 1000),
      deliveryStatus: 'Hand Overed',
      deliveryCharges: 12000,
      rentDetails: {
        durationMonths: 4,
        rentPricePerMonth: 26000,
        totalRentValue: 4 * 26000 * 4, // 416,000
        hasKeyMoney: true,
        keyMoneyAmount: 40000,
        keyMoneyPaidAmount: 40000,
        keyMoneyStatus: 'Fully Paid',
        firstTwoMonthsAmount: 26000 * 1 * 4, // 104,000
        firstTwoMonthsPaidAmount: 104000,
        firstTwoMonthsStatus: 'Fully Paid',
        paymentTerms: 'Bank Wire/SLIPS',
        paymentReference: 'SLIP-OMEGA-991',
        nextPaymentDueDate: dueIn2Date,
        currentMonthCycle: 2,
        returnStatus: 'In Use',
        monthsBilled: 4,
        monthsWaived: 0,
        totalRentalPayable: 416000 + 40000 + 12000, // 468,000
        totalRentalPaid: 144000,
        outstandingRentalBalance: 324000,
        anujayaRentalShare: 72000,
        globalRentalShare: 72000,
      },
      payments: [
        {
          date: new Date(now.getTime() - 28 * 24 * 60 * 60 * 1000),
          amount: 144000,
          paymentType: 'MONTHLY_RENT',
          paymentMethod: 'Bank Wire/SLIPS',
          reference: 'SLIP-OMEGA-991',
          notes: 'Key money + Month 1 rent',
          receivedBy: 'Kasun Perera',
        }
      ],
      createdBy: staffUser._id,
      createdByName: staffUser.name,
    });

    // 5.5 RENT 3 - Due Today (Jay Jay Mills) -> Triggers Due Today Alert!
    const dueTodayDate = new Date();
    const rentTx3 = await Transaction.create({
      transactionType: 'RENT',
      invoiceNumber: 'AGR-2026-0203',
      customer: customers[4]._id,
      customerSnapshot: {
        name: customers[4].name,
        cid: customers[4].cid,
        phone: customers[4].phone,
        region: customers[4].region,
        address: customers[4].address,
      },
      machinery: machines[5]._id,
      machinerySnapshot: {
        sku: machines[5].sku,
        brand: machines[5].brand,
        model: machines[5].model,
        landedUnitCost: machines[5].landedUnitCost,
        ownershipType: machines[5].ownershipType,
      },
      quantity: 4,
      serialNumbers: ['JK-A4B-111', 'JK-A4B-112', 'JK-A4B-113', 'JK-A4B-114'],
      dispatchDate: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
      deliveryStatus: 'Hand Overed',
      deliveryCharges: 8000,
      rentDetails: {
        durationMonths: 3,
        rentPricePerMonth: 15000,
        totalRentValue: 3 * 15000 * 4, // 180,000
        hasKeyMoney: false,
        keyMoneyAmount: 0,
        keyMoneyPaidAmount: 0,
        keyMoneyStatus: 'Credit / Pending',
        firstTwoMonthsAmount: 60000,
        firstTwoMonthsPaidAmount: 60000,
        firstTwoMonthsStatus: 'Fully Paid',
        paymentTerms: 'COD',
        paymentReference: 'CASH-REC-JJ-01',
        nextPaymentDueDate: dueTodayDate,
        currentMonthCycle: 2,
        returnStatus: 'In Use',
        monthsBilled: 3,
        monthsWaived: 0,
        totalRentalPayable: 188000,
        totalRentalPaid: 60000,
        outstandingRentalBalance: 128000,
        anujayaRentalShare: 30000,
        globalRentalShare: 30000,
      },
      payments: [
        {
          date: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
          amount: 60000,
          paymentType: 'MONTHLY_RENT',
          paymentMethod: 'COD',
          reference: 'CASH-REC-JJ-01',
          notes: 'Month 1 cash on delivery collected',
          receivedBy: 'Kasun Perera',
        }
      ],
      createdBy: staffUser._id,
      createdByName: staffUser.name,
    });

    // 5.6 RENT 4 - OVERDUE by 9 days (Third Party Asset Siruba - MAS Holdings) -> Triggers Overdue Alert!
    const overdueDate = new Date(now.getTime() - 9 * 24 * 60 * 60 * 1000);
    const rentTx4 = await Transaction.create({
      transactionType: 'RENT',
      invoiceNumber: 'AGR-2026-0204',
      customer: customers[0]._id,
      customerSnapshot: {
        name: customers[0].name,
        cid: customers[0].cid,
        phone: customers[0].phone,
        region: customers[0].region,
        address: customers[0].address,
      },
      machinery: machines[4]._id,
      machinerySnapshot: {
        sku: machines[4].sku,
        brand: machines[4].brand,
        model: machines[4].model,
        landedUnitCost: machines[4].landedUnitCost,
        ownershipType: machines[4].ownershipType,
        thirdPartyCompany: machines[4].thirdPartyCompany,
        thirdPartyRentalCostOwed: machines[4].thirdPartyRentalCostOwed,
      },
      quantity: 3,
      serialNumbers: ['SR-747-801', 'SR-747-802', 'SR-747-803'],
      dispatchDate: new Date(now.getTime() - 40 * 24 * 60 * 60 * 1000),
      deliveryStatus: 'Hand Overed',
      deliveryCharges: 14000,
      rentDetails: {
        durationMonths: 5,
        rentPricePerMonth: 30000,
        totalRentValue: 5 * 30000 * 3, // 450,000
        hasKeyMoney: true,
        keyMoneyAmount: 60000,
        keyMoneyPaidAmount: 60000,
        keyMoneyStatus: 'Fully Paid',
        firstTwoMonthsAmount: 90000,
        firstTwoMonthsPaidAmount: 90000,
        firstTwoMonthsStatus: 'Fully Paid',
        paymentTerms: 'Bank Wire/SLIPS',
        paymentReference: 'WIRE-MAS-SRB',
        nextPaymentDueDate: overdueDate, // Past due date!
        currentMonthCycle: 2,
        returnStatus: 'In Use',
        monthsBilled: 5,
        monthsWaived: 0,
        totalRentalPayable: 450000 + 60000 + 14000,
        totalRentalPaid: 150000,
        outstandingRentalBalance: 374000,
        anujayaRentalShare: 75000,
        globalRentalShare: 75000,
      },
      payments: [
        {
          date: new Date(now.getTime() - 40 * 24 * 60 * 60 * 1000),
          amount: 150000,
          paymentType: 'MONTHLY_RENT',
          paymentMethod: 'Bank Wire/SLIPS',
          reference: 'WIRE-MAS-SRB',
          notes: 'Deposit and initial cycle',
          receivedBy: 'Kasun Perera',
        }
      ],
      createdBy: adminUser._id,
      createdByName: adminUser.name,
    });

    // 5.7 RENT 5 - RETURNED machine demonstrating 5th-day rule engine & return note!
    const returnTx = await Transaction.create({
      transactionType: 'RENT',
      invoiceNumber: 'AGR-2026-0205',
      customer: customers[1]._id,
      customerSnapshot: {
        name: customers[1].name,
        cid: customers[1].cid,
        phone: customers[1].phone,
        region: customers[1].region,
        address: customers[1].address,
      },
      machinery: machines[6]._id,
      machinerySnapshot: {
        sku: machines[6].sku,
        brand: machines[6].brand,
        model: machines[6].model,
        landedUnitCost: machines[6].landedUnitCost,
        ownershipType: machines[6].ownershipType,
      },
      quantity: 2,
      serialNumbers: ['ES-629-901', 'ES-629-902'],
      dispatchDate: new Date(now.getTime() - 65 * 24 * 60 * 60 * 1000),
      deliveryStatus: 'Hand Overed',
      deliveryCharges: 6000,
      rentDetails: {
        durationMonths: 4,
        rentPricePerMonth: 20000,
        totalRentValue: 4 * 20000 * 2, // 160,000
        hasKeyMoney: false,
        keyMoneyAmount: 0,
        keyMoneyPaidAmount: 0,
        keyMoneyStatus: 'Fully Paid',
        firstTwoMonthsAmount: 80000,
        firstTwoMonthsPaidAmount: 80000,
        firstTwoMonthsStatus: 'Fully Paid',
        paymentTerms: 'Bank Wire/SLIPS',
        paymentReference: 'WIRE-RETURN-DEMO',
        returnStatus: 'Returned',
        returnDate: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000),
        monthsBilled: 2, // returned early before 3rd month past 5th day => 2 months waived!
        monthsWaived: 2,
        returnNotes: 'Apparel contract completed. All units returned in pristine operating condition with safety guards intact.',
        returnRecordedBy: 'Kasun Perera',
        totalRentalPayable: 2 * 20000 * 2 + 6000, // 86,000
        totalRentalPaid: 86000,
        outstandingRentalBalance: 0,
        anujayaRentalShare: 43000,
        globalRentalShare: 43000,
      },
      payments: [
        {
          date: new Date(now.getTime() - 65 * 24 * 60 * 60 * 1000),
          amount: 86000,
          paymentType: 'MONTHLY_RENT',
          paymentMethod: 'Bank Wire/SLIPS',
          reference: 'WIRE-RETURN-DEMO',
          notes: 'Full payment for 2 active months plus transport',
          receivedBy: 'Kasun Perera',
        }
      ],
      createdBy: adminUser._id,
      createdByName: adminUser.name,
    });

    console.log('✅ Transactions seeded (Buy, Rent with 7-day, 3-day, Due Today, Overdue, and Returned states)');

    // 6. Seed Expenses & Liabilities
    await Expense.insertMany([
      {
        title: 'Third-Party Asset Rent: Lanka Apparel Outsourcing Ltd (Siruba 747K - SKU M-05)',
        category: 'RENTS_OWED',
        amount: 63000,
        paidAmount: 63000,
        paymentStatus: 'PAID',
        recipientOrEntity: 'Lanka Apparel Outsourcing Ltd',
        machineryRef: machines[4]._id,
        paymentMethod: 'Bank Wire/SLIPS',
        referenceDoc: 'OUTSOURCE-INV-9921',
        paymentDate: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000),
        notes: 'Monthly rental owed for 3 outsourced cylinder bed machines',
      },
      {
        title: 'Technician & Operations Staff Payroll - Current Month',
        category: 'SALARIES',
        amount: 285000,
        paidAmount: 285000,
        paymentStatus: 'PAID',
        recipientOrEntity: 'Consortium Engineering & Logistics Team',
        paymentMethod: 'Bank Wire/SLIPS',
        referenceDoc: 'PAYROLL-2026-09',
        paymentDate: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000),
        notes: 'Monthly wages for 4 field mechanics and 2 logistics operators',
      },
      {
        title: 'Commercial Bank Working Capital Loan Facility #CB-4491',
        category: 'LIABILITIES_LOANS',
        amount: 350000,
        paidAmount: 175000,
        paymentStatus: 'PARTIAL',
        recipientOrEntity: 'Commercial Bank of Ceylon PLC',
        paymentMethod: 'Bank Wire/SLIPS',
        referenceDoc: 'CB-TERM-LN-4491',
        dueDate: new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000),
        notes: 'Consortium warehouse expansion loan monthly installment',
      },
      {
        title: 'Katunayake Air Cargo & Port Logistics Clearing Charges',
        category: 'OPERATING_EXPENSES',
        amount: 88000,
        paidAmount: 88000,
        paymentStatus: 'PAID',
        recipientOrEntity: 'Ceylon Freight & Customs Logistics',
        paymentMethod: 'Corporate Cheque',
        referenceDoc: 'FRT-INV-7731',
        paymentDate: new Date(now.getTime() - 12 * 24 * 60 * 60 * 1000),
        notes: 'Customs clearance surcharges for spare parts and Juki drive motors',
      },
    ]);
    console.log('✅ Expenses, Salaries & Liabilities seeded');

    // 7. Seed Partner Capital Ledger
    await PartnerLedger.insertMany([
      {
        partnerCompany: 'Anujaya Enterprises',
        entryType: 'EQUITY_INJECTION',
        amount: 15000000,
        date: new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000),
        description: 'Initial consortium core machinery capital contribution and inventory float',
        paymentMethod: 'Bank Wire/SLIPS',
        referenceDoc: 'EQUITY-ANUJAYA-001',
        approvedBy: 'Executive Board',
      },
      {
        partnerCompany: 'Global Enterprises',
        entryType: 'EQUITY_INJECTION',
        amount: 15000000,
        date: new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000),
        description: 'Equal partner consortium equity contribution for importing automated sewing lines',
        paymentMethod: 'Bank Wire/SLIPS',
        referenceDoc: 'EQUITY-GLOBAL-001',
        approvedBy: 'Executive Board',
      },
      {
        partnerCompany: 'Anujaya Enterprises',
        entryType: 'CAPITAL_DRAW',
        amount: 750000,
        date: new Date(now.getTime() - 20 * 24 * 60 * 60 * 1000),
        description: 'Partner drawing for operational procurement and fleet expansion',
        paymentMethod: 'Bank Wire/SLIPS',
        referenceDoc: 'DRAW-ANUJAYA-01',
        approvedBy: 'Anujaya Jayasinghe',
      },
      {
        partnerCompany: 'Global Enterprises',
        entryType: 'CAPITAL_DRAW',
        amount: 750000,
        date: new Date(now.getTime() - 20 * 24 * 60 * 60 * 1000),
        description: 'Quarterly partner equity draw on realized consortium profits',
        paymentMethod: 'Bank Wire/SLIPS',
        referenceDoc: 'DRAW-GLOBAL-01',
        approvedBy: 'Global Executive Director',
      },
    ]);
    console.log('✅ Partner Capital Ledger seeded');

    // 8. Seed Company Settings
    await CompanySettings.create({
      companyName: 'Anujaya & Global Enterprises Consortium',
      tagline: 'Industrial Apparel Machinery & Heavy Equipment Solutions',
      address: 'No. 45/A, Katunayake Export Processing Zone & 112 Textile Hub, Colombo, Sri Lanka',
      phone: '+94 11 234 5678 / +94 77 123 4567',
      email: 'kavindujayasinghesecondary@gmail.com',
      taxId: 'VAT-102938475-7000 / SVAT-09281',
      anujayaSharePercent: 50,
      globalSharePercent: 50,
      exchangeRateUsdToLkr: 310,
      invoiceFooterNote: 'Thank you for choosing Anujaya & Global Enterprises Consortium. Machinery genuine parts and 24/7 technical breakdown support guaranteed.',
      rentalAgreementTerms: [
        'Monthly rental is payable in advance on or before the agreed cycle due date.',
        'If machine return exceeds the monthly cycle past the 5th day, that entire month is billable; early returns waive that month’s rent.',
        'Lessee must ensure voltage surge protectors are installed on high-speed servo motors.',
        'Routine lubrication must be performed using consortium approved sewing machine oil only.',
        'Equipment remains the absolute property of Anujaya & Global Consortium.',
      ],
      authorizedSignatoryName: 'Consortium Executive Board / Managing Director',
    });
    console.log('✅ Company Settings seeded');

    console.log('🎉 ALL DATABASE SEEDING COMPLETED SUCCESSFULLY!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding error:', error);
    process.exit(1);
  }
};

seedDB();

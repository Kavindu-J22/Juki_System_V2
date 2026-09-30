const Machinery = require('../models/Machinery');
const Expense = require('../models/Expense');

// Auto-generate SKU Code starting with M- (e.g., M-01, M-02)
const generateSKU = async () => {
  const lastMachine = await Machinery.findOne().sort({ createdAt: -1 });
  if (!lastMachine || !lastMachine.sku) {
    return 'M-01';
  }
  const match = lastMachine.sku.match(/M-(\d+)/);
  if (match) {
    const nextNum = parseInt(match[1], 10) + 1;
    return `M-${String(nextNum).padStart(2, '0')}`;
  }
  return `M-${Date.now().toString().slice(-3)}`;
};

// @desc    Get all machinery inventory with search and filters
// @route   GET /api/machinery
// @access  Private
const getMachinery = async (req, res) => {
  try {
    const { search, brand, ownershipType, status } = req.query;
    let query = {};

    if (search) {
      query.$or = [
        { model: { $regex: search, $options: 'i' } },
        { sku: { $regex: search, $options: 'i' } },
        { brand: { $regex: search, $options: 'i' } },
        { thirdPartyCompany: { $regex: search, $options: 'i' } },
      ];
    }

    if (brand && brand !== 'ALL') {
      query.brand = brand;
    }

    if (ownershipType && ownershipType !== 'ALL') {
      query.ownershipType = ownershipType;
    }

    if (status && status !== 'ALL') {
      query.status = status;
    }

    const machinery = await Machinery.find(query).sort({ createdAt: -1 });
    res.json({ success: true, count: machinery.length, machinery });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get single machine details
// @route   GET /api/machinery/:id
// @access  Private
const getMachineryById = async (req, res) => {
  try {
    const machine = await Machinery.findById(req.params.id);
    if (!machine) {
      return res.status(404).json({ success: false, message: 'Machinery not found' });
    }
    res.json({ success: true, machine });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Create new machinery item
// @route   POST /api/machinery
// @access  Private/Admin
const createMachinery = async (req, res) => {
  try {
    const {
      brand,
      model,
      description,
      initialBatchSets,
      unit,
      unitWeight,
      factoryFobUsd,
      exchangeRate,
      customsDutyLkr,
      wholesaleBenchmark,
      retailBenchmark,
      rentPricePerMonth,
      ownershipType,
      thirdPartyCompany,
      thirdPartyRentalCostOwed,
      availableSerialNumbers,
    } = req.body;

    if (!brand || !model || initialBatchSets === undefined) {
      return res.status(400).json({ success: false, message: 'Brand, Model, and Initial Batch Sets are required' });
    }

    const sku = await generateSKU();
    const rate = Number(exchangeRate) || 310;
    const fob = Number(factoryFobUsd) || 0;
    const duty = Number(customsDutyLkr) || 0;
    const baseLkr = fob * rate;
    const landedCost = baseLkr + duty;

    const machine = await Machinery.create({
      sku,
      brand,
      model,
      description: description || '',
      initialBatchSets: Number(initialBatchSets),
      dispatched: 0,
      unit: unit || 'SETS',
      unitWeight: unitWeight || '',
      factoryFobUsd: fob,
      exchangeRate: rate,
      baseLkr,
      customsDutyLkr: duty,
      landedUnitCost: landedCost,
      wholesaleBenchmark: Number(wholesaleBenchmark) || 0,
      retailBenchmark: Number(retailBenchmark) || 0,
      rentPricePerMonth: Number(rentPricePerMonth) || 0,
      ownershipType: ownershipType || 'OUR_ASSET',
      thirdPartyCompany: thirdPartyCompany || '',
      thirdPartyRentalCostOwed: Number(thirdPartyRentalCostOwed) || 0,
      availableSerialNumbers: Array.isArray(availableSerialNumbers) ? availableSerialNumbers : [],
    });

    // If sourced from a third party company and has rental cost owed, automatically create liability/expense entry
    if (ownershipType === 'THIRD_PARTY_ASSET' && Number(thirdPartyRentalCostOwed) > 0) {
      await Expense.create({
        title: `Third-Party Asset Rent: ${brand} ${model} (${sku})`,
        category: 'RENTS_OWED',
        amount: Number(thirdPartyRentalCostOwed),
        recipientOrEntity: thirdPartyCompany || 'Third-Party Asset Provider',
        machineryRef: machine._id,
        paymentStatus: 'PENDING',
        notes: `Automatically linked to Machinery SKU ${sku}. Monthly rent owed to ${thirdPartyCompany}.`,
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      });
    }

    res.status(201).json({ success: true, machine });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update machinery item
// @route   PUT /api/machinery/:id
// @access  Private/Admin
const updateMachinery = async (req, res) => {
  try {
    const machine = await Machinery.findById(req.params.id);
    if (!machine) {
      return res.status(404).json({ success: false, message: 'Machinery not found' });
    }

    const {
      brand,
      model,
      description,
      initialBatchSets,
      unit,
      unitWeight,
      factoryFobUsd,
      exchangeRate,
      customsDutyLkr,
      wholesaleBenchmark,
      retailBenchmark,
      rentPricePerMonth,
      ownershipType,
      thirdPartyCompany,
      thirdPartyRentalCostOwed,
      availableSerialNumbers,
    } = req.body;

    if (brand) machine.brand = brand;
    if (model) machine.model = model;
    if (description !== undefined) machine.description = description;
    if (initialBatchSets !== undefined) machine.initialBatchSets = Number(initialBatchSets);
    if (unit) machine.unit = unit;
    if (unitWeight !== undefined) machine.unitWeight = unitWeight;
    if (factoryFobUsd !== undefined) machine.factoryFobUsd = Number(factoryFobUsd);
    if (exchangeRate !== undefined) machine.exchangeRate = Number(exchangeRate);
    if (customsDutyLkr !== undefined) machine.customsDutyLkr = Number(customsDutyLkr);
    if (wholesaleBenchmark !== undefined) machine.wholesaleBenchmark = Number(wholesaleBenchmark);
    if (retailBenchmark !== undefined) machine.retailBenchmark = Number(retailBenchmark);
    if (rentPricePerMonth !== undefined) machine.rentPricePerMonth = Number(rentPricePerMonth);
    if (ownershipType) machine.ownershipType = ownershipType;
    if (thirdPartyCompany !== undefined) machine.thirdPartyCompany = thirdPartyCompany;
    if (thirdPartyRentalCostOwed !== undefined) machine.thirdPartyRentalCostOwed = Number(thirdPartyRentalCostOwed);
    if (availableSerialNumbers !== undefined) machine.availableSerialNumbers = availableSerialNumbers;

    machine.baseLkr = machine.factoryFobUsd * machine.exchangeRate;
    machine.landedUnitCost = machine.baseLkr + machine.customsDutyLkr;

    await machine.save();

    // Check if third party expense needs sync
    if (machine.ownershipType === 'THIRD_PARTY_ASSET' && machine.thirdPartyRentalCostOwed > 0) {
      const existingExpense = await Expense.findOne({
        machineryRef: machine._id,
        category: 'RENTS_OWED',
        paymentStatus: 'PENDING',
      });
      if (existingExpense) {
        existingExpense.amount = machine.thirdPartyRentalCostOwed;
        existingExpense.recipientOrEntity = machine.thirdPartyCompany;
        await existingExpense.save();
      } else {
        await Expense.create({
          title: `Third-Party Asset Rent: ${machine.brand} ${machine.model} (${machine.sku})`,
          category: 'RENTS_OWED',
          amount: machine.thirdPartyRentalCostOwed,
          recipientOrEntity: machine.thirdPartyCompany,
          machineryRef: machine._id,
          paymentStatus: 'PENDING',
          notes: `Updated third-party rental liability for ${machine.sku}`,
          dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        });
      }
    }

    res.json({ success: true, machine });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Delete machinery item
// @route   DELETE /api/machinery/:id
// @access  Private/Admin
const deleteMachinery = async (req, res) => {
  try {
    const machine = await Machinery.findById(req.params.id);
    if (!machine) {
      return res.status(404).json({ success: false, message: 'Machinery not found' });
    }

    if (machine.dispatched > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete machine with ${machine.dispatched} currently active dispatched units. Return or reconcile them first.`,
      });
    }

    await Machinery.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Machinery removed from inventory' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getMachinery,
  getMachineryById,
  createMachinery,
  updateMachinery,
  deleteMachinery,
};

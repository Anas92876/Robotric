/**
 * Settings Controller
 * Handles application settings (e.g. USD to Syrian Pound exchange rate)
 */

const AppSettings = require('../models/Settings');
const asyncHandler = require('../utils/asyncHandler');
const { BadRequestError } = require('../utils/errors');

const DEFAULT_EXCHANGE_RATE = 120;

/**
 * @desc    Get USD to Syrian Pound exchange rate
 * @route   GET /api/reception/settings/exchange-rate
 * @access  Private/Reception
 */
const getExchangeRate = asyncHandler(async (req, res) => {
  const settings = await AppSettings.findOne().lean();

  const usdToSypExchangeRate = settings?.usdToSypExchangeRate ?? DEFAULT_EXCHANGE_RATE;

  res.status(200).json({
    success: true,
    data: { usdToSypExchangeRate }
  });
});

/**
 * @desc    Update USD to Syrian Pound exchange rate
 * @route   PUT /api/reception/settings/exchange-rate
 * @access  Private/Reception
 */
const updateExchangeRate = asyncHandler(async (req, res) => {
  const { usdToSypExchangeRate } = req.body;

  if (usdToSypExchangeRate === undefined || usdToSypExchangeRate === null) {
    throw new BadRequestError('usdToSypExchangeRate is required');
  }

  const rate = parseFloat(usdToSypExchangeRate);
  if (isNaN(rate) || rate < 1 || rate > 10000) {
    throw new BadRequestError('Exchange rate must be between 1 and 10000 S.P. per USD');
  }

  const settings = await AppSettings.findOneAndUpdate(
    {},
    { usdToSypExchangeRate: rate, updatedAt: new Date() },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  ).lean();

  res.status(200).json({
    success: true,
    data: { usdToSypExchangeRate: settings.usdToSypExchangeRate }
  });
});

const DOWNLOAD_URL = 'http://robotrick.net/download-app';

/**
 * @desc    Get app version info (public — no auth)
 * @route   GET /api/app-version
 * @access  Public
 */
const getAppVersion = asyncHandler(async (req, res) => {
  const settings = await AppSettings.findOne().lean();

  res.status(200).json({
    success: true,
    data: {
      minimumAppVersion: settings?.minimumAppVersion ?? '1.0.0',
      forceUpdate: settings?.forceUpdate ?? false,
      updateMessage: settings?.updateMessage ?? '',
      downloadUrl: DOWNLOAD_URL,
    }
  });
});

/**
 * @desc    Update app version settings
 * @route   PUT /api/admin/settings/version
 * @access  Private/Admin
 */
const updateAppVersionSettings = asyncHandler(async (req, res) => {
  const { minimumAppVersion, forceUpdate, updateMessage } = req.body;

  const update = { updatedAt: new Date() };

  if (minimumAppVersion !== undefined) {
    if (!/^\d+\.\d+\.\d+$/.test(minimumAppVersion)) {
      throw new BadRequestError('minimumAppVersion must be a valid semver string (e.g. "1.3.0")');
    }
    update.minimumAppVersion = minimumAppVersion;
  }

  if (forceUpdate !== undefined) {
    update.forceUpdate = Boolean(forceUpdate);
  }

  if (updateMessage !== undefined) {
    update.updateMessage = String(updateMessage);
  }

  const settings = await AppSettings.findOneAndUpdate(
    {},
    update,
    { new: true, upsert: true, setDefaultsOnInsert: true }
  ).lean();

  res.status(200).json({
    success: true,
    data: {
      minimumAppVersion: settings.minimumAppVersion,
      forceUpdate: settings.forceUpdate,
      updateMessage: settings.updateMessage,
      downloadUrl: DOWNLOAD_URL,
    }
  });
});

module.exports = {
  getExchangeRate,
  updateExchangeRate,
  getAppVersion,
  updateAppVersionSettings,
};

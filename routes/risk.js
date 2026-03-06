const express = require("express");
const router = express.Router();
const riskEngine = require("../utils/riskEngine");
const deviceFingerprinting = require("../utils/deviceFingerprinting");
const db = require("../common/db");
const { isAuthenticated } = require("../middleware/auth");

router.get("/history", isAuthenticated, async (req, res, next) => {
  try {
    const userId = req.user.id;
    const limit = parseInt(req.query.limit) || 10;

    const history = await riskEngine.getRiskHistory(userId, limit);

    res.status(200).json({
      success: true,
      history,
    });
  } catch (err) {
    next(err);
  }
});

router.get("/devices", isAuthenticated, async (req, res, next) => {
  try {
    const userId = req.user.id;
    const devices = await riskEngine.getUserDevices(userId);

    res.status(200).json({
      success: true,
      devices,
    });
  } catch (err) {
    next(err);
  }
});

router.post("/devices/trust", isAuthenticated, async (req, res, next) => {
  try {
    const userId = req.user.id;
    const fingerprint = deviceFingerprinting.generateFingerprint(req);
    const ipAddress = req.ip || req.connection?.remoteAddress;

    const device = await deviceFingerprinting.trustDevice(userId, fingerprint, ipAddress, req);

    res.status(200).json({
      success: true,
      message: "Device trusted",
      device,
    });
  } catch (err) {
    next(err);
  }
});

router.delete("/devices/:id", isAuthenticated, async (req, res, next) => {
  try {
    const userId = req.user.id;
    const deviceId = req.params.id;

    const device = await db.findOne("DeviceFingerprint", { id: deviceId, userId });

    if (!device) {
      return res.status(404).json({
        success: false,
        message: "Device not found",
      });
    }

    await db.delete("DeviceFingerprint", { id: deviceId, userId });

    res.status(200).json({
      success: true,
      message: "Device removed",
    });
  } catch (err) {
    next(err);
  }
});

router.get("/current", isAuthenticated, async (req, res, next) => {
  try {
    const userId = req.user.id;
    const assessment = await riskEngine.assessRisk(userId, req);

    res.status(200).json({
      success: true,
      assessment,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;

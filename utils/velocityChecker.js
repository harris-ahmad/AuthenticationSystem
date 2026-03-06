const checkLoginVelocity = async (userId, ipAddress) => {
  const db = require("../common/db");
  const { getDatabaseType } = require("./database");
  const dbType = getDatabaseType();

  const now = new Date();
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
  const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);

  let recentAttempts, veryRecentAttempts, failedAttempts, multipleIPsUsed;

  if (dbType === "mongodb") {
    recentAttempts = await db.count("LoginHistory", {
      userId,
      timestamp: { $gte: oneHourAgo },
    });

    veryRecentAttempts = await db.count("LoginHistory", {
      userId,
      timestamp: { $gte: fiveMinutesAgo },
    });

    failedAttempts = await db.count("LoginHistory", {
      userId,
      success: false,
      timestamp: { $gte: oneHourAgo },
    });

    const LoginHistory = db.getModel("LoginHistory");
    const uniqueIPs = await LoginHistory.distinct("ipAddress", {
      userId,
      timestamp: { $gte: oneHourAgo },
    });
    multipleIPsUsed = uniqueIPs.length;
  } else {
    const { Op } = require("sequelize");

    recentAttempts = await db.count("LoginHistory", {
      userId,
      timestamp: { [Op.gte]: oneHourAgo },
    });

    veryRecentAttempts = await db.count("LoginHistory", {
      userId,
      timestamp: { [Op.gte]: fiveMinutesAgo },
    });

    failedAttempts = await db.count("LoginHistory", {
      userId,
      success: false,
      timestamp: { [Op.gte]: oneHourAgo },
    });

    const LoginHistory = db.getModel("LoginHistory");
    multipleIPsUsed = await LoginHistory.count({
      where: {
        userId,
        timestamp: { [Op.gte]: oneHourAgo },
      },
      distinct: true,
      col: "ipAddress",
    });
  }

  return {
    attemptsLastHour: recentAttempts,
    attemptsLast5Min: veryRecentAttempts,
    failedAttemptsLastHour: failedAttempts,
    uniqueIPsLastHour: multipleIPsUsed,
    suspicious: veryRecentAttempts > 3 || multipleIPsUsed > 3 || failedAttempts > 5,
  };
};

const checkIPVelocity = async (ipAddress) => {
  const db = require("../common/db");
  const { getDatabaseType } = require("./database");
  const dbType = getDatabaseType();

  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

  let attemptsByIP, uniqueUsersFromIP;

  if (dbType === "mongodb") {
    attemptsByIP = await db.count("LoginHistory", {
      ipAddress,
      timestamp: { $gte: fiveMinutesAgo },
    });

    const LoginHistory = db.getModel("LoginHistory");
    const uniqueUsers = await LoginHistory.distinct("userId", {
      ipAddress,
      timestamp: { $gte: fiveMinutesAgo },
    });
    uniqueUsersFromIP = uniqueUsers.length;
  } else {
    const { Op } = require("sequelize");

    attemptsByIP = await db.count("LoginHistory", {
      ipAddress,
      timestamp: { [Op.gte]: fiveMinutesAgo },
    });

    const LoginHistory = db.getModel("LoginHistory");
    uniqueUsersFromIP = await LoginHistory.count({
      where: {
        ipAddress,
        timestamp: { [Op.gte]: fiveMinutesAgo },
      },
      distinct: true,
      col: "userId",
    });
  }

  return {
    attemptsLast5Min: attemptsByIP,
    uniqueUsersLast5Min: uniqueUsersFromIP,
    suspicious: attemptsByIP > 10 || uniqueUsersFromIP > 5,
  };
};

module.exports = {
  checkLoginVelocity,
  checkIPVelocity,
};
